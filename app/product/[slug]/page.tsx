import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/pages';
import { getCatalogProducts } from '@/lib/server/catalog';
const findProduct = cache(async (slug: string) => {
    try {
        const { products } = await getCatalogProducts({ query: undefined, slug });
        return { available: true, product: products.find(p => p.slug === slug) };
    }
    catch {
        return { available: false, product: undefined };
    }
});
export async function generateMetadata({ params }: {
    params: Promise<{
        slug: string;
    }>;
}): Promise<Metadata> { const { slug } = await params; const { product } = await findProduct(slug); return { title: product?.name ?? 'Producto', description: product?.description, alternates: { canonical: `/product/${slug}` }, openGraph: product?.image ? { images: [{ url: product.image, alt: product.alt }] } : undefined }; }
export default async function Page({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) { const { slug } = await params; const result = await findProduct(slug); if (result.available && !result.product)
    notFound(); const product = result.product; const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://alter-case.vercel.app'}/product/${slug}`; const structured = product ? { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description, image: product.images?.map(i => i.url) ?? [product.image], url, brand: { '@type': 'Brand', name: 'ALTER-CASE' }, offers: product.variants.map(v => ({ '@type': 'Offer', sku: v.sku, price: v.price, priceCurrency: 'COP', availability: `https://schema.org/${v.availableStock ? 'InStock' : 'OutOfStock'}`, url: `${url}?variant=${v.id}` })) } : null; return <>{structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}/>}<ProductDetail slug={slug}/></>; }
