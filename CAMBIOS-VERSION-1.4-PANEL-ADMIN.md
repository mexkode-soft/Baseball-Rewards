# Home Run Rewards v1.4 — Panel administrativo consistente

## Correcciones

- El layout `/admin` indica explícitamente al shell que debe renderizar el menú administrativo.
- El layout `/usuario` indica explícitamente al shell que debe renderizar el menú de usuario.
- `AdminShell` ya no vuelve a inferir el panel desde un perfil cargado de forma asíncrona.
- `getCurrentRole()` consulta la RPC segura `obtener_rol_actual()` y deja de asumir `usuario` ante resultados inesperados.
- La migración 220 ahora fuerza la recarga de la caché de esquema de PostgREST.
- Se añadió la migración incremental `20260805123000_reload_role_rpc_schema.sql`.

## Despliegue

1. Confirma que la migración 220 esté aplicada.
2. En una base ya instalada, ejecuta únicamente `supabase/migrations/20260805123000_reload_role_rpc_schema.sql` si la RPC no aparece en PostgREST.
3. Sube el proyecto a GitHub con un autor autorizado en Vercel.
4. Confirma que el deployment termine en `Ready`.
5. Cierra sesión e inicia nuevamente.
