import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const tables = ['thi_sinh', 'du_lieu_bai_lam', 'bai_lam'];
  for (const t of tables) {
     const { data, error } = await supabase.from(t).select('ma_ky_thi').limit(1);
     if (error) {
       console.log(`Error on ${t}: ${error.message} (${error.code})`);
     } else {
       console.log(`Success on ${t}, has ma_ky_thi: true`);
     }
  }
}
run();
