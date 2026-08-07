# Push web después del ajuste 370

1. En ambos proyectos de Vercel (Develop y Producción):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<misma clave pública>`
   - hacer Redeploy.
2. En Supabase Edge Functions > Secrets:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT=mailto:mexkodesoft@gmail.com`
3. Desplegar la función incluida en el proyecto:
   ```bash
   supabase functions deploy send-push-batch
   ```
4. Ejecutar la migración 370 si la base ya existe.
5. En un usuario, abrir campanita > Activar push. Si había una suscripción con otra llave VAPID, el código ahora la renueva automáticamente.
