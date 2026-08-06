# Home Run Rewards v2.1

- Mensaje visible de éxito o error al guardar el perfil.
- La API de patrocinadores acepta `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_SECRET_KEY`.
- Los planes de las marcas quedan bloqueados hasta presionar **Editar**.
- Se redujo el espacio inferior del contenedor de promociones del usuario.
- Migración 290 corrige el `ON CONFLICT` de notificaciones y la cola push.

## Variable de Vercel para invitaciones
Configura una de estas variables solo en servidor:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`

Después realiza un redeploy.
