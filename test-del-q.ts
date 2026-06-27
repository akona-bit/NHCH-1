import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { data: inserted, error: insertErr } = await supabase.from('cau_hoi').insert({
    noi_dung: 'Test Question',
    muc_do: 1,
    loai_cau_hoi: 'multiple_choice',
    tinh_trang: 'draft'
  }).select();

  if (insertErr) {
    console.log("Insert Error:", insertErr);
    return;
  }
  const qId = inserted[0].ma_cau_hoi;

  // insert a kien_thuc_cau_hoi
  const { data: kt } = await supabase.from('kien_thuc').select('ma_kien_thuc').limit(1);
  if (kt && kt.length > 0) {
    const ktId = kt[0].ma_kien_thuc;
    await supabase.from('kien_thuc_cau_hoi').insert({
       ma_cau_hoi: qId,
       ma_kien_thuc: ktId
    });
  }

  // insert a dap_an
  await supabase.from('dap_an').insert({
    ma_cau_hoi: qId,
    noi_dung_dap_an: 'A. Test',
    la_dap_an_dung: true,
    thu_tu: 1
  });

  console.log("Inserted related records.");

  const { error: delErr } = await supabase.from('cau_hoi').delete().eq('ma_cau_hoi', qId);
  console.log("Delete Error:", delErr);

  // clean up if failed
  if (delErr) {
     await supabase.from('dap_an').delete().eq('ma_cau_hoi', qId);
     await supabase.from('kien_thuc_cau_hoi').delete().eq('ma_cau_hoi', qId);
     await supabase.from('cau_hoi').delete().eq('ma_cau_hoi', qId);
  }
}
run();
