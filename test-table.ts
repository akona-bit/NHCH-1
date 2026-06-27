import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles:', error ? error.message : data);

  const { data: users, error: errUsers } = await supabase.from('users').select('*').limit(1);
  console.log('users:', errUsers ? errUsers.message : users);
}
run();
