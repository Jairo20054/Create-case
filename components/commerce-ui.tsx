'use client';
import Image from 'next/image';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useStore } from './store-provider';
export function ProductPhoto({ src, alt, priority = false, sizes = '(max-width: 768px) 50vw, 25vw', className = '' }: {
    src?: string;
    alt: string;
    priority?: boolean;
    sizes?: string;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    if (!src || failed)
        return <div className="media-unavailable" role="img" aria-label={alt}>Fotografía no disponible</div>;
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain ${className}`} onError={() => setFailed(true)}/>;
}
export function Modal({ title, children, onClose, drawer = false }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    drawer?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const close = useRef(onClose);
    close.current = onClose;
    const id = useId();
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog?.showModal();
        return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
    }, []);
    return <dialog ref={ref} className={`store-modal ${drawer ? 'drawer-modal' : ''}`} aria-labelledby={id} onCancel={event => { event.preventDefault(); close.current(); }} onClick={event => { if (event.target === event.currentTarget)
        close.current(); }}><div className="modal-inner"><div className="modal-heading"><h2 id={id}>{title}</h2><button className="icon-button" onClick={onClose} aria-label={`Cerrar ${title}`}><X size={21}/></button></div>{children}</div></dialog>;
}
export function Carousel({ title, children, category = false }: {
    title: string;
    children: ReactNode;
    category?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const drag = useRef<{
        x: number;
        scroll: number;
    } | null>(null);
    const moved = useRef(false);
    const id = useId();
    const [edges, setEdges] = useState({ start: true, end: false });
    function update() { const el = ref.current; if (el)
        setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 }); }
    useEffect(() => { update(); const observer = new ResizeObserver(update); if (ref.current)
        observer.observe(ref.current); return () => observer.disconnect(); }, [children]);
    function scroll(direction: number) { ref.current?.scrollBy({ left: direction * ref.current.clientWidth * .82, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
    return <section className="carousel-section" aria-label={title}><div className="section-heading"><h2>{title}</h2><div className="carousel-buttons"><button disabled={edges.start} className="icon-button" aria-label={`Anterior: ${title}`} aria-controls={id} onClick={() => scroll(-1)}><ArrowLeft size={18}/></button><button disabled={edges.end} className="icon-button" aria-label={`Siguiente: ${title}`} aria-controls={id} onClick={() => scroll(1)}><ArrowRight size={18}/></button></div></div><div id={id} ref={ref} className={`carousel-track ${category ? 'category-track' : ''}`} tabIndex={0} onScroll={update} onKeyDown={e => { if (e.target === e.currentTarget && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        scroll(e.key === 'ArrowLeft' ? -1 : 1);
    } }} onPointerDown={e => { moved.current = false; if (e.pointerType === 'mouse')
        drag.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft }; }} onPointerMove={e => { if (!drag.current)
        return; const delta = e.clientX - drag.current.x; if (Math.abs(delta) > 8) {
        moved.current = true;
        e.currentTarget.scrollLeft = drag.current.scroll - delta;
    } }} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }} onDragStart={e => e.preventDefault()} onClickCapture={e => { if (moved.current) {
        e.preventDefault();
        e.stopPropagation();
        moved.current = false;
    } }}>{children}</div></section>;
}
export function CatalogStatus() { const { catalogLoading, catalogError, refreshCatalog } = useStore(); return catalogLoading ? <div className="catalog-skeleton" aria-busy="true" aria-label="Cargando productos">{[1, 2, 3, 4].map(i => <div key={i}/>)}</div> : catalogError ? <div className="empty-state" role="alert"><h2>No pudimos cargar los productos.</h2><p>Inténtalo de nuevo en unos momentos.</p><button className="button-dark" onClick={refreshCatalog}>Reintentar</button></div> : null; }
export function DeviceSelector({ onDone }: {
    onDone?: () => void;
}) {
    const { devices, selectedDeviceId, setSelectedDeviceId, catalogLoading } = useStore();
    const selected = devices.find(d => d.id === selectedDeviceId);
    const [brand, setBrand] = useState(selected?.brand.id ?? '');
    const [model, setModel] = useState(selectedDeviceId);
    const id = useId();
    const brands = Array.from(new Map(devices.map(d => [d.brand.id, d.brand])).values());
    return <form className="device-form" onSubmit={e => { e.preventDefault(); setSelectedDeviceId(model); onDone?.(); }}><div><label htmlFor={`${id}-brand`}>Marca</label><select id={`${id}-brand`} required value={brand} onChange={e => { setBrand(e.target.value); setModel(''); }}><option value="">Selecciona la marca</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><label htmlFor={`${id}-model`}>Modelo exacto</label><select id={`${id}-model`} required disabled={!brand} value={model} onChange={e => setModel(e.target.value)}><option value="">Selecciona el modelo</option>{devices.filter(d => d.brand.id === brand).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div><button className="button-dark" disabled={!model}>Ver productos compatibles</button>{selectedDeviceId && <button type="button" className="text-link" onClick={() => { setSelectedDeviceId(''); setModel(''); onDone?.(); }}>Ver todos los dispositivos</button>}{!catalogLoading && !devices.length && <p className="muted">Los dispositivos aparecerán cuando esté disponible el catálogo.</p>}</form>;
}
