# ALTER//CASE

E-commerce de tecnología, moda y coleccionismo construido con Next.js, Tailwind, Framer Motion y Supabase.

## Ejecutar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`.

## Supabase

1. Crea un proyecto y configura las variables de `.env.local`.
2. Ejecuta la migración `supabase/migrations/20260828180000_initial_store.sql` en el SQL Editor o con Supabase CLI.
3. Crea los proveedores Email y Google en Authentication. Añade las URLs de redirección de local y Vercel.
4. Los archivos de producto van al bucket público `product-images`; los diseños privados, a `custom-designs/{user_id}/`.

La RLS limita perfiles, favoritos, carrito, diseños y pedidos a su propietario. El rol `admin` se asigna directamente en `profiles` por un administrador seguro.

## Despliegue Vercel

Importa el repositorio GitHub en Vercel, agrega las variables del `.env.example` y usa los valores de producción. No expongas `SUPABASE_SERVICE_ROLE_KEY`; solo puede consumirse desde funciones de servidor. Vercel detecta Next.js automáticamente.

## Estado de la primera versión

Incluye home inmersivo, shop con buscador, 30 productos demo, drops, smart cases, custom lab, detalle de producto, checkout visual, cuenta, favoritos, carrito lateral y centro administrativo. Las mutaciones reales de autenticación, carrito, pedidos y administración quedan listas para conectarse a los clientes Supabase usando las tablas y políticas incluidas.
