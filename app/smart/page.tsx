'use client';
import { Nav, Footer, ProductGrid } from '@/components/storefront';
import { TechnologySection } from '@/components/pages';
import { CatalogStatus } from '@/components/commerce-ui';
import { useStore } from '@/components/store-provider';
import { isCompatible } from '@/lib/storefront-policy';
export default function Page() { const { products, devices, selectedDeviceId } = useStore(); const device = devices.find(d => d.id === selectedDeviceId); const list = products.filter(p => p.features.length && p.variants.some(v => isCompatible(p, v, device))); return <><Nav /><main id="main-content"><TechnologySection products={list}/><section className="section-shell"><CatalogStatus /><ProductGrid list={list}/></section></main><Footer /></>; }
