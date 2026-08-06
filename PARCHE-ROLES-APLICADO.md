# Parche de lectura de roles

Reemplaza o agrega estos archivos en el proyecto:

- `app/auth/callback/page.tsx`
- `components/AdminGuard.tsx`
- `lib/roles.ts`

La base debe tener aplicada la migración `220_corregir_roles_y_rls_perfiles.sql`, especialmente la función:

```sql
public.obtener_rol_actual()
```

Después:

1. Haz commit y push al repositorio conectado a Vercel.
2. Espera el nuevo deployment o ejecuta Redeploy.
3. Cierra sesión.
4. Inicia sesión nuevamente con Google.

El callback ya no asumirá silenciosamente el rol `usuario` cuando falle una consulta.
