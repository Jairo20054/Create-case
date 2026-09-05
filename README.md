# ALTER//CASE

E-commerce colombiano de cases y accesorios construido con Next.js 15, TypeScript estricto, Prisma 7 y Supabase Postgres.

## Arquitectura de compatibilidad

- `DeviceBrand` y `Device` registran marcas y modelos exactos.
- `Product` define `UNIVERSAL`, `BRAND_SPECIFIC` o `DEVICE_SPECIFIC`.
- `ProductVariantDevice` es la fuente de verdad para compatibilidad física exacta.
- `ProductVariantBrand` registra compatibilidad por marca a nivel de variante.
- `Capability`, `DeviceCapability` y `VariantCapabilityRequirement` validan requisitos técnicos. En el MVP se deben cumplir **todos** los requisitos marcados como obligatorios.
- `Inventory` conserva stock físico en `quantity`; el stock comprable es `quantity - reservedQuantity`.
- El precio definitivo siempre se lee de `ProductVariant.price` en el servidor.
- `isDemo` permite excluir ejemplos y siempre ordenar productos reales primero.

La interfaz consulta `/api/catalog/products`; las listas de compatibilidad ya no se guardan en componentes ni en `localStorage`. El carrito invitado puede conservar su presentación localmente, pero cada alta y cada checkout se revalidan en el servidor. Si hay un token Supabase válido, `/api/cart/items` también persiste el elemento en PostgreSQL.

## Desarrollo local

```bash
npm ci
cp .env.example .env.local
npm run prisma:generate
npm run dev
```

Variables privadas:

- `DATABASE_URL`: conexión de aplicación para Vercel (Supavisor transaction mode, puerto 6543).
- `DIRECT_URL`: conexión de migraciones/seed (directa o Supavisor session mode, puerto 5432).

Nunca exponga estas variables con el prefijo `NEXT_PUBLIC_`. Para el navegador use únicamente una clave publicable de Supabase.

## Migraciones seguras

La migración inicial histórica está en `prisma/migrations/20260828180000_initial_store`. La migración de compatibilidad está en `prisma/migrations/20260905000000_compatibility_engine`.

Antes de producción:

1. Haga un respaldo y ejecute primero en una rama o base de staging.
2. Revise si la migración inicial ya fue aplicada mediante el SQL Editor de Supabase.
3. Si ya existe, regístrela una sola vez en Prisma sin volver a ejecutarla:

```bash
npx prisma migrate resolve --applied 20260828180000_initial_store
```

4. Aplique la migración pendiente y ejecute el seed:

```bash
npm run migrate:deploy
npm run db:seed
```

En una base completamente nueva no ejecute `migrate resolve`; use directamente `npm run migrate:deploy` para aplicar ambas migraciones.

La migración conserva las columnas históricas `products.price`, `products.category`, `product_variants.phone_model_id` y `product_variants.stock` para permitir revisión y rollback. Después del backfill, el código no las usa como fuente de verdad.

## RLS y Prisma

Las tablas expuestas en `public` mantienen RLS. Las políticas públicas son de solo lectura para catálogo activo y las escrituras administrativas exigen `public.is_admin()`. Prisma usa una conexión exclusivamente del servidor; las rutas vuelven a comprobar autorización, compatibilidad, precio e inventario aunque el cliente manipule la petición. No se usa una clave `service_role` en el navegador ni se desactiva RLS.

## API

- `GET /api/catalog/brands`
- `GET /api/catalog/devices?brandId=&q=`
- `GET /api/catalog/products?deviceId=&includeDemo=&productType=&q=`
- `POST /api/compatibility`
- `POST /api/cart/items`
- `POST /api/cart/validate`
- `GET /api/admin/compatibility` (admin)
- `POST /api/admin/products` (admin)
- `PATCH /api/admin/variants/:variantId` (admin)

## Verificación

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Los seeds son idempotentes y pequeños: cinco marcas, ocho dispositivos, ocho capacidades y cuatro productos de demostración con ejemplos de compatibilidad exacta, por marca y universal.
