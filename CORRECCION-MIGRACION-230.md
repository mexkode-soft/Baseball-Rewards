# Corrección de la migración 230

La versión anterior intentaba habilitar RLS sobre todas las tablas de `public`.
PostGIS crea `public.spatial_ref_sys`, cuyo propietario no es el rol `postgres`
del proyecto. Por esa razón Supabase devolvía:

`must be owner of table spatial_ref_sys`

La migración corregida aplica privilegios y RLS únicamente a las tablas de la
aplicación que requieren el ajuste:

- `questions`
- `levels`
- `sponsor_organizations`
- `campaign_sponsors`

La migración es idempotente y puede ejecutarse completa aunque el intento
anterior haya fallado.
