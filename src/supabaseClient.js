import { createClient } from "@supabase/supabase-js";

// Replace these variables with your actual Supabase project URL and public anon key
const SUPABASE_URL = "https://bmlyhxptcbcivtkssxug.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_fRV8m8ITCqadXQHSLcUs4g_N8ufoksm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
