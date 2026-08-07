# Home Run Rewards — Ajustes 2.8

Esta versión incorpora:

- Canal de difusión con formulario vacío, limpieza posterior al envío, botón **Enviar anuncio** y confirmación verde.
- Bandeja de notificaciones limitada al usuario autenticado y actualización mediante Realtime.
- Renovación automática de la suscripción Push si la clave pública VAPID cambió.
- Edge Function `send-push-batch` compatible con `VAPID_PUBLIC_KEY` y fallback de nombre público.
- Patrocinadores en formulario horizontal + tabla editable, estado operativo y activo/inactivo.
- Estado obligatorio del patrocinador; sus campañas quedan limitadas visualmente a ese estado.
- Segmentación geográfica de campañas por estado y municipio opcional.
- Usuarios ven únicamente dinámicas aplicables a su estado/municipio en QR, mapa y visita a marca.
- Seguimiento de geolocalización continuo en la dinámica de mapa.
- Cámara con fallback para equipos que no tengan cámara trasera.
- Carrusel de promociones centrado conservando desplazamiento horizontal.
- Simulación de 30 días de métricas disponible cuando está activa la ubicación demo.
- Logo del panel navega al inicio correspondiente al rol.

## Nueva migración

`supabase/instalacion_modular/370_ajustes_operativos_geografia_push_metricas.sql`

La instalación única fue actualizada en:

`supabase/instalacion/000_instalacion_completa_home_run_rewards.sql`

## Push

Además de la migración, la Edge Function debe desplegarse:

```bash
supabase functions deploy send-push-batch
```

Secretos requeridos en Supabase Edge Functions:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Vercel (Develop y Producción):

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

Después de cambiar una variable `NEXT_PUBLIC_*`, realizar un nuevo deployment.
