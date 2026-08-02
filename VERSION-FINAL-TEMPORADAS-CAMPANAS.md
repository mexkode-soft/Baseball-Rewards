# Home Run Rewards — temporadas y gestión de campañas

## Paso obligatorio en Supabase

Ejecuta en **SQL Editor** la migración:

`supabase/migrations/202608020003_seasons_campaign_management.sql`

Esta migración agrega:

- temporadas activas, cerradas y en borrador;
- ranking independiente e histórico por temporada;
- asignación automática de cada movimiento de puntos a la temporada activa;
- bucket público `campaign-images` para portadas;
- políticas RLS del nuevo módulo.

## Cambios funcionales

- Selector de campañas QR, mapa y marca con el mismo formato centrado.
- Ranking por temporada con fecha inicial, fecha final y consulta histórica.
- Módulo `/admin/temporadas`.
- Módulo `/admin/campanas` para consultar, editar, pausar, activar y eliminar.
- Edición de campañas desde `/admin/crear-campana?type=...&id=...`.
- Portada QR corregida y subida a Supabase Storage.
- Botón para eliminar la portada y cargar otra.
- La campaña QR no puede guardarse sin generar sus códigos.
- PDF de QR con dos códigos por página y separación suficiente para evitar textos encimados.
- Formularios nuevos con placeholders y sin fechas o textos precargados.

## Validación

Se ejecutó correctamente:

`npx tsc --noEmit`

El `next build` no pudo finalizar dentro del entorno de generación porque no estaba disponible el binario SWC de Linux. No se detectaron errores de TypeScript.

## Instalación local

Conserva tu `.env.local` actual. Luego ejecuta:

```bash
rm -rf .next node_modules
npm install
npm run build
npm run dev
```
