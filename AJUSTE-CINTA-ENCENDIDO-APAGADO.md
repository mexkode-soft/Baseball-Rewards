# Ajuste de cinta infinita

Se corrigió la integración del interruptor de la cinta con `public.app_settings`.

La tabla real usa:

- `key`
- `value`
- `updated_by`
- `updated_at`

Cambios incluidos:

1. Lectura de `ticker_enabled` mediante `key/value`.
2. Guardado mediante `upsert(..., { onConflict: "key" })`.
3. Actualización inmediata en la pestaña actual.
4. Suscripción Realtime a cambios de `app_settings` para actualizar otras pestañas y dispositivos abiertos.
5. Migración principal corregida.
6. Migración adicional idempotente para habilitar la configuración y Realtime.

Migración nueva:

`supabase/migrations/20260803162000_fix_ticker_setting_integration.sql`
