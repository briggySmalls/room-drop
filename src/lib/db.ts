import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return _supabase;
}
