import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'nminhkhanh45@gmail.com',
    password: 'Password123!' // trying a common password, but maybe I don't need to auth if I just list buckets? RLS might block list
  });
  console.log(authData, authError);
}
run();
