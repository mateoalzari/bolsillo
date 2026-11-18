import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/**
 * Cliente de Supabase. Usa la publishable key (pública por diseño): los datos quedan protegidos
 * por Row Level Security en la base. Si faltan las variables, la app funciona solo en modo demo.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // "implicit" permite abrir el mail de confirmación o de recuperación en otro dispositivo
          flowType: 'implicit',
        },
      })
    : null

export const cloudEnabled = supabase !== null
