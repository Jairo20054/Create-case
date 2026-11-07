'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { ProductPhoto } from './commerce-ui';
import { productHref } from '@/lib/storefront-policy';

type Phase = 'still' | 'falling' | 'finished';

/**
 * First-visit brand animation. Source photos are real catalog images:
 * no placeholder products, stock or prices are invented.
 */
export function CaseDrop({ products }: { products: Product[] }) {
  const [phase, setPhase] = useState<Phase>('still');
  const cases = useMemo(() => {
    const seen = new Set<string>();
    return products.filter(product => {
      if (product.isDemo || product.productType !== 'CASE' || !product.image || seen.has(product.image)) return false;
      seen.add(product.image);
      return true;
    }).slice(0, 6);
  }, [products]);

  useEffect(() => {
    if (!cases.length) return;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (window.sessionStorage.getItem('alter-case-drop-seen') === '1') return;
      window.sessionStorage.setItem('alter-case-drop-seen', '1');
      const timer = window.setTimeout(() => setPhase('falling'), 0);
      return () => window.clearTimeout(timer);
    } catch {
      // If storage is blocked the content remains available without animation.
    }
  }, [cases.length]);

  useEffect(() => {
    if (phase !== 'falling') return;
    const timer = window.setTimeout(() => setPhase('finished'), 2900);
    return () => window.clearTimeout(timer);
  }, [phase]);

  return (
    <section className="case-drop" aria-label="ALTER CASE, tu celular, tu estilo">
      <div className="case-drop-content">
        <p className="case-drop-eyebrow">ALTER / CASE — DISEÑO PARA TU DÍA</p>
        <h1>TU CELULAR.<br /><em>TU ESTILO.</em></h1>
        <p className="case-drop-intro">Cases para tu modelo exacto. Encuentra el diseño que va contigo.</p>
        <div className="case-drop-actions">
          <a className="button-dark" href="#device-selector">ENCUENTRA TU CASE <ArrowDownRight size={18} /></a>
          <Link className="case-drop-secondary" href="/shop?category=CASE">EXPLORAR COLECCIÓN <ArrowUpRight size={17} /></Link>
        </div>
        <span className="case-drop-note">TU MODELO. TU ELECCIÓN. SIN COMPLICACIONES.</span>
      </div>
      <div className={`case-drop-stage ${phase === 'falling' ? 'case-drop-animate' : ''}`} aria-label={cases.length ? 'Fundas del catálogo ALTER CASE' : undefined}>
        {cases.length ? cases.map((product, index) => (
          <Link key={product.id} href={productHref(product)}
            className={`case-drop-piece case-drop-piece-${index + 1}`}
            aria-label={`Ver funda ${product.name}`}
            style={{ '--drop-order': index } as CSSProperties}>
            <ProductPhoto src={product.image} alt={product.alt || product.name}
              priority={index === 0} sizes="(max-width: 767px) 44vw, 19vw" />
          </Link>
        )) : <div className="case-drop-empty"><span>ALTER</span><span>CASE</span><small>LA COLECCIÓN ESTÁ EN PREPARACIÓN</small></div>}
      </div>
      {phase === 'falling' && <button className="case-drop-skip" type="button"
        onClick={() => setPhase('finished')}>Saltar animación</button>}
    </section>
  );
}
