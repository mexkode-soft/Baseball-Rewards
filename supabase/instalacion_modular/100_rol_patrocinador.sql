-- Home Run Rewards | instalación modular
-- Archivo: 100_rol_patrocinador.sql
-- Fuente histórica: 20260803113000_add_sponsor_role.sql
-- Ejecutar únicamente después del archivo anterior.

-- Agrega el tercer rol. Debe ejecutarse antes de la migración del portal.
alter type public.app_role add value if not exists 'sponsor';
