# Home Run Rewards v2.9.5

- Las campañas de mapa/visita a marca pasan automáticamente a **Finalizada** cuando se agota todo su inventario real.
- Las ubicaciones con 0 unidades dejan de mostrarse al usuario.
- Si una campaña fue finalizada automáticamente por inventario y el administrador vuelve a cargar unidades, se reactiva.
- Mis campañas permite filtrar Activas, Borrador, Finalizadas, Programadas, Pausadas y Todas.
- La edición de campañas sincroniza ubicaciones por ID en lugar de borrarlas y recrearlas, evitando duplicados.
- Se elimina el campo ambiguo “Cantidad de premios” que en realidad creaba ubicaciones. El stock se administra con “Unidades en esta ubicación”.
- La migración 385 limpia duplicados históricos exactos y conserva el mayor inventario detectado.
