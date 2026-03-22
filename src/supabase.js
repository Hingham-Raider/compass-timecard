import { createClient } from '@supabase/supabase-js'

// Paste your Supabase Project URL and anon key here after creating your project at supabase.com
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://suzplutqdvcyrgprekhf.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_Yf2gKGByoBnrTqgHq1uLjA_EmUYOBwv'

export const supabase = createClient(supabaseUrl, supabaseKey)
