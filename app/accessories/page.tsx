import { Suspense } from 'react';
import { Shop } from '@/components/storefront';
export const metadata = { title: 'Accesorios', alternates: { canonical: '/accessories' } };
export default function Page() { return <Suspense><Shop initialCategory="ACCESSORIES"/></Suspense>; }
