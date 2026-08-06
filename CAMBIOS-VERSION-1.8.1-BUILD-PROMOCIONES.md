# Home Run Rewards 1.8.1

Corrección de compilación en Next.js para el módulo de promociones.

- `PromotionCard` se movió a `components/PromotionCard.tsx`, manteniendo la estructura plana existente del proyecto.
- `app/admin/promociones/page.tsx` conserva únicamente el export default permitido para una página de Next.js.
- `app/usuario/promociones/page.tsx` muestra solo las promociones activas y reutiliza la tarjeta compartida.
- No requiere una migración nueva de Supabase. Las migraciones hasta la `260` permanecen vigentes.
