# Home Run Rewards v1.3 — corrección de roles

Esta versión incorpora:

- Migración modular `220_corregir_roles_y_rls_perfiles.sql`.
- Migración cronológica `20260805120000_fix_profile_roles_rls.sql`.
- Función segura `public.obtener_rol_actual()`.
- Políticas RLS limpias para `public.profiles`.
- Protección para impedir que un usuario cambie su propio rol.
- Callback OAuth corregido para consultar el rol mediante RPC.
- `AdminGuard` corregido para no asumir silenciosamente el rol `usuario` cuando ocurre un error.
- Utilidad centralizada `lib/roles.ts`.

Después de desplegar esta versión, aplica la migración 220 si la base ya estaba instalada, haz redeploy en Vercel y vuelve a iniciar sesión.
