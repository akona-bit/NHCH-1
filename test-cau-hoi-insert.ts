import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { error } = await supabase.from('cau_hoi').insert([{
    noi_dung: 'Test',
    nguoi_tao_ten: 'Test Name'
  }]);
  console.log('error:', error);
}
run();
