import { supabase } from './supabaseClient';

async function test() {
  const { data, error } = await supabase.from('ky_thi').select('*').limit(1);
  console.log("Data:", data);
  if (data && data.length > 0) {
      console.log("Columns:", Object.keys(data[0]));
  } else {
      const { error: err2 } = await supabase.from('ky_thi').select('non_existent_column').limit(1);
      console.log("Schema error hint:", err2);
  }
}

test();
