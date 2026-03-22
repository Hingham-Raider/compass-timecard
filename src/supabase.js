import { createClient } from '@supabase/supabase-js'

// Paste your Supabase Project URL and anon key here after creating your project at supabase.com
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR-PROJECT-ID.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'YOUR-ANON-KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
