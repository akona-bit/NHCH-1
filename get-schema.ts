import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { data, error } = await supabase.from('cau_hoi').insert({ noi_dung: 'abc', muc_do: 1, loai_cau_hoi: 'multiple_choice' }).select();
  if (data) {
    console.log(Object.keys(data[0]));
  } else {
    console.log('error', error);
  }
}
run();
