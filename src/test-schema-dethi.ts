import { supabase } from './supabaseClient';
async function test() {
  const { data, error } = await supabase.from('de_thi').select('*').limit(1);
  if (data) {
    console.log("de_thi columns:", data);
  }
}
test();
