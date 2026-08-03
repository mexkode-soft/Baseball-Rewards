-- Agrega el tercer rol. Debe ejecutarse antes de la migración del portal.
alter type public.app_role add value if not exists 'sponsor';
