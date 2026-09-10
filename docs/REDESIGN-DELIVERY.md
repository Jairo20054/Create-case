# Rediseño ALTER-CASE — alcance entregado

## Antes y después

| Antes | Después |
| --- | --- |
| Hero con teléfono dibujado por CSS | Composición tipográfica y fotografía del catálogo cuando existe |
| Navegación simple sin buscador | Header sticky, mega menú, menú móvil, búsqueda con debounce |
| Favoritos efímeros | Estado compartido y persistencia de favoritos invitados |
| Imágenes recortadas | next/image con contain, dimensiones y sizes, AVIF/WebP |
| Galería básica | Miniaturas, swipe/drag, flechas, diálogo ampliado, zoom y teclado |
| Selección aislada de dispositivo | Selección global persistente con filtros compatibles |
| Filtros de categoría básicos | Filtros combinados por variante, URL y chips removibles |
| Colores solo en detalle | Swatches en tarjetas y detalle, precio/imagen/stock/URL coherentes |
| Colecciones y reloj fijos | Colecciones derivadas del catálogo real, sin reloj ficticio |
| Personalizador decorativo | Estudio local de texto/foto/tipografía/color/tamaño/posición/rotación |
| Sin compra de sets | Set validado completo antes de actualizar el carrito invitado |
| ESLint sin análisis TS | Reglas reales Next/TypeScript |

## Implementación

- Reutilizados: StoreProvider, Nav, Home, Footer, ProductCard, ProductGrid, Shop, ProductDetail y APIs Prisma existentes.
- Nuevos: commerce-ui (Modal, ProductPhoto, Carousel, CatalogStatus, DeviceSelector), ProductGallery, Collections; política de selección y filtros compartida.
- Catálogo: filtros se aplican sobre UNA MISMA variante. Respeta capacidades tecnológicas y disponibilidad opcional; stock agotado no invalida compatibilidad física en la vista de catálogo.
- Estado: favoritos y dispositivo persistentes; controles de escrituras concurrentes y doble clic; sets cambian el carrito local solo después de validar todas sus referencias.
- Galerías: toma ProductImage.variantId ya existente; no modifica el esquema ni inventa vistas secundarias. El componente contempla video si un origen futuro proporciona media VIDEO; el esquema actual entrega imágenes.
- Demos: excluidos del catálogo público y rechazados por la validación de compra en el servidor.
- SEO: metadata y canonical de producto; JSON-LD Product con ofertas reales; 404 cuando el catálogo confirma que no existe el producto. Fallos de conexión muestran error recuperable en lugar de un 404 falso.
- Rendimiento: se retira framer-motion de las rutas principales del storefront; JavaScript inicial Home baja de aproximadamente 163 kB a 129 kB en build local. Esto NO equivale a una medición de Core Web Vitals.
- Responsive: rejillas, filtros móviles en diálogo, navegación móvil, carruseles táctiles, barra inferior CTA con safe-area, reglas de movimiento reducido y foco visible.
- Imágenes: hosts autorizados mediante PRODUCT_IMAGE_HOSTS y hostname de NEXT_PUBLIC_SUPABASE_URL. No se añadieron fotos genéricas ni recursos de las marcas de referencia.

## Validación

- TypeScript: pasa.
- ESLint Next/TypeScript: pasa.
- Pruebas: 38 pasan (25 existentes y 13 nuevas de filtros, compatibilidad e identidad de variantes).
- Build Next.js: pasa; repetir en CI con instalación desde lockfile.
- Verificación visual/flujo real: NO completada. El navegador de este entorno rechaza la vista local con ERR_BLOCKED_BY_CLIENT. No existen datos de producción ALTER-CASE accesibles aquí. No se afirma verificación visual de tamaños, zoom/pinch o compra E2E.

## Pendiente para completar el brief y habilitar producción

1. Identificar/conectar el proyecto Supabase propio de ALTER-CASE. El conector solo expone NIDO y MAESTRO-SEGUIMIENTOS. No se cambiaron esas bases.
2. Configurar DATABASE_URL, DIRECT_URL y claves públicas de Supabase en Vercel para el proyecto correcto; revisar y aplicar migraciones Prisma existentes después de inspeccionar dicha base.
3. Cargar fotografías comerciales propias/autorizadas y catálogo con variantes y relaciones reales. No se han introducido datos ficticios para aparentar que este paso está completo.
4. Resolver cancelación Vercel por verified-commits mediante el flujo de commits aprobado por el propietario. No se desactivaron controles de seguridad ni se forzó producción.
5. Checkout histórico guarda pedidos locales después de revalidar: falta persistencia transaccional definitiva, reserva de inventario, pago y confirmación real. Este rediseño NO convierte el checkout existente en una pasarela de pago.
6. Autenticación frontend y edición administrativa de catálogo siguen incompletas en la rama heredada; backend administrativo existente conserva sus comprobaciones de sesión y rol. Falta cargar/reordenar fotos desde un panel autenticado y favoritos sincronizados por usuario.
7. Newsletter, UGC, políticas de envío/cambios/garantía y ranking de ventas necesitan contenido autorizado y/o soporte real del backend. No se añadieron formularios sin destino ni afirmaciones comerciales inventadas. Reseñas solo aparecen si existen filas reales. No existe moderación/publicación de reseñas en este alcance.
8. No se inventó una taxonomía SLIM/TOUGH/ELITE: el selector visual usa nombres/diseños reales de variantes. Faltan protección/peso/dimensiones si el modelo no los registra. Comparador muestra solo campos disponibles.
9. Studio guarda composición local; la imagen permanece en memoria por privacidad. Fabricación, stickers, carga al servidor y producto personalizado comprable quedan fuera hasta definir infraestructura y producto real.
10. Validar Home/PLP/PDP/carrito/menús/lightbox, filtros y variantes a 320, 375, 390, 430, 768, 1024, 1440 y 1920 px en una preview con datos. Verificar enlaces compartidos, back/forward, compra y permisos administrativos.

## Integración

Rama creada sobre `feat/prisma-compatibility-engine` en 75641a9. La PR hacia main incluirá ese trabajo previo porque todavía no está integrado. Revisar primero las migraciones heredadas antes de aplicar o desplegar esta rama con datos reales. No fusionar ni promover a producción asumiendo que estos requisitos pendientes ya están resueltos.
