import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

async function run() {
  const { data, error } = await supabase.storage.from('app-files').createSignedUrl('f6589c11-1cbe-48b9-bbc3-afbb265d4d44/spatial_map/new/98eb241e-6eb0-4196-987d-ddf56484bf6a.gif', 60 * 60 * 24);
  console.log('url:', data, error);
}
run();
