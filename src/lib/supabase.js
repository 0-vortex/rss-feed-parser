import { createClient } from '@supabase/supabase-js'

const anon_key = process.env.SUPABASE_ANON_KEY
const supabaseUrl = process.env.SUPABASE_URL

const supabase = createClient(supabaseUrl, anon_key)

const supaCount = async (table, field = '*') => supabase
    .from(table)
    .select(field, {
      head: false,
      count: 'exact'
    })
    .range(0, 1)

export {
  supabase,
  supaCount,
}
