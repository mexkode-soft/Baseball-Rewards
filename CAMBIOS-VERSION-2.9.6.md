# Home Run Rewards v2.9.6

## Correcciones

- QR en vivo: se eliminó el bloqueo causado por detener `html5-qrcode` desde el mismo callback de decodificación. El lector pausa, valida y después detiene la cámara fuera del callback.
- QR en vivo: zona de lectura explícita y FPS ajustado para mejorar detección en Chrome/PWA.
- Edición de ubicaciones: cada ubicación existente se actualiza por su UUID con `UPDATE`; una nueva usa `INSERT`. Cambiar coordenadas, dirección, nombre o inventario ya no crea otra ubicación.
- Mapa de edición: el selector Leaflet se reinicia al cambiar entre ubicaciones para evitar mantener un marcador/estado anterior.
- Se elimina el índice de unicidad por nombre/coordenadas que podía bloquear el movimiento de una ubicación durante edición.
- Recompensas: las cards muestran por separado `Obtenido` y `Vigente hasta`.
- Recompensas históricas sin `expires_at`: la migración 386 calcula su vencimiento con `claimed_at + reward_validity_days` de la campaña.
- Premios vencidos no se devuelven en `Mis recompensas`.

## Base de datos

Para una base existente, ejecutar únicamente:

`supabase/migrations/386_qr_edicion_ubicaciones_y_vigencia_recompensas.sql`

Para una instalación nueva desde cero usar:

`000_instalacion_completa_home_run_rewards_v2.9.6.sql`
