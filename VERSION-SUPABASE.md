# Home Run Rewards — versión Supabase

Cambios incluidos:
- Fotografías de perfil ajustadas al círculo con `object-fit: cover` y centrado real.
- Pantalla inicial con logo flotante para administrador y usuario.
- Registro con correo y contraseña.
- Inicio de sesión con Google mediante Supabase Auth.
- Perfil conectado a tabla `profiles` y bucket `avatars`.
- Migración completa con campañas QR, mapa, marcas, tickets, puntos, ranking, recompensas, promociones, anuncios y notificaciones.
- Políticas RLS, índices geográficos PostGIS y triggers de perfiles/puntos.

Validación realizada:
- `npx tsc --noEmit`: correcto.
- `npm run build`: no finalizó en el entorno de generación por ausencia del binario SWC de Linux; no fue un error de TypeScript.

Lee `SUPABASE-SETUP.md` antes de conectar el proyecto.
