# Portal de patrocinadores

## 1. Aplicar migración

```bash
npx supabase db push
```

Migración nueva: `20260803113000_sponsor_portal_attribution.sql`.

## 2. Crear usuario patrocinador demo

La creación de usuarios de Auth no debe hacerse con una migración SQL. Ejecute localmente:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://TU_REF.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE" \
npm run create-demo-sponsor
```

En PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://TU_REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE"
npm run create-demo-sponsor
```

Credenciales generadas:

- Correo: `sponsor.demo@homerunrewards.mx`
- Contraseña: `HomeRunSponsor2026!`

Cambie la contraseña antes de una demostración pública. La service role nunca debe guardarse en GitHub ni Vercel como variable pública.

## 3. Métricas

El dashboard usa `campaign_metrics_daily`, una tabla agregada por campaña y día. Los tickets aprobados suman ventas atribuidas y un trigger actualiza el día afectado. Esto evita sumar toda la tabla de tickets en cada visita.

Las gráficas se renderizan con SVG responsive, sin incorporar una librería pesada: línea/área para ventas diarias y barras para el embudo.
