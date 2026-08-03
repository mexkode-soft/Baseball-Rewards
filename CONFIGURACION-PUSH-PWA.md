# Configuración final: PWA y notificaciones push

## 1. Migración
Ejecuta `supabase/migrations/20260803083000_push_notifications_queue.sql`.

## 2. Llaves VAPID
Genera una sola vez:

```bash
npx web-push generate-vapid-keys
```

Agrega en Vercel:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

Agrega como secretos de Supabase Edge Functions:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:tu-correo@dominio.com"
```

La llave pública de Vercel y `VAPID_PUBLIC_KEY` deben ser exactamente la misma. Nunca expongas `VAPID_PRIVATE_KEY`.

## 3. Desplegar la función push

```bash
npx supabase functions deploy send-push-batch --no-verify-jwt
```

El comunicado siempre queda guardado en la campanita. Si el push no puede enviarse de inmediato, permanece en `push_jobs` con estado `pending`.

## 4. Escalamiento / cola
La tabla `push_jobs` procesa lotes de 250. Para volumen alto, programa una llamada periódica a `send-push-batch` mediante Supabase Cron o un worker externo hasta que no queden trabajos pendientes. La UI y las tablas ya quedan separadas del proveedor de cola, por lo que después se puede conectar QStash, Cloud Tasks, SQS u otro sistema sin cambiar la bandeja de notificaciones.

## 5. Android después del cambio de iconos
Desinstala la PWA anterior y borra los datos del sitio antes de volver a instalarla. Android conserva el icono del manifest anterior en caché.

## 6. OAuth
En Supabase Auth > URL Configuration incluye la URL de producción y el callback:

```text
https://TU-DOMINIO/auth/callback
```

También conserva la URL de localhost para desarrollo.
