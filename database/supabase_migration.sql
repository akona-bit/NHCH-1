-- SQL Migration (Dành cho PostgreSQL / Supabase)

-- 1. Thêm ENUM types nếu chưa có
DO $$ BEGIN
    CREATE TYPE loai_phan_hoi_enum AS ENUM ('comment', 'approve', 'reject', 'request_edit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trang_thai_ky_thi_enum AS ENUM ('draft', 'active', 'finalized', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quality_flag_enum AS ENUM ('ok', 'warn', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Thêm bảng phan_hoi_cau_hoi
CREATE TABLE IF NOT EXISTS phan_hoi_cau_hoi (
    ma_phan_hoi SERIAL PRIMARY KEY,
    ma_cau_hoi INT NOT NULL,
    nguoi_phan_hoi UUID NOT NULL,
    loai_phan_hoi loai_phan_hoi_enum NOT NULL,
    noi_dung TEXT NOT NULL,
    thoi_gian TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phch_cauhoi FOREIGN KEY (ma_cau_hoi) REFERENCES cau_hoi(ma_cau_hoi) ON DELETE CASCADE
);

-- 3. Thêm cột exposure_count, exposure_limit vào cau_hoi
ALTER TABLE cau_hoi
ADD COLUMN IF NOT EXISTS exposure_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS exposure_limit INT DEFAULT 5;

-- 4. Thêm trang_thai vào ky_thi
ALTER TABLE ky_thi
ADD COLUMN IF NOT EXISTS trang_thai trang_thai_ky_thi_enum DEFAULT 'draft';

-- 5. Thêm random_seed, is_finalized vào de_thi
ALTER TABLE de_thi
ADD COLUMN IF NOT EXISTS random_seed INT,
ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT FALSE;

-- 6. Thêm bảng item_analysis
CREATE TABLE IF NOT EXISTS item_analysis (
    ma_cau_hoi INT NOT NULL,
    ma_ky_thi INT NOT NULL,
    so_thi_sinh INT,
    ctt_diff FLOAT,
    ctt_disc FLOAT,
    pt_bis FLOAT,
    irt_a FLOAT,
    irt_b FLOAT,
    quality_flag quality_flag_enum DEFAULT 'ok',
    PRIMARY KEY (ma_cau_hoi, ma_ky_thi),
    CONSTRAINT fk_ia_cauhoi FOREIGN KEY (ma_cau_hoi) REFERENCES cau_hoi(ma_cau_hoi) ON DELETE CASCADE,
    CONSTRAINT fk_ia_kythi FOREIGN KEY (ma_ky_thi) REFERENCES ky_thi(ma_ky_thi) ON DELETE CASCADE
);
