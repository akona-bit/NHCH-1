from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
from pydantic import BaseModel
from typing import List, Dict, Any

from irt import mmle, chi_square, theta_estimate, true_score
try:
    import item_plot as ip
except ImportError:
    # Mock for local testing if item_plot is missing
    class MockIP:
        @staticmethod
        def ketQuaCham(df_raw, df_answer): return df_raw
        @staticmethod
        def tinh_diem(df): 
            df['Raw'] = df[[c for c in df.columns if c.startswith('Cau')]].sum(axis=1)
            df['Null'] = 0
            return df
    ip = MockIP()

import ctt

class PipelineData(BaseModel):
    ma_ky_thi: int
    df_raw: List[Dict[str, Any]]
    df_answer: List[Dict[str, Any]]

app = FastAPI()

def quality_flag(p_val, disc, irt_a, irt_b, chi2_pval):
    if disc < 0 or (chi2_pval is not None and chi2_pval < 0.05):
        return 'critical'
    if p_val < 0.2 or p_val > 0.9 or irt_a < 0.5 or abs(irt_b) > 3:
        return 'warn'
    return 'ok'

@app.post("/api/run-pipeline")
async def run_pipeline(data: PipelineData):
    try:
        df_raw = pd.DataFrame(data.df_raw)
        df_answer = pd.DataFrame(data.df_answer)
        
        # Bước 1: Chấm điểm
        df_chamdiem = ip.ketQuaCham(df_raw, df_answer)
        df_chamdiem = ip.tinh_diem(df_chamdiem)

        # Bước 2: CTT
        p_values = ctt.cal_diff(df_chamdiem)
        disc_ctt = ctt.cal_disc(df_chamdiem)
        std_total = df_chamdiem['Raw'].std()
        cau_cols = [c for c in df_chamdiem.columns if c.startswith('Cau')]
        
        pbcc_dict = {}
        for col in cau_cols:
            true_g = df_chamdiem[df_chamdiem[col] == 1]['Raw']
            false_g = df_chamdiem[df_chamdiem[col] == 0]['Raw']
            # cal_pbcc may require true_g, false_g, std_total, p_values[col]
            try:
                pbcc_dict[col] = ctt.cal_pbcc(true_g, false_g, std_total, p_values[col])
            except:
                pbcc_dict[col] = 0.0

        # Bước 3: IRT Calibration
        U = df_chamdiem[cau_cols].to_numpy()
        a_arr, b_arr = mmle(U, name=f"KyThi_{data.ma_ky_thi}", max_iter=60, K=81)
        item_params = pd.DataFrame({'a': a_arr, 'b': b_arr}, index=cau_cols)

        # Bước 4: Theta
        item_params_list = list(zip(item_params['a'], item_params['b']))
        thetas = theta_estimate(U.tolist(), item_params_list)

        # Bước 6: Chi-square
        df_with_theta = df_chamdiem.copy()
        df_with_theta['Theta'] = thetas
        chi2_df = chi_square(df_with_theta, item_params)

        # Bước 7: True Score
        true_scores = []
        for i in range(len(df_chamdiem)):
            row = df_chamdiem.iloc[i]
            ts = true_score(
                theta=thetas[i],
                raw=int(row['Raw']),
                data=row[cau_cols],
                item_params=item_params
            )
            true_scores.append(ts)

        # Format output
        results_bai_lam = []
        for i in range(len(df_chamdiem)):
            results_bai_lam.append({
                "SBD": str(df_chamdiem.iloc[i].get('SBD', i)),
                "DiemTho": int(df_chamdiem.iloc[i]['Raw']),
                "NangLuc": float(thetas[i]),
                "DiemThuc": float(true_scores[i] / 10.0)
            })

        results_items = []
        for j, col in enumerate(cau_cols):
            pval = float(p_values.get(col, 0))
            disc = float(disc_ctt.get(col, 0))
            irta = float(item_params['a'].iloc[j])
            irtb = float(item_params['b'].iloc[j])
            chi2_pval = float(chi2_df.loc[col, 'p_value']) if 'p_value' in chi2_df.columns and col in chi2_df.index else None
            
            results_items.append({
                "MaCauHoi": col,
                "CTTDiff": pval,
                "CTTDisc": disc,
                "PtBis": float(pbcc_dict.get(col, 0)),
                "IRTa": irta,
                "IRTb": irtb,
                "QualityFlag": quality_flag(pval, disc, irta, irtb, chi2_pval)
            })

        return {
            "status": "success", 
            "bai_lam": results_bai_lam,
            "items": results_items
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IRTData(BaseModel):
    items: List[str]
    responses: List[List[float]] # N students x J items

@app.post("/api/calibrate-irt-json")
async def calibrate_irt_json(data: IRTData):
    try:
        U = np.array(data.responses)
        a_est, b_est = mmle(U, name="MMLE", verbose=False)
        
        results = []
        for i, col in enumerate(data.items):
            # Cần tính fitness parameter (p-value của chi-square) 
            # Nhưng chi-square cần theta (ước lượng năng lực). Để đơn giản trả về tham số trước
            results.append({
                "id": col,
                "a": float(a_est[i]),
                "b": float(b_est[i]),
                "fit": 1.0 # default fit for now if not computed
            })
            
        return {"status": "success", "data": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/calibrate-irt")
async def calibrate_irt(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        item_cols = [c for c in df.columns if c.startswith('Cau')]
        if not item_cols:
            return {"status": "error", "message": "No item columns found (must start with 'Cau')"}
            
        U = df[item_cols].fillna(-1).values
        a_est, b_est = mmle(U, name="MMLE", verbose=False)
        
        results = []
        for i, col in enumerate(item_cols):
            results.append({
                "id": col,
                "a": float(a_est[i]),
                "b": float(b_est[i]),
                "fit": 1.0 # placeholder
            })
        
        return {"status": "success", "data": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Run with: uvicorn main:app --reload
