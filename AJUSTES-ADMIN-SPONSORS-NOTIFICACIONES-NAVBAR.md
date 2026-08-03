# Ajustes incluidos

- El botón **Activar push** desaparece cuando el dispositivo ya tiene una suscripción activa.
- Instrucciones de instalación específicas para Safari y Chrome en iPhone. iOS no permite abrir el instalador nativo desde JavaScript.
- Canal de difusión para todos los patrocinadores o hasta 10 usuarios específicos.
- Interruptor global para prender/apagar la cinta infinita sin borrar anuncios.
- Navbar administrativo agrupado en Campañas, Patrocinadores, Configuración y Anuncios.
- Alta de patrocinadores desde Admin con plan Básico, Intermedio o Premium e invitación por correo.
- Recuperación y actualización de contraseña para todos los roles.

## Configuración requerida

En Vercel agrega como variable secreta de servidor:

`SUPABASE_SERVICE_ROLE_KEY`

No uses el prefijo `NEXT_PUBLIC_` y no compartas esta llave.

Ejecuta la migración:

`supabase/migrations/20260803150000_admin_sponsors_preferences_targeted_broadcasts.sql`

En Supabase Auth > URL Configuration agrega:

- `https://TU-DOMINIO/actualizar-contrasena`
- `https://TU-DOMINIO/auth/callback`

El administrador crea al patrocinador en Admin > Patrocinadores. Supabase envía un correo de invitación para que el sponsor establezca su contraseña; el administrador nunca ve la contraseña definitiva.
