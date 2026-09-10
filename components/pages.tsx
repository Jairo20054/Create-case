'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Heart, Minus, Plus, Smartphone, Layers, Zap } from 'lucide-react';
import { Nav, ProductCard, Footer } from './storefront';
import { Carousel, CatalogStatus, DeviceSelector, ProductPhoto } from './commerce-ui';
import { ProductGallery } from './product-gallery';
import { money, type Product, type ProductMedia } from '@/lib/catalog';
import { colorValue, isCompatible, productHref } from '@/lib/storefront-policy';
import { useStore } from './store-provider';
export { Footer } from './storefront';
export function Home() {
    const { products, devices, selectedDeviceId, catalogLoading, catalogError } = useStore();
    const device = devices.find(d => d.id === selectedDeviceId);
    const compatible = products.filter(p => p.variants.some(v => isCompatible(p, v, device)));
    const hero = compatible.find(p => p.image && !p.isDemo);
    const newest = [...compatible].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    const types = [['CASE', 'Cases', 'Protección con personalidad.'], ['WALLET', 'Wallets', 'Lleva lo esencial.'], ['CHARGER', 'Cargadores', 'Energía para tu día.'], ['POWER_BANK', 'Power banks', 'Sigue conectado.'], ['STRAP', 'Straps', 'Siempre a tu lado.'], ['SCREEN_PROTECTOR', 'Protectores', 'Cuida cada detalle.']];
    const categories = types.flatMap(([type, label, copy]) => { const p = compatible.find(p => p.productType === type && p.image); return p ? [{ type, label, copy, p }] : []; });
    const collections = Array.from(new Map(compatible.filter(p => p.image).map(p => [p.collection, p])).values());
    return <><Nav /><main id="main-content"><section className={`brand-hero ${hero ? '' : 'hero-type-only'}`}><div className="hero-copy"><p className="eyebrow">TU CELULAR. OTRA EXPRESIÓN.</p><h1>ALTER<br />YOUR PHONE<span>.</span></h1><p className="hero-description">Protección que encaja.<br />Tecnología que va contigo.<br />Estilo que es solo tuyo.</p><div className="hero-actions"><Link href="/shop?category=CASE" className="button-dark">Comprar cases <ArrowUpRight size={17}/></Link><a href="#device-selector" className="text-link">Encontrar mi celular <ArrowRight size={16}/></a></div><span className="hero-footnote">DISEÑADO PARA TU DÍA A DÍA / ALTER-CASE</span></div>{hero && <Link href={productHref(hero)} className="hero-product"><div className="hero-product-image"><ProductPhoto src={hero.image} alt={hero.alt} priority sizes="(max-width:768px) 100vw, 55vw"/></div><div className="hero-product-caption"><span>{hero.name}<small>{hero.collection}</small></span><span>{money(hero.price)} <ArrowUpRight size={18}/></span></div></Link>}</section><section id="device-selector" className="device-section"><div><p className="eyebrow">EL AJUSTE PERFECTO EMPIEZA AQUÍ</p><h2>¿Qué celular tienes?</h2><p className="muted">Selecciona tu dispositivo y descubre lo que encaja contigo.</p></div><DeviceSelector /></section><div className="section-shell"><CatalogStatus />{!catalogLoading && !catalogError && !products.length && <div className="empty-state"><h2>Estamos preparando nuestra selección.</h2><p>Los productos aparecerán aquí cuando estén disponibles.</p></div>}{categories.length > 0 && <Carousel title="Un detalle para cada día." category>{categories.map(({ type, label, copy, p }) => <Link href={`/shop?category=${type}`} className="category-card" key={type}><div className="category-media"><ProductPhoto src={p.image} alt={p.alt}/></div><h3>{label}<ArrowUpRight size={18}/></h3><p>{copy}</p></Link>)}</Carousel>}{newest.length > 0 && <Carousel title="Acaban de llegar.">{newest.slice(0, 10).map(p => <ProductCard key={p.id} p={p}/>)}</Carousel>}{compatible.some(p => p.isFeatured) && <Carousel title="La selección ALTER.">{compatible.filter(p => p.isFeatured).map(p => <ProductCard key={p.id} p={p}/>)}</Carousel>}</div><TechnologySection products={compatible}/>{collections.length > 0 && <section className="section-shell"><Carousel title="Encuentra tu universo." category>{collections.map(p => <Link key={p.collection} href={`/shop?collection=${encodeURIComponent(p.collection)}`} className="collection-card"><div className="category-media"><ProductPhoto src={p.image} alt={p.alt}/></div><p className="eyebrow">COLECCIÓN</p><h3>{p.collection}<ArrowUpRight size={18}/></h3></Link>)}</Carousel></section>}<section className="studio-banner"><div><p className="eyebrow">ALTER STUDIO</p><h2>Una idea tuya.<br />Un case único.</h2><p>Explora colores, tipografías y composiciones para tu próximo diseño.</p><Link href="/custom" className="button-outline">Explorar el estudio <ArrowUpRight size={18}/></Link></div><span className="studio-word" aria-hidden="true">TU<br />ESTILO.</span></section><section className="benefit-grid"><div><Smartphone /><h3>Compatible contigo</h3><p>Elige el modelo exacto de tu celular.</p></div><div><Layers /><h3>Cada detalle cuenta</h3><p>Consulta materiales y variantes antes de elegir.</p></div><div><Zap /><h3>Conoce tu tecnología</h3><p>Revisa los requisitos de cada accesorio.</p></div></section></main><Footer /></>;
}
export function TechnologySection({ products }: {
    products: Product[];
}) { const tech = [['MAGSAFE', 'MagSafe', 'Conexión magnética para tus accesorios.'], ['NFC', 'NFC', 'Interacciones con un toque.'], ['E_INK', 'E-Ink', 'Un diseño que puede cambiar contigo.'], ['QI2', 'Qi2', 'Carga inalámbrica en dispositivos compatibles.']]; return <section className="technology-section"><div className="technology-intro"><p className="eyebrow">TECNOLOGÍA ALTER</p><h2>Más posibilidades.<br />En tu mano.</h2><p>Cada tecnología tiene sus requisitos. Comprueba la compatibilidad antes de comprar.</p></div><div className="technology-grid">{tech.map(([code, name, copy]) => { const p = products.find(p => p.features.includes(code) && p.image); return <Link href={`/shop?technology=${code}`} className="technology-card" key={code}>{p && <div className="technology-photo"><ProductPhoto src={p.image} alt={p.alt}/></div>}<span className="eyebrow">{name}</span><h3>{copy}</h3><span className="text-link">Explorar <ArrowUpRight size={17}/></span></Link>; })}</div></section>; }
export function ProductDetail({ slug }: {
    slug: string;
}) {
    const { products, devices, catalogLoading, catalogError, addToCart, selectedDeviceId, setSelectedDeviceId, favorites, toggleFavorite } = useStore();
    const product = products.find(p => p.slug === slug);
    const [variantId, setVariantId] = useState(''), [qty, setQty] = useState(1), [message, setMessage] = useState(''), [adding, setAdding] = useState(false), [visible, setVisible] = useState(true), [stars, setStars] = useState(0);
    const busy = useRef(false), cta = useRef<HTMLDivElement>(null);
    useEffect(() => { const apply = () => { const query = new URLSearchParams(location.search); setVariantId(query.get('variant') ?? ''); const device = devices.find(d => d.slug === query.get('device') || d.id === query.get('device')); if (device)
        setSelectedDeviceId(device.id); }; apply(); window.addEventListener('popstate', apply); return () => window.removeEventListener('popstate', apply); }, [slug, devices, setSelectedDeviceId]);
    const device = devices.find(d => d.id === selectedDeviceId);
    const variants = product?.variants.filter(v => isCompatible(product, v, device)) ?? [];
    const variant = variants.find(v => v.id === variantId) ?? variants[0];
    const images = useMemo<ProductMedia[]>(() => { if (!product || !variant)
        return []; const media = product.images?.filter(i => !i.variantId || i.variantId === variant.id) ?? []; const primary = variant.imageUrl || product.image; return primary && !media.some(i => i.url === primary) ? [{ id: 'primary', url: primary, alt: `${product.name} · ${variant.color}`, type: 'IMAGE' }, ...media] : media; }, [product, variant]);
    useEffect(() => { const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting)); if (cta.current)
        observer.observe(cta.current); return () => observer.disconnect(); }, [product, variant]);
    useEffect(() => { setQty(1); setMessage(''); }, [variant?.id, selectedDeviceId]);
    function selectVariant(id: string) { setVariantId(id); const url = new URL(location.href); url.searchParams.set('variant', id); if (device)
        url.searchParams.set('device', device.slug); history.replaceState(null, '', url); }
    function selectDevice(id: string) { setSelectedDeviceId(id); const url = new URL(location.href); const d = devices.find(d => d.id === id); if (d)
        url.searchParams.set('device', d.slug);
    else
        url.searchParams.delete('device'); url.searchParams.delete('variant'); history.replaceState(null, '', url); setVariantId(''); }
    async function add() { if (!product || !variant || busy.current)
        return; busy.current = true; setAdding(true); setMessage(''); try {
        await addToCart(product, variant.id, selectedDeviceId, qty);
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'No pudimos agregar el producto.');
    }
    finally {
        setAdding(false);
        busy.current = false;
    } }
    if (catalogLoading || catalogError)
        return <><Nav /><main id="main-content" className="page-shell"><CatalogStatus /></main><Footer /></>;
    if (!product)
        return <><Nav /><main id="main-content" className="page-shell empty-state"><h1>Producto no encontrado.</h1><Link className="button-dark" href="/shop">Volver al catálogo</Link></main><Footer /></>;
    const compatibleDevices = devices.filter(d => product.variants.some(v => isCompatible(product, v, d)));
    const types = Array.from(new Set(variants.map(v => v.name || v.design || 'Estándar')));
    const type = variant?.name || variant?.design || 'Estándar';
    const colors = variants.filter(v => (v.name || v.design || 'Estándar') === type);
    const disabled = !variant || !variant.availableStock || !selectedDeviceId || adding || product.isDemo;
    const reviews = product.reviews ?? [];
    const rating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const related = products.filter(p => p.id !== product.id && p.variants.some(v => isCompatible(p, v, device)));
    const button = <button onClick={add} disabled={disabled} className="button-dark">{adding ? 'Agregando…' : product.isDemo ? 'Producto DEMO' : !variant ? 'Sin variante compatible' : !variant.availableStock ? 'Agotado' : !selectedDeviceId ? 'Selecciona tu dispositivo' : 'Agregar al carrito'}<ShoppingIcon /></button>;
    return <><Nav /><main id="main-content" className="page-shell product-page"><nav className="breadcrumbs" aria-label="Ruta"><Link href="/">Inicio</Link><span>/</span><Link href="/shop">Catálogo</Link><span>/</span><span>{product.name}</span></nav><div className="product-layout"><ProductGallery images={images} name={product.name}/><aside className="product-info"><p className="eyebrow">{product.collection}{product.isDemo ? ' · DEMO' : ''}</p><div className="product-title-row"><h1>{product.name}</h1><button className="icon-button" aria-label="Guardar producto en favoritos" aria-pressed={favorites.includes(product.id)} onClick={() => toggleFavorite(product.id)}><Heart fill={favorites.includes(product.id) ? 'currentColor' : 'none'} size={22}/></button></div>{reviews.length > 0 && <a className="review-summary" href="#reviews">★ {rating.toFixed(1)} · {reviews.length} opiniones</a>}<div className="detail-price"><b>{money(variant?.price ?? product.price)}</b>{variant && (variant.compareAtPrice ?? 0) > variant.price && <del>{money(variant.compareAtPrice!)}</del>}<span>COP</span></div><p className="detail-description">{product.description}</p><div className="chip-list">{product.features.map(f => <span className="feature-chip" key={f}><Check size={12}/>{f.replace('_', '-')}</span>)}</div><label className="detail-label" htmlFor="product-device">Tu dispositivo</label><select id="product-device" value={compatibleDevices.some(d => d.id === selectedDeviceId) ? selectedDeviceId : ''} onChange={e => selectDevice(e.target.value)} className="form-control"><option value="">Selecciona el modelo exacto</option>{compatibleDevices.map(d => <option value={d.id} key={d.id}>{d.brand.name} · {d.name}</option>)}</select>{device && !variant && <p role="status" className="inline-error">No hay una variante compatible con {device.name}. Selecciona otro dispositivo.</p>}{types.length > 1 && <fieldset className="type-selector"><legend className="detail-label">Elige tu referencia</legend>{types.map(t => { const candidate = variants.find(v => (v.name || v.design || 'Estándar') === t)!; return <button key={t} aria-pressed={type === t} onClick={() => selectVariant(candidate.id)}><b>{t}</b><span>{candidate.material}</span><small>{money(candidate.price)}</small></button>; })}</fieldset>}{variant && <fieldset className="color-selector"><legend className="detail-label">Color: <b>{variant.color}</b></legend>{colors.map(v => <button key={v.id} aria-label={`${v.color} ${v.sku}`} aria-pressed={variant.id === v.id} onClick={() => selectVariant(v.id)} title={v.color} className={colorValue(v.color) ? `swatch ${v.id === variant.id ? 'selected' : ''}` : 'color-label'} style={colorValue(v.color) ? { background: colorValue(v.color) } : undefined}>{!colorValue(v.color) && v.color}</button>)}</fieldset>}<p className="stock-label">{variant?.availableStock ? (variant.availableStock <= 5 ? `Últimas ${variant.availableStock} unidades` : 'En stock') : 'No disponible'}</p><div ref={cta} className="product-actions"><div className="quantity"><button aria-label="Reducir cantidad" disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))}><Minus size={16}/></button><span>{qty}</span><button aria-label="Aumentar cantidad" disabled={!variant || qty >= variant.availableStock} onClick={() => setQty(q => Math.min(variant?.availableStock ?? 1, q + 1))}><Plus size={16}/></button></div>{button}</div>{message && <p role="alert" className="inline-error">{message}</p>}<p className="sku-label">Referencia: {variant?.sku ?? 'Selecciona una variante'}</p><div className="specifications"><details open><summary>Descripción</summary><p>{product.description}</p></details><details><summary>Materiales y tecnología</summary><p>{variant?.material || 'Consulta el material de la referencia antes de comprar.'}</p><p>{product.features.join(' · ')}</p></details><details><summary>Compatibilidad</summary><p>{compatibleDevices.map(d => d.name).join(', ') || 'Compatibilidad pendiente de configurar.'}</p>{variant?.requiredCapabilities.length ? <p>Requisitos: {variant.requiredCapabilities.join(', ')}</p> : null}</details></div></aside></div>{device && related.length > 0 && variant && <BundleSelector main={product} variantId={variant.id} deviceId={device.id} related={related}/>}<section className="section-shell flush">{related.length > 0 && <Carousel title="Completa tu ALTER set.">{related.slice(0, 8).map(p => <ProductCard key={p.id} p={p}/>)}</Carousel>}</section>{variants.length > 1 && <section className="comparison"><h2>Compara los detalles.</h2><div className="table-scroll"><table><caption className="sr-only">Referencias de {product.name}</caption><thead><tr><th>Referencia</th>{variants.map(v => <th key={v.id}>{v.name || v.sku}</th>)}</tr></thead><tbody>{['Color', 'Material', 'Precio', 'Disponibilidad'].map((label, i) => <tr key={label}><th>{label}</th>{variants.map(v => <td key={v.id}>{[v.color, v.material ?? 'Sin especificar', money(v.price), v.availableStock ? 'En stock' : 'Agotado'][i]}</td>)}</tr>)}</tbody></table></div></section>}{reviews.length > 0 && <section id="reviews" className="reviews"><h2>Opiniones de este producto.</h2><p>★ {rating.toFixed(1)} / 5 · {reviews.length} opiniones</p><label>Filtrar por estrellas <select value={stars} onChange={e => setStars(Number(e.target.value))}><option value={0}>Todas</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrellas</option>)}</select></label>{reviews.filter(r => !stars || r.rating === stars).map(r => <article key={r.id}><span aria-label={`${r.rating} de 5 estrellas`}>{'★'.repeat(Math.max(0, Math.min(5, r.rating)))}</span><p>{r.comment}</p></article>)}</section>}</main>{!visible && <div className="sticky-buy"><div><b>{money(variant?.price ?? product.price)}</b><small>{variant?.color}</small></div>{button}</div>}<Footer /></>;
}
function ShoppingIcon() { return <Plus size={17}/>; }
function BundleSelector({ main, variantId, deviceId, related }: {
    main: Product;
    variantId: string;
    deviceId: string;
    related: Product[];
}) {
    const { devices, addSetToCart } = useStore();
    const [selected, setSelected] = useState<string[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const device = devices.find(d => d.id === deviceId);
    const variant = main.variants.find(v => v.id === variantId)!;
    const choices = related.filter(p => p.category === 'ACCESSORIES').flatMap(p => { const v = p.variants.find(v => v.availableStock > 0 && isCompatible(p, v, device)); return v ? [{ p, v }] : []; }).slice(0, 3);
    if (!choices.length)
        return null;
    const total = variant.price + choices.filter(x => selected.includes(x.p.id)).reduce((s, x) => s + x.v.price, 0);
    async function add() { setBusy(true); setError(''); try {
        await addSetToCart([{ product: main, variantId }, ...choices.filter(x => selected.includes(x.p.id)).map(x => ({ product: x.p, variantId: x.v.id }))], deviceId);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'No pudimos agregar el set.');
    }
    finally {
        setBusy(false);
    } }
    return <section className="bundle-section"><div><p className="eyebrow">JUNTOS, MEJOR</p><h2>Arma tu set.</h2><p>Combina accesorios compatibles con tu celular.</p><small>Precio de los artículos seleccionados. Sin descuento adicional.</small></div><div><div className="bundle-item"><Check size={18}/><span>{main.name}</span><b>{money(variant.price)}</b></div>{choices.map(({ p, v }) => <label className="bundle-item" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={e => setSelected(s => e.target.checked ? [...s, p.id] : s.filter(id => id !== p.id))}/><span>{p.name} · {v.color}</span><b>{money(v.price)}</b></label>)}<button className="button-dark" disabled={busy || !variant.availableStock || main.isDemo} onClick={add}>{busy ? 'Agregando…' : `Agregar set · ${money(total)}`}</button>{error && <p role="alert" className="inline-error">{error}</p>}</div></section>;
}
