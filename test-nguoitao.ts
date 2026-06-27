import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { data, error } = await supabase.from('cau_hoi').select('nguoi_tao').limit(1);
  if (error) {
    console.log("Error checking cau_hoi:", error);
  } else {
    console.log("Success checking cau_hoi nguoi_tao");
  }
}
run();
