import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from './config'

export function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
}

