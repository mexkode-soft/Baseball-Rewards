# Home Run Rewards v1.7

## Correcciones incluidas

- La ruta `/usuario/promociones` vuelve a ser exclusivamente de consulta y ya no muestra el formulario administrativo.
- La ruta `/admin/promociones` conserva el creador y administrador de promociones.
- Las imágenes de promociones se convierten a WebP y se comprimen antes de subirlas.
- Las galerías de productos usan miniaturas y carrusel horizontal para evitar páginas excesivamente largas.
- La cinta infinita se consulta y actualiza mediante RPCs seguras sobre `app_settings(key, value)`.
- El botón principal de la dinámica de mapa deja de abrir Google Maps y activa el seguimiento que conduce a trivia y pelota cuando el usuario entra al radio.

## Migración nueva

Ejecutar en una base existente:

`supabase/instalacion_modular/250_cinta_promociones_y_dinamica_mapa.sql`

Para una base vacía, ejecutar todas las migraciones modulares en orden y finalizar con `999_verificar_instalacion.sql`.
