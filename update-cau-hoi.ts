import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: "ALTER TABLE cau_hoi ADD COLUMN IF NOT EXISTS nguoi_tao_ten TEXT;"
  });
  console.log(data, error);
}
run();
