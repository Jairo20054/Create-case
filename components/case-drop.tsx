'use client';

import Link from 'next/link';
import './case-drop.css';
import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { ProductPhoto } from '@/components/commerce-ui';
import type { Product } from '@/lib/catalog';

/**
 * Brand introduction driven exclusively by published catalog photographs.
 * Never synthesizes product shapes, prices or inventory.
 */
export function CaseDrop({ products }: { products: Product[] }) {
  const images = products.filter((product) => product.image && !product.isDemo && product.productType === 'CASE').slice(0, 6);
  const [play, setPlay] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visited = false;
    try {
      visited = window.sessionStorage.getItem('alter-case-drop-seen') === '1';
      window.sessionStorage.setItem('alter-case-drop-seen', '1');
    } catch {
      // Restricted storage environments should not prevent shopping.
    }
    if (!reduced && !visited && images.length > 0) setPlay(true);
    else setCompleted(true);
  }, [images.length]);

  return (
    <section className="case-drop" aria-label="Bienvenido a ALTER CASE">
      <div className="case-drop-copy">
        <p className="eyebrow">ALTER / CASE · DISEÑO PARA TU DÍA</p>
        <h1>TU CELULAR.<br /><em>TU ESTILO.</em></h1>
        <p>Fundas para expresarte. Primero encuentra el modelo exacto de tu celular.</p>
        <div className="case-drop-actions">
          <a className="button-dark" href="#device-selector">ENCUENTRA TU CASE <ArrowRight size={18} aria-hidden="true" /></a>
          <Link className="text-link" href="/shop?category=CASE">EXPLORAR COLECCIÓN</Link>
        </div>
        {play && !completed && <button className="case-drop-skip" type="button" onClick={() => { setPlay(false); setCompleted(true); }}>Saltar animación</button>}
      </div>
      {images.length > 0 && <div className={`case-drop-stage ${play ? 'is-playing' : ''} ${completed ? 'is-complete' : ''}`} aria-hidden="true">
        {images.map((product, index) => (
          <div className="case-drop-item" key={product.id} onAnimationEnd={index === 0 ? () => setCompleted(true) : undefined} style={{ '--drop-index': index, '--drop-rotate': `${[-16, 14, -7, 20, -12, 8][index]}deg` } as CSSProperties}>
            <ProductPhoto src={product.image} alt="" sizes="(max-width: 640px) 35vw, 18vw" />
          </div>
        ))}
      </div>}
      {images.length === 0 && <div className="case-drop-empty" aria-hidden="true"><span>ALTER<br />/ CASE</span></div>}
    </section>
  );
}
