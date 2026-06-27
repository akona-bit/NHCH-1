import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  await Promise.all([
    supabase.from('kien_thuc').select('*').order('created_at').limit(1).then(r => console.log('kien_thuc:', r.error?.message)),
    supabase.from('ky_thi').select('*').order('created_at').limit(1).then(r => console.log('ky_thi:', r.error?.message)),
    supabase.from('system_alerts').select('*').order('created_at').limit(1).then(r => console.log('system_alerts:', r.error?.message)),
    supabase.from('profiles').select('*').order('created_at').limit(1).then(r => console.log('profiles:', r.error?.message)),
  ]);
}
run();
