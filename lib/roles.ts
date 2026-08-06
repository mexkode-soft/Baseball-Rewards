import type { SupabaseClient } from "@supabase/supabase-js";

export type RolAplicacion = "admin" | "usuario" | "sponsor";

/**
 * Obtiene el rol desde una función SECURITY DEFINER de PostgreSQL.
 * Así la lectura del rol no depende de las políticas RLS de profiles.
 */
export async function obtenerRolActual(
  supabase: SupabaseClient,
): Promise<RolAplicacion> {
  const { data, error } = await supabase.rpc("obtener_rol_actual");

  if (error) {
    throw new Error(`No fue posible consultar el rol: ${error.message}`);
  }

  if (data === "admin" || data === "sponsor" || data === "usuario") {
    return data;
  }

  throw new Error("El usuario autenticado no tiene un perfil o rol válido.");
}

export function obtenerRutaInicialPorRol(rol: RolAplicacion): string {
  if (rol === "admin") return "/admin";
  if (rol === "sponsor") return "/patrocinador";
  return "/usuario";
}
