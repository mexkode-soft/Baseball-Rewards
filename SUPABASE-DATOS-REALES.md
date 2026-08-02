# Home Run Rewards — conexión completa con Supabase

Esta versión elimina el uso de `localStorage` en los módulos operativos y guarda la información por usuario en Supabase.

## 1. Aplicar la migración nueva

Si ya ejecutaste `202608020001_home_run_rewards_schema.sql`, ejecuta ahora:

```text
supabase/migrations/202608020002_real_data_connections.sql
```

Con Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref urtkywzznqgayjcadbwm
npx supabase db push
```

También puedes copiar el contenido de la migración en Supabase → SQL Editor y ejecutarlo una sola vez.

La migración agrega:

- Configuración demo persistente.
- RPC segura para escaneo QR.
- Registro de participaciones, puntos y recompensas.
- Ranking conectado a perfiles reales.
- Persistencia de campañas QR, mapa y marca.
- Persistencia de preguntas, niveles, promociones, anuncios y difusión.
- Persistencia de tickets e imágenes.
- Sincronización de nombre y fotografía de Google.
- Políticas RLS adicionales.
- Bucket público `promotion-images`.

## 2. Variables locales

Copia `.env.example` como `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=https://urtkywzznqgayjcadbwm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
NEXT_PUBLIC_SITE_URL=http://localhost:3000

OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4.1-mini
```

No uses la clave `service_role` ni una clave `sb_secret_` en variables públicas.

## 3. Buckets

Deben existir:

- `avatars`: público, JPG/PNG/WEBP, 5 MB.
- `ticket-images`: privado, JPG/PNG/WEBP, 8 MB.
- `promotion-images`: público, JPG/PNG/WEBP, 8 MB. La migración intenta crearlo automáticamente.

## 4. Google

Al entrar con Google, el callback sincroniza `full_name` y usa primero `avatar_url` y después `picture`. Las imágenes externas se muestran con `referrerPolicy="no-referrer"` y `object-fit: cover`.

Para refrescar un perfil creado antes de este ajuste, cierra sesión y vuelve a entrar con Google.

## 5. Datos reales incluidos

- Usuarios: `auth.users`.
- Perfiles y roles: `profiles`.
- Preguntas: `questions`.
- Campañas: `campaigns`.
- Preguntas por campaña: `campaign_questions`.
- Ubicaciones y premios: `campaign_locations`.
- Códigos QR: `qr_codes`.
- Reglas de marca: `brand_rules`.
- Participaciones: `participations`.
- Puntos: `point_transactions` y `profiles.total_points`.
- Recompensas: `reward_claims`.
- Tickets: `ticket_submissions` y `ticket_images`.
- Promociones: `promotions`.
- Anuncios: `announcements`.
- Difusión: `broadcasts` y `notifications`.

## 6. Validación

Ejecuta:

```bash
npm install
npx tsc --noEmit
npm run build
npm run dev
```

La generación de este ZIP pasó `npx tsc --noEmit`. El build completo no pudo finalizar en el entorno de generación porque no estaba disponible el binario SWC de Linux de Next.js; ejecútalo en tu computadora antes de desplegar.

## 7. Importante

Los datos existentes de la versión de demostración guardados previamente en `localStorage` no se migran automáticamente. Después de aplicar la migración, crea o vuelve a guardar preguntas, campañas y promociones desde el panel para que queden centralizadas en Supabase.
