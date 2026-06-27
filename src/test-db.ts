import { supabase } from './supabaseClient';

async function test() {
  const { data, error } = await supabase.from('ky_thi').insert({
      ten_ky_thi: 'Test',
      ngay_tao: new Date().toISOString(),
      nguoi_tao: '00000000-0000-0000-0000-000000000000'
  });
  console.log("Error:", error);
}

test();
