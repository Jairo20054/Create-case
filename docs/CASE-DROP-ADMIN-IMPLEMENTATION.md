# ALTER / CASE — Implementación CASE DROP + administración (2026-11-07)

## Alcance de esta rama
Basada en `feat/premium-storefront-redesign`. No altera `main` ni despliega a producción.

### Interfaz
- `components/case-drop.tsx` / `.css`: nuevo hero editorial con imágenes REALES del catálogo, 6 fundas desktop y 3 móvil; animación escalonada de 2,1 segundos y hasta 500 ms de desfase; botón Saltar, sesión sin repetición, soporte a movimiento reducido.
- Selección de dispositivo, colecciones y tarjetas conservadas del storefront original.
- `components/auth-screen.tsx`: inicio de sesión y registro mediante Supabase Auth; se elimina el acceso ficticio.
- `components/admin-console.tsx`: panel mobile-first desacoplado de la tienda, protegido por token y verificación de rol backend.

### APIs y persistencia
- GET /api/admin/products — productos y variantes desde Prisma, protegido con `requireAdmin`.
- POST /api/admin/products — creación existente reutilizada (SKU/compatibilidad/stock transaccional).
- PATCH /api/admin/products/[productId] — editar datos y despublicar; se evita eliminación destructiva.
- PATCH /api/admin/variants/[variantId] — actualización existente y validada de precio, foto, compatibilidad e inventario.
- POST /api/admin/images — subida autorizada a Supabase Storage, JPG/PNG/WebP de hasta 5 MB, comprobación de firma y bucket dedicado.
- GET /api/admin/orders — pedidos persistidos, solo datos operativos esenciales.
- PATCH /api/admin/orders/[orderId] — transiciones de estado autorizadas, cancelación libera reserva y envío descuenta inventario.
- POST /api/orders — creación real en PostgreSQL con precio definitivo del servidor, idempotencia UUID, compatibilidad exacta existente, transacción serializable y reserva por variante.

### Seguridad y límites
- Las APIs administrativas siempre validan el token en el servidor contra Supabase y el rol `Profile.ADMIN`.
- Se guardan datos del cliente en `Order.shippingAddress` como ya permite el esquema; no se exponen en el listado de pedidos público (no existe listado público).
- No se procesan pagos ni se marca un pedido como pagado. `confirmed` indica confirmación operativa, NO pago verificado.
- Los pedidos creados tienen reserva física; no existe aún expiración automática. El administrador debe cancelar pedidos desistidos para liberar stock.
- Las imágenes quedan en el bucket `alter-case-products`. Configurar ese bucket como **lectura pública** para fotografías de catálogo; escritura de servicio solo desde servidor y con usuario admin verificado. No guardar secretos del rol de servicio en el cliente.
- Las secciones Colecciones y Clientes muestran su estado pendiente, sin operaciones de edición simuladas.
- Se dispone de formulario para alta manual, actualización de precio y stock y carga CSV con plantilla, vista previa, SKU duplicado, actualización/omisión y resultados por fila. XLSX nativo, reordenamiento de galería, edición integral de compatibilidades, recuperación de pedidos por cliente y auditoría histórica de movimientos siguen pendientes.
- Faltan medidas operativas adicionales para producción: rate limiting distribuido, trazabilidad duradera de acciones administrativas, moderación de datos/retención, antifraude, confirmación de pago, conciliación/caducidad de reservas y revisión RLS.

## Configuración que debe hacer el propietario ANTES de probar el flujo real
1. Identificar y crear/conectar la base de datos y el proyecto Supabase **exclusivo de ALTER / CASE**. No usar los proyectos NIDO ni MAESTRO-SEGUIMIENTOS.
2. En el proyecto correcto, configurar \`ALTER_CASE_SUPABASE_PROJECT_REF\` (ref esperado, obligatorio) y en el entorno de preview: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`) y `SUPABASE_SERVICE_ROLE_KEY`.
3. Revisar las migraciones Prisma heredadas contra una base de STAGING vacía/compatible; aplicarlas solo allí y comprobar las tablas `products`, `product_variants`, `inventory`, `orders` y `order_items`.
4. Crear el bucket `alter-case-products` con lectura pública autorizada y restringir escritura a servidor.
5. Crear un usuario con Supabase Auth y configurar su `Profile` correspondiente con `role=ADMIN` mediante un procedimiento seguro de provisión inicial. No permitir elevación de rol desde el cliente.
6. Registrar dispositivos y marcas reales, después probar /admin, subir una fotografía propia, crear un producto real con SKU único y modelo exacto, comprar una unidad y verificar reserva y cancelación.
7. Resolver el bloqueo de Vercel `BLOCKED`/verified-commits con el flujo autorizado de verificación, sin desactivar protecciones.

## Validación
Comandos de CI (sin dependencias de una base real para unit tests):
```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```
Los tests nuevos de `tests/alter-case-redesign.test.ts` cubren selección de casos sin demos ni fotos inventadas, deduplicación, transiciones y liberación de reservas. CI debe ejecutarlos en la PR. No declarar éxito hasta obtener resultados reales.

## Antes de merge / producción
- Confirmar CI y revisión de seguridad; hacer E2E con base staging, dos pedidos concurrentes y simulación de retries.
- Validar manualmente Chrome Android y Safari iOS, 320/375/390/430/768/1024/1440 CSS px, teclado, zoom al 200% y `prefers-reduced-motion`.
- Ampliar carga CSV a XLSX nativo y operaciones masivas transaccionales, galería multiimagen, operaciones CRUD de colecciones/clientes con autorización, controles de carga masiva y prevención de abuso, tabla de movimientos de inventario, notificaciones, políticas y pago verificado.
- No publicar ni fusionar sin aprobación expresa.

## Barrera de aislamiento
`lib/server/prisma.ts` compara el ref aprobado con `NEXT_PUBLIC_SUPABASE_URL` y el hostname/usuario de `DATABASE_URL`. Sin ref o ante cualquier discrepancia, devuelve 503 y no inicia el cliente Prisma. Revisar la configuración antes de hacer pruebas con una base real.
