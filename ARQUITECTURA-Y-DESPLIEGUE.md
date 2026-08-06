# Arquitectura y despliegue

La aplicación conserva la identidad visual actual y separa estilos por módulo mediante CSS Modules. El dominio de negocio se nombra en español; los nombres reservados por Next.js y APIs externas conservan su forma oficial.

## Instalación limpia de Supabase
1. Crea un proyecto vacío.
2. Ejecuta `supabase/instalacion/000_instalacion_completa.sql`.
3. Configura Auth, Google OAuth, SMTP y URLs de redirección.
4. Carga los recursos de Storage.
5. Crea el primer administrador mediante un usuario de Auth y actualiza su perfil.

## Garantías críticas
- PostgreSQL es la fuente de verdad.
- `claim_reward_safely` usa bloqueo de fila, actualización condicional, restricciones e idempotencia.
- Los comunicados usan clave de idempotencia, botón bloqueado y cola de push.
- Redis es opcional al inicio; se activa con variables Upstash para límites y caché temporal.
- Antes de un lanzamiento masivo deben ejecutarse pruebas de carga progresivas.


## Ajuste de comunicados y push

Ejecutar después de la 260:

```text
270_comunicados_bandeja_y_push.sql
999_verificar_instalacion.sql
```

- `280_promociones_portadas_y_aprobacion.sql`: edición de promociones, portadas de campañas y permisos de aprobación.
