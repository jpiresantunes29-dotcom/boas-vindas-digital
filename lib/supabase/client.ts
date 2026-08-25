import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente administrativo do Supabase — usa a service role key e só pode
 * ser importado a partir de código de servidor (Server Actions, Route
 * Handlers). O import de "server-only" faz a build falhar caso este
 * arquivo seja importado por engano em um Client Component.
 */
export function criarClienteSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
