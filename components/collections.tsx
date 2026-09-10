'use client';
import Link from 'next/link';
import { Nav, Footer, ProductGrid } from './storefront';
import { CatalogStatus, ProductPhoto } from './commerce-ui';
import { useStore } from './store-provider';
export const collectionSlug = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function Collections({ slug }: {
    slug?: string;
}) { const { products, catalogLoading, catalogError } = useStore(); const collections = Array.from(new Map(products.map(p => [p.collection, p])).values()); const chosen = collections.find(p => collectionSlug(p.collection) === slug); return <><Nav /><main id="main-content" className="page-shell"><p className="eyebrow">TU FORMA DE VER EL MUNDO</p><h1 className="page-title">{chosen?.collection ?? 'Universos ALTER.'}</h1><p className="muted">Explora los diseños de cada colección.</p><CatalogStatus />{slug && chosen ? <ProductGrid list={products.filter(p => p.collection === chosen.collection)}/> : <div className="collections-grid">{collections.map(p => <Link href={`/drops/${collectionSlug(p.collection)}`} key={p.collection}><div className="category-media"><ProductPhoto src={p.image} alt={p.alt}/></div><h2>{p.collection}</h2></Link>)}</div>}{!catalogLoading && !catalogError && (!collections.length || (slug && !chosen)) && <div className="empty-state"><h2>No hay una colección disponible aquí.</h2><Link href="/shop" className="button-dark">Explorar catálogo</Link></div>}</main><Footer /></>; }
