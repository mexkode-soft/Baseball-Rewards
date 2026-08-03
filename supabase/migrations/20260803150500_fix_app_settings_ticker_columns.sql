-- Punto de compatibilidad para app_settings
-- La tabla existente usa las columnas: key, value, updated_by, updated_at.
-- Esta migración registra la preferencia global para encender o apagar la cinta infinita.

insert into public.app_settings (
  key,
  value,
  updated_at
)
values (
  'ticker_enabled',
  'true'::jsonb,
  now()
)
on conflict (key)
do update set
  value = excluded.value,
  updated_at = now();

-- Verificación opcional:
-- select key, value, updated_at
-- from public.app_settings
-- where key = 'ticker_enabled';
