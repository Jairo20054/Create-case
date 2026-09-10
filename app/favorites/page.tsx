'use client';
import Link from 'next/link';
import { Nav, Footer, ProductGrid } from '@/components/storefront';
import { CatalogStatus } from '@/components/commerce-ui';
import { useStore } from '@/components/store-provider';
export default function Page() { const { products, favorites, catalogLoading, catalogError } = useStore(); const list = products.filter(p => favorites.includes(p.id)); return <><Nav /><main id="main-content" className="page-shell"><p className="eyebrow">GUARDA LO QUE VA CONTIGO</p><h1 className="page-title">Tus favoritos.</h1><CatalogStatus /><ProductGrid list={list}/>{!catalogLoading && !catalogError && !list.length && <div className="empty-state"><h2>Haz espacio para tus próximos favoritos.</h2><p>Toca el corazón de un producto para guardarlo aquí.</p><Link href="/shop" className="button-dark">Descubrir productos</Link></div>}</main><Footer /></>; }
