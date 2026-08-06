# Configuración de notificaciones push

La campanita funciona con registros de `public.notifications`. Las notificaciones push del sistema operativo requieren además desplegar la Edge Function y configurar VAPID.

## 1. Generar llaves VAPID

Desde una terminal con Node.js:

```bash
npx web-push generate-vapid-keys
```

Guarda la llave pública y privada. Nunca expongas la privada.

## 2. Variables de Vercel

Agrega la llave pública:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=TU_LLAVE_PUBLICA
```

Haz un redeploy.

## 3. Secretos de Supabase

```bash
supabase secrets set VAPID_PUBLIC_KEY="TU_LLAVE_PUBLICA"
supabase secrets set VAPID_PRIVATE_KEY="TU_LLAVE_PRIVADA"
supabase secrets set VAPID_SUBJECT="mailto:tu-correo@dominio.com"
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` normalmente están disponibles dentro de la Edge Function. Si tu proyecto no los expone, agrégalos como secretos.

## 4. Desplegar la función

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy send-push-batch
```

## 5. Activar push en cada dispositivo

El usuario debe abrir la campanita y pulsar **Activar push**. La suscripción se guarda en `public.push_subscriptions`.

## 6. Verificación SQL

```sql
select id, user_id, device_label, is_active, last_success_at, last_error
from public.push_subscriptions
order by updated_at desc;

select id, broadcast_id, status, delivered_count, failed_count, last_error
from public.push_jobs
order by created_at desc;
```

Aunque push no esté configurado, el comunicado debe aparecer inmediatamente en la campanita del usuario.
