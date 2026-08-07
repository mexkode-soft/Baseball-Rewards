# Home Run Rewards v2.9.2

## Recompensas
- La recompensa de mapa/visita se persiste automáticamente al completar la interacción con la pelota.
- El botón de recompensas ya no navega antes de que Supabase termine de guardar el premio.
- Se actualizan eventos de puntos y recompensas después de guardar.
- En modo demo el flujo visual y el premio pueden mostrarse, pero no se suman puntos reales.

## QR
- Escáner QR reforzado para móvil/PWA: selección de cámara trasera, QR-only, BarcodeDetector cuando el navegador lo soporte y área de lectura responsiva.
- Los QR físicos dejan de ser de un solo uso global; cada usuario sigue sin poder repetir el mismo QR.
- Cada escaneo aceptado actualiza puntos/capturas inmediatamente.
- Si el QR es ganador, el premio queda guardado en `reward_claims` en la misma transacción.
- Fuera de demo suma puntos; en demo registra la experiencia con 0 puntos reales.

## Métricas demo
- Cada click en “Simular métricas (30 días)” reemplaza la corrida anterior por 30 días de valores aleatorios nuevos.
- Los datos conservan coherencia: válidos <= cargados, participantes <= válidos y premios <= participantes.
- Las métricas demo siguen aisladas de `campaign_metrics_daily`.

## Base de datos
- Nueva migración: `382_recompensas_qr_metricas_random.sql`.
- Instalador completo actualizado: `000_instalacion_completa_home_run_rewards_v2.9.2.sql`.
