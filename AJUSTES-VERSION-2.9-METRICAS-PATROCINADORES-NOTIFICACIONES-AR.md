# Home Run Rewards v2.9

## Cambios incluidos

- Métricas demo aisladas de las métricas reales. Al desactivar ubicación simulada desaparecen del dashboard.
- ROAS y ROI muestran valores coherentes durante la simulación; fuera de demo usan exclusivamente presupuesto y ventas reales.
- Nuevos patrocinadores quedan `Pendiente de registro` hasta abrir la invitación y definir contraseña.
- Tabla de patrocinadores incluye responsable, correo, estado, plan, estatus y acciones.
- Notificaciones de campanita se abren en un modal verde translúcido y al cerrarlo el usuario permanece en la pantalla original.
- Promoción única centrada en la vista de usuario.
- Pelota AR: spinner mientras carga el GLB, rueda del mouse en escritorio y gesto de pellizca en celular.
- Dinámica de mapa: seguimiento continuo de distancia, progreso calculado desde la primera lectura y botón listo al entrar al radio.
- El flujo de mapa vuelve a solicitar/activar cámara antes de trivia/AR.

## Base de datos existente

Ejecutar solamente:

`supabase/instalacion_modular/380_metricas_demo_patrocinadores_pendientes.sql`

## Base nueva

Usar:

`supabase/instalacion/000_instalacion_completa_home_run_rewards.sql`

## Nota de infraestructura

La Edge Function `send-push-batch` no se instala mediante SQL. Debe estar desplegada en el proyecto de Supabase y conservar los secretos VAPID.
