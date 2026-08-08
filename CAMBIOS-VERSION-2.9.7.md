# Home Run Rewards v2.9.7

## Correcciones principales

- QR ganador y no ganador suman los puntos configurados cuando el usuario no está en Demo.
- Los QR existentes se actualizan sin eliminar/regenerar tokens; premio y puntos se sincronizan con la campaña.
- El premio ganador usa el nombre actual configurado en la campaña (por ejemplo, `Gorra Autografiada`).
- Modo Demo limitado a máximo 10 usuarios elegidos desde Admin > Demo, con buscador por nombre/correo.
- Los usuarios no seleccionados siguen con reglas normales aunque Demo esté encendido.
- Premios obtenidos durante Demo se marcan como temporales: aparecen mientras Demo esté activo para esa cuenta y desaparecen al desactivarlo.
- Demo no consume inventario ni puntos reales.
- Buscador del mapa ahora usa un endpoint interno con sesgo por cercanía y estado/municipio de la campaña.
- El mapa reinvalida su tamaño al volver a editar y conserva correctamente el marcador de la ubicación guardada.
- Las ubicaciones siguen actualizándose por UUID, sin crear duplicados al mover el premio.

## Base de datos

Para una base existente, ejecutar únicamente:

`supabase/migrations/387_demo_usuarios_qr_premios_y_mapa.sql`

La misma migración está duplicada en `supabase/instalacion_modular/387_demo_usuarios_qr_premios_y_mapa.sql` para mantener el esquema modular.

Para una instalación desde cero usar:

`000_instalacion_completa_home_run_rewards_v2.9.7.sql`
