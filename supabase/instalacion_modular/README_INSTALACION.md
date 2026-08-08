# Instalación modular de Supabase — Home Run Rewards

Esta carpeta reemplaza el uso manual del SQL consolidado de 2,700 líneas. Los archivos conservan el orden cronológico probado de las migraciones originales y separan las extensiones para evitar que el SQL Editor intente crearlas dentro de una ejecución problemática.

## Antes de comenzar

- Utiliza un proyecto nuevo y vacío de Supabase.
- Selecciona **Primary Database** y el rol **postgres**.
- No ejecutes al mismo tiempo `000_instalacion_completa.sql` y esta instalación modular.
- No ejecutes las migraciones históricas adicionales después: ya están representadas aquí.
- Conserva el proyecto anterior como respaldo hasta validar la aplicación.

## Instalación desde el SQL Editor

1. Abre una consulta nueva.
2. Copia únicamente el contenido de `000_extensiones.sql`, ejecútalo y confirma `Success`.
3. Abre otra consulta nueva por cada archivo siguiente.
4. Ejecuta cada archivo completo en el orden indicado abajo. Evita dejar una sola sentencia seleccionada. Usa `Ctrl + A` antes de presionar **Run**.
5. Al terminar, ejecuta `250_cinta_promociones_y_dinamica_mapa.sql
260_corregir_cinta_y_flujos_usuario.sql
300_segmentacion_geografica_comunicados.sql
999_verificar_instalacion.sql`. Todos los objetos críticos deben mostrar `OK`.

## Orden exacto

1. `000_extensiones.sql`
2. `010_esquema_principal.sql`
3. `020_conexiones_y_funciones_base.sql`
4. `030_temporadas_y_gestion_campanas.sql`
5. `040_sincronizacion_perfiles_auth.sql`
6. `050_tokens_qr_demo.sql`
7. `060_lectura_segura_qr.sql`
8. `070_recompensas_indices_y_pwa.sql`
9. `080_totales_recompensas_y_puntos.sql`
10. `090_notificaciones_push_y_cola.sql`
11. `100_rol_patrocinador.sql`
12. `110_portal_patrocinador_y_atribucion.sql`
13. `120_aprobacion_campanas_patrocinador.sql`
14. `130_notificaciones_admin_patrocinador.sql`
15. `140_preferencias_y_envios_segmentados.sql`
16. `150_normalizar_configuracion_cinta.sql`
17. `160_modalidades_y_limites_planes.sql`
18. `170_integracion_configuracion_cinta.sql`
19. `180_contexto_planes_y_ramas_boletos.sql`
20. `190_interruptor_cinta_extremo_a_extremo.sql`
21. `200_revision_manual_boletos.sql`
22. `210_endurecimiento_produccion.sql`
23. `220_corregir_roles_y_rls_perfiles.sql`
24. `230_permisos_operativos_y_administrativos.sql`
25. `240_permisos_modulos_admin_y_comunicados.sql`
26. `250_cinta_promociones_y_dinamica_mapa.sql
260_corregir_cinta_y_flujos_usuario.sql
300_segmentacion_geografica_comunicados.sql
999_verificar_instalacion.sql`

## Instalación recomendada con Supabase CLI

Para evitar errores de selección en el SQL Editor, la opción más repetible es usar la CLI. Desde la raíz del proyecto:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
```

Luego ejecuta cada archivo con una conexión directa de PostgreSQL o copia estos archivos a una rama controlada de migraciones antes de usar `supabase db push`. No guardes la contraseña de la base ni claves secretas en Git.

## Qué hacer si un archivo falla

- Detente en ese archivo; no continúes con los posteriores.
- Guarda el mensaje completo, nombre del archivo y número de línea.
- No vuelvas a ejecutar todos los archivos desde el principio sobre una base parcialmente creada.
- En un proyecto vacío, lo más seguro es recrearlo o limpiar el esquema antes de repetir la instalación.

## Configuración manual posterior

Las migraciones no configuran credenciales externas. Después debes configurar en el panel:

- Authentication: Site URL y Redirect URLs.
- Google OAuth y su callback del nuevo proyecto.
- SMTP y plantillas de correo.
- Variables de Vercel.
- Redis, Sentry y Google Analytics.
- Primer usuario administrador.
- Las migraciones `220`, `230` y `240` corrigen roles, permisos administrativos y comunicados sin permitir autoasignación de privilegios.
- Carga de imágenes, videos y modelos en Storage.

## Corrección de roles y paneles

Después de `210_endurecimiento_produccion.sql`, ejecuta obligatoriamente:

```text
220_corregir_roles_y_rls_perfiles.sql
230_permisos_operativos_y_administrativos.sql
240_permisos_modulos_admin_y_comunicados.sql
```

Esta migración crea `obtener_rol_actual()`, corrige las políticas RLS de perfiles y recarga la caché de PostgREST. Después ejecuta:

```text
250_cinta_promociones_y_dinamica_mapa.sql
260_corregir_cinta_y_flujos_usuario.sql
300_segmentacion_geografica_comunicados.sql
999_verificar_instalacion.sql
```


## Ajuste de comunicados y push

Ejecutar después de la 260:

```text
270_comunicados_bandeja_y_push.sql
300_segmentacion_geografica_comunicados.sql
999_verificar_instalacion.sql
```

- `280_promociones_portadas_y_aprobacion.sql`: edición de promociones, portadas de campañas y permisos de aprobación.

### Ajuste 290
Ejecuta `290_corregir_notificaciones_y_patrocinadores.sql` después de la 280. Corrige las restricciones usadas por `ON CONFLICT` en comunicados y push.


### Reparación posterior

Ejecutar `320_reparacion_patrocinadores_y_carrusel.sql` para corregir permisos de patrocinadores y campañas patrocinadas en instalaciones existentes.


### Ajuste operativo 370
Ejecutar `370_ajustes_operativos_geografia_push_metricas.sql` después de `362_reparacion_upsert_user_consents.sql`. Incluye segmentación geográfica de campañas/patrocinadores, notificaciones propias en Realtime y simulación de métricas demo.

### 381_ajustes_notificacion_promociones_puntos_demo.sql
Ejecutar después de `380_metricas_demo_patrocinadores_pendientes.sql`. Evita sumar puntos reales mientras `simulatedLocationEnabled` esté activo. Los cambios visuales de notificación y carrusel están en frontend.

### 387 - Demo por usuario, QR, premios y mapa
Ejecutar después de `386_qr_edicion_ubicaciones_y_vigencia_recompensas.sql`. Limita Demo a máximo 10 usuarios, sincroniza premios/puntos de QR existentes, identifica recompensas Demo y las oculta al desactivar Demo.
