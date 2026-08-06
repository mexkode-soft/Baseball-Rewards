-- Home Run Rewards | instalación modular
-- Archivo: 050_tokens_qr_demo.sql
-- Fuente histórica: 202608020005_qr_tokens_demo_brand_flow.sql
-- Ejecutar únicamente después del archivo anterior.

-- Conserva el token público necesario para volver a descargar exactamente
-- los mismos códigos QR al editar una campaña.
alter table public.qr_codes
  add column if not exists token_value text;

create index if not exists qr_codes_campaign_token_value_idx
  on public.qr_codes (campaign_id, token_value);

comment on column public.qr_codes.token_value is
  'Token público embebido en el QR. No sustituye token_hash; permite regenerar el mismo material al editar.';
