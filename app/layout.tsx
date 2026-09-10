import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/store-provider';
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://alter-case.vercel.app'), title: { default: 'ALTER-CASE — Protección, tecnología y tu estilo', template: '%s | ALTER-CASE' }, description: 'Encuentra cases y accesorios compatibles con tu celular. Explora tecnologías, colores y colecciones de ALTER-CASE.', openGraph: { title: 'ALTER-CASE', description: 'ALTER YOUR PHONE. Protección, tecnología y tu estilo.', type: 'website', locale: 'es_CO' } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="es"><body><StoreProvider>{children}</StoreProvider></body></html>; }
