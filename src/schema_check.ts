import { supabase } from './supabaseClient';

async function checkSchema() {
  const tables = ['de_thi', 'dap_an', 'dap_an_de_thi', 'cau_hoi_de_thi', 'cau_hoi', 'chi_tiet_de_thi'];
  for (const table of tables) {
    const { data: d, error: e } = await supabase.from(table).select('*').limit(1);
    if (e) {
      console.log(`Table ${table} error:`, e.message);
    } else {
      console.log(`Table ${table} columns:`, d && d.length > 0 ? Object.keys(d[0]) : 'Empty, no column info via data');
    }
  }
}

checkSchema();
