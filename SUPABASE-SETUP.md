# Configuración de Supabase

1. Crea un proyecto en Supabase.
2. Copia `.env.example` como `.env.local` y agrega URL y anon key.
3. Instala Supabase CLI y vincula el proyecto:
   - `npx supabase login`
   - `npx supabase link --project-ref TU_PROJECT_REF`
   - `npx supabase db push`
4. En Authentication > Providers habilita **Google** y configura Client ID/Secret.
5. En Google Cloud agrega como redirect URI:
   - `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`
6. En Supabase Authentication > URL Configuration agrega:
   - `http://localhost:3000/auth/callback`
   - `https://TU-DOMINIO.vercel.app/auth/callback`
7. Los usuarios nuevos nacen con rol `usuario`. Para promover un administrador ejecuta en SQL Editor:
   - `update public.profiles set role='admin' where email='correo@gmail.com';`

La migración crea tablas, índices, RLS, triggers y buckets `avatars` y `ticket-images`.
