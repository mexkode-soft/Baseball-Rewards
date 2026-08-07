# Home Run Rewards v2.9.4

- Vigencia de recompensa configurable por campaña (15 días por defecto).
- Los premios guardan fecha de obtención y fecha de expiración.
- `Mis recompensas` oculta automáticamente premios vencidos.
- QR ganador: muestra premio, puntos y vigencia configurada.
- QR sin premio: muestra “Mejor suerte a la siguiente, ¡sigue buscando!” y conserva los puntos configurados para participación.
- Escáner QR ampliado a todo el cuadro de cámara para mejorar la detección.
- Se añadió lectura de QR desde una imagen como alternativa en dispositivos donde la cámara del navegador tenga problemas de enfoque/detección.
- La migración `384_vigencia_premios_y_qr.sql` está incluida dentro de `supabase/migrations/`.
