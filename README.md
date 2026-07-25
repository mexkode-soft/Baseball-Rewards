# Home Run Rewards

Proyecto inicial en Next.js basado visualmente en Ari Comunicación y adaptado a campañas interactivas de béisbol.

## Incluye

- Portada con video automático, silenciado por defecto y control de sonido.
- Cambio automático del video al logo al finalizar.
- Navegación manual entre video y logo.
- Sección ¿Quiénes somos?, campañas y footer social.
- Login con pelota de béisbol giratoria.
- Acceso con Supabase cuando se agregan variables de entorno.
- Modo demo sin Supabase: un correo que contenga `admin` abre el perfil administrador; cualquier otro correo abre el perfil usuario.
- Menús diferenciados por rol.
- Foto de perfil visible en el menú lateral.
- Configuración visual de mapas y premios.
- Simulación de búsqueda y captura de recompensas.
- Diseño responsivo.

## Configuración

1. Copia `.env.example` a `.env.local`.
2. Agrega las credenciales de Supabase y enlaces sociales.
3. Ejecuta:

```bash
npm install
npm run dev
```

## Roles con Supabase

Guarda el rol en `user_metadata.role` con uno de estos valores:

- `admin`
- `usuario`

La integración final puede moverse a una tabla `profiles` para mayor control y seguridad.

## Archivos incluidos

- `public/media/portada.mp4`
- `public/images/logo-home-run.png`
- `public/images/logo-home-run-alt.png`
- `public/models/baseball.glb`

El modelo GLB queda disponible para una etapa posterior de integración 3D completa. La primera versión usa una pelota CSS animada para mantener el login ligero y compatible.
