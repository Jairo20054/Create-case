# ALTER / CASE — CASE DROP, implementación incremental (2026-11-07)

## Alcance de esta rama
- Introducción cinematográfica del Home con productos reales del catálogo (sin semillas ni imágenes inventadas).
- 6 imágenes máximo en escritorio y 3 en móvil, con `object-contain`, variación de caída, sombra y profundidad.
- Animaciones basadas en transform y opacity, efecto inferior a 3 s con CTA accesible desde el primer frame.
- Botón para saltar y compatibilidad con `prefers-reduced-motion`.
- Memoria de sesión para evitar reproducir el efecto en cada navegación.
- Estado gráfico tipográfico cuando no hay fotografías, sin simular inventario.
- Conservar el resto del catálogo, el selector de dispositivos y el motor de compatibilidad.

## Archivos
- `components/case-drop.tsx` (nuevo)
- `components/case-drop.css` (nuevo)
- `components/pages.tsx` (integración Home)

## Pendientes que bloquean la aceptación comercial
1. Identificar y conectar exclusivamente una base Supabase de ALTER / CASE, verificar RLS y migraciones antes de usarla.
2. Sustituir el dashboard local y las páginas administrativas genéricas por UI autenticada con datos del servidor y permisos API en cada operación.
3. CRUD de imágenes, Storage, CSV/XLSX con vista previa, movimientos de inventario y auditoría.
4. Checkout y reservas persistentes con idempotencia y transacciones, estados confirmados y pago verificado.
5. Eliminar WhatsApp ficticio; publicar políticas y medios de contacto exclusivamente validados.
6. Probar de extremo a extremo en preview con datos reales, todos los viewports, CI y controles de accesibilidad.
7. Resolver verificación de commits Vercel con configuración aprobada, sin debilitar protección.

## Validación
Solo se verificó por lectura que los componentes usados existen y que el Home previo contiene el punto de integración. **No se ejecutaron en esta sesión** `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` ni Playwright. Estos son gates obligatorios antes de merge y despliegue.

Esta rama no realiza migraciones, cambios a Vercel ni merge a main.
