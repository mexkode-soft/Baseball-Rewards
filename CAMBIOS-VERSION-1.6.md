# Home Run Rewards v1.6

## Correcciones

- Permisos SQL y RLS para guardar campañas QR, mapa y marca.
- Permisos para crear, editar y eliminar temporadas.
- Panel administrativo de promociones siempre renderizado como administración dentro de `/admin/promociones`.
- Permisos para administrar anuncios de la cinta.
- Función `publish_broadcast` unificada en una sola firma con idempotencia.
- Permisos y políticas para consultar el historial de comunicados y crear trabajos push.
- Migración modular `240_permisos_modulos_admin_y_comunicados.sql`.
- Verificador e instructivo modular actualizados.

## Aplicación sobre una base existente

Ejecutar únicamente `supabase/instalacion_modular/240_permisos_modulos_admin_y_comunicados.sql` y después `999_verificar_instalacion.sql`.
