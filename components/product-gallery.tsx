'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, ZoomIn, ZoomOut } from 'lucide-react';
import type { ProductMedia } from '@/lib/catalog';
import { Modal, ProductPhoto } from './commerce-ui';
export function ProductGallery({ images, name }: {
    images: ProductMedia[];
    name: string;
}) {
    const [index, setIndex] = useState(0), [open, setOpen] = useState(false), [zoom, setZoom] = useState(1);
    const gesture = useRef<{
        x: number;
        distance: number;
        zoom: number;
    } | null>(null);
    const pointer = useRef<number | null>(null);
    const active = images[index] ?? images[0];
    function move(step: number) { setIndex(i => (i + step + images.length) % images.length); setZoom(1); }
    useEffect(() => { setIndex(0); setZoom(1); }, [images]);
    useEffect(() => { if (open && images.length > 1) {
        const next = new window.Image();
        next.src = images[(index + 1) % images.length].url;
    } }, [open, index, images]);
    function media(full = false) { return <div className={`gallery-stage ${full ? 'fullscreen-stage' : ''}`} onKeyDown={e => { if (e.key === 'ArrowRight') {
        e.preventDefault();
        move(1);
    } if (e.key === 'ArrowLeft') {
        e.preventDefault();
        move(-1);
    } }} tabIndex={0} aria-label="Galería de producto, usa las flechas para navegar" onPointerDown={e => { if (e.pointerType === 'mouse')
        pointer.current = e.clientX; }} onPointerUp={e => { if (pointer.current !== null && Math.abs(e.clientX - pointer.current) > 50) {
        move(e.clientX < pointer.current ? 1 : -1);
    } pointer.current = null; }} onTouchStart={e => { const touches = e.touches; gesture.current = { x: touches[0].clientX, distance: touches.length === 2 ? Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY) : 0, zoom }; }} onTouchMove={e => { if (full && e.touches.length === 2 && gesture.current?.distance) {
        const [a, b] = Array.from(e.touches);
        setZoom(Math.min(3, Math.max(1, gesture.current.zoom * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / gesture.current.distance)));
    } }} onTouchEnd={e => { if (gesture.current && !gesture.current.distance && zoom === 1 && Math.abs(e.changedTouches[0].clientX - gesture.current.x) > 45)
        move(e.changedTouches[0].clientX < gesture.current.x ? 1 : -1); gesture.current = null; }}>{active?.type === 'VIDEO' ? <video controls playsInline src={active.url} aria-label={active.alt}/> : <div className="gallery-image" style={full ? { width: `${zoom * 100}%`, height: `${zoom * 100}%`, position: 'relative' } : undefined}><ProductPhoto src={active?.url} alt={active?.alt ?? name} priority sizes="(max-width: 900px) 100vw, 60vw"/></div>}{!full && active && <button className="icon-button expand-gallery" onClick={() => setOpen(true)} aria-label="Abrir galería en pantalla completa"><Expand size={20}/></button>}</div>; }
    return <div className="product-gallery"><div className="gallery-thumbnails">{images.map((item, i) => <button key={item.id} onClick={() => setIndex(i)} aria-label={`Ver imagen ${i + 1}: ${item.alt}`} aria-pressed={index === i} className={index === i ? 'selected' : ''}>{item.type === 'VIDEO' ? <span>Video</span> : <ProductPhoto src={item.url} alt={item.alt} sizes="72px"/>}</button>)}</div><div>{media()}<div className="gallery-navigation"><button className="icon-button" disabled={images.length < 2} onClick={() => move(-1)} aria-label="Imagen anterior"><ChevronLeft size={20}/></button><span aria-live="polite">{images.length ? index + 1 : 0} / {images.length}</span><button className="icon-button" disabled={images.length < 2} onClick={() => move(1)} aria-label="Imagen siguiente"><ChevronRight size={20}/></button></div></div>{open && <Modal title={name} onClose={() => { setOpen(false); setZoom(1); }}><div className="fullscreen-gallery">{media(true)}<div className="gallery-navigation"><button className="icon-button" onClick={() => move(-1)} aria-label="Imagen anterior"><ChevronLeft /></button><button className="icon-button" onClick={() => setZoom(z => Math.max(1, z - .5))} aria-label="Reducir zoom"><ZoomOut /></button><span>{index + 1} / {images.length}</span><button className="icon-button" onClick={() => setZoom(z => Math.min(3, z + .5))} aria-label="Aumentar zoom"><ZoomIn /></button><button className="icon-button" onClick={() => move(1)} aria-label="Imagen siguiente"><ChevronRight /></button></div><p className="muted text-center">Usa las flechas para cambiar de imagen y Escape para cerrar.</p></div></Modal>}</div>;
}
