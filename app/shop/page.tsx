import { Suspense } from 'react';
import { Shop } from '@/components/storefront';
export const metadata = { title: 'Cases y accesorios', alternates: { canonical: '/shop' } };
export default function Page() { return <Suspense><Shop /></Suspense>; }
