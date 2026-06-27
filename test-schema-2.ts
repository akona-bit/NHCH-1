import { supabase } from './src/supabaseClient';
async function run() {
  const { data: d1, error: e1 } = await supabase.from('de_thi').select('*').limit(1);
  console.log('de_thi:', d1 && d1.length ? Object.keys(d1[0]) : e1 || 'empty');
  const { data: d2, error: e2 } = await supabase.from('dap_an_de_thi').select('*').limit(1);
  console.log('dap_an_de_thi:', d2 && d2.length ? Object.keys(d2[0]) : e2 || 'empty');
  const { data: d3, error: e3 } = await supabase.from('cau_hoi_de_thi').select('*').limit(1);
  console.log('cau_hoi_de_thi:', d3 && d3.length ? Object.keys(d3[0]) : e3 || 'empty');
}
run();
