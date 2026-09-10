# Auditoría ALTER-CASE — 10 septiembre 2026

- Framework: Next.js 15, App Router, React 19, TypeScript estricto.
- UI: Tailwind 3 + CSS global, lucide-react, framer-motion.
- Estado: React Context, carrito/pedidos locales; catálogo consultado por API.
- Base de datos / ORM: PostgreSQL con Prisma 7 y esquema Supabase; motor existente en `feat/prisma-compatibility-engine` (75641a9), pendiente en main.
- Autenticación: backend verifica bearer Supabase y rol Profile.ADMIN; formularios públicos actuales sin conexión funcional.
- Storage: columnas de imágenes disponibles; no se encontró un proyecto Supabase ALTER-CASE accesible ni fotografías propias en el repositorio.
- Productos/variantes: Product, ProductVariant, ProductImage con variantId, Inventory; compatibilidad exacta, por marca y requisitos tecnológicos.
- Carrito: altas y validación de precio/stock en servidor en rama Prisma; checkout histórico solo guarda pedidos en localStorage.
- Reutilizar: StoreProvider, ProductCard, ProductGrid, Nav, Home, ProductDetail y APIs existentes.
- Rediseñar: navegación, galería, catálogo/filtros, selección de variantes/dispositivos, favoritos, home, colecciones y personalización.
- Problemas: imágenes object-cover, hero dibujado en CSS, contenido promocional y temporizador fijos, favoritos efímeros, menús/botones sin lógica, inexistencia de datos de ventas para ranking.
- Vercel: proyecto `alter-case`, repositorio `Jairo20054/Create-case`. API pública /api/catalog/products responde 404. Último despliegue Prisma CANCELED con enlace de error a verified-commits. No desactivar controles de verificación.
- Supabase: conexión disponible lista NIDO (activo) y MAESTRO-SEGUIMIENTOS (inactivo); ninguno identificado como ALTER-CASE. No modificar bases ajenas ni crear proyecto de pago sin contexto.

No se ejecutarán migraciones ni semillas contra proyectos no identificados. No se presentarán fotos genéricas, reseñas, descuentos o stock inventados como datos reales. Los módulos se alimentarán del catálogo existente y mostrarán estados vacíos/error recuperables cuando falte conexión.

## Comprobación inicial

La rama Prisma pasaba 25 pruebas y build. La configuración inicial de ESLint solo declaraba exclusiones: no analizaba TS/TSX. En el rediseño se activan `next/core-web-vitals` y `next/typescript`.
