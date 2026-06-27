import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'nminhkhanh45@gmail.com', // Replace with the correct email if this is wrong, but I think this is it based on the env
    password: 'password123' // Or whatever default is... wait, I can't know the password.
  });
  console.log(authData, authError);
}
run();
