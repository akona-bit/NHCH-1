import { supabase } from './src/supabaseClient.js';

async function testDel() {
  const { data, error } = await supabase.from('kien_thuc').select('*').limit(1);
  console.log("Kien thuc sample:", data);

  if (data && data.length > 0) {
     const id = data[0].ma_kien_thuc;
     const res = await supabase.from('kien_thuc').delete().eq('ma_kien_thuc', id);
     console.log("Delete result:", res);
  }
}
testDel();
