# Cambios versión 1.0

- Inicio convertido en single page con campañas y pelota interactiva.
- Indicador animado para explicar giro y zoom de la pelota.
- Login responsive corregido en web/PWA y bloqueo visible durante Google OAuth.
- Cinta móvil estabilizada y vínculo con configuración de encendido/apagado.
- Notificaciones con actualización optimista, persistencia de lectura y refresco al abrir.
- Canal de difusión con botón bloqueado, estado de procesamiento e idempotencia.
- Historial del día actual con filtro por fecha.
- Selector de destinatarios más compacto y visual.
- Baseball Fantasy agregado como módulo “Próximamente”.
- Texto comercial actualizado como plataforma de fidelización.
- Promociones con apariencia verde translúcida.
- Migración incremental de endurecimiento, índices, inventario y reclamación transaccional.
- Instalación consolidada de Supabase para reconstruir una base limpia.
- Helper opcional de rate limiting compatible con Redis REST.
- Video principal comprimido y poster ligero; recurso de video no utilizado eliminado.
- Páginas legales base y vínculos en footer.
- Variables de integración documentadas en `.env.example`.

## Validación pendiente

La instalación de dependencias no pudo ejecutarse en este entorno porque el registro disponible no contiene `jspdf@^3.0.1`. Antes de desplegar, ejecutar localmente `npm ci` y `npm run build` con acceso al registro público de npm.
