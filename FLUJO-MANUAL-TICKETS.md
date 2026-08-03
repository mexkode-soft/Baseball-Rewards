# Flujo manual de tickets

## Configuración

Ejecuta la migración:

`supabase/migrations/20260803180000_manual_ticket_review_flow.sql`

Después despliega nuevamente el proyecto en Vercel.

## Recorrido de prueba

1. El usuario abre una campaña de ticket.
2. Selecciona la sucursal participante.
3. Captura folio, fecha y monto.
4. Sube hasta tres fotografías y envía el ticket.
5. Los administradores reciben una notificación en la campanita.
6. El administrador entra a **Validar tickets**.
7. Revisa las fotografías y corrige los datos cuando sea necesario.
8. Al aprobar:
   - se registra la participación;
   - se suman los puntos;
   - se genera la recompensa configurada;
   - el monto se suma a las ventas atribuidas;
   - el usuario recibe una notificación.
9. Al rechazar, el usuario recibe el motivo en su campanita.

La función de revisión evita procesar dos veces el mismo ticket.
