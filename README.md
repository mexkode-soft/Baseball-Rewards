# Home Run Rewards — prototipo inicial

Proyecto visual en Next.js para comenzar el diseño de Home Run Rewards.

## Incluye

- Página de inicio responsive.
- Navbar con ¿Quiénes somos?, Campañas, Patrocinadores y Login.
- Secciones iniciales para contenido institucional, campañas y patrocinadores.
- Página de login con correo y contraseña.
- Botón visual para registro con Google.
- Interacciones simuladas, sin base de datos ni autenticación real.
- Logotipo proporcionado dentro de `public/`.

## Requisitos

- Node.js 20.9 o superior.
- npm.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Nota sobre autenticación

El login y Google son demostrativos. No guardan información ni crean sesiones. Cuando se conecte una solución real, se recomienda usar una librería de autenticación compatible con Next.js o un proveedor como Supabase/Auth.js.
