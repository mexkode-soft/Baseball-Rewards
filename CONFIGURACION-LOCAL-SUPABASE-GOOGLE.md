# Configuración local de Supabase y Google

## 1. Crear `.env.local`

Copia `.env.example` y renómbralo `.env.local`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://urtkywzznqgayjcadbwm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PEGA_AQUI_LA_CLAVE_PUBLICA_COMPLETA
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

También puedes usar:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

El proyecto acepta ambos nombres de clave.

## 2. Reiniciar Next.js

```powershell
Ctrl + C
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

## 3. Google OAuth

En Google Cloud:

- Origen JavaScript: `http://localhost:3000`
- Callback: `https://urtkywzznqgayjcadbwm.supabase.co/auth/v1/callback`

En Supabase > Authentication > URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`
- Redirect URL: `http://localhost:3000/**`

## 4. Seguridad

No uses ni publiques `service_role`, `secret key` o `sb_secret_...` en el navegador.
