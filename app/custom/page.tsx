'use client';
import { useEffect, useState } from 'react';
import { Nav, Footer } from '@/components/storefront';
import { ProductPhoto } from '@/components/commerce-ui';
import { useStore } from '@/components/store-provider';
export default function Page() {
    const { products } = useStore();
    const [text, setText] = useState('TU ESTILO.'), [color, setColor] = useState('#171717'), [font, setFont] = useState('sans-serif'), [size, setSize] = useState(32), [rotation, setRotation] = useState(0), [photo, setPhoto] = useState(''), [x, setX] = useState(50), [y, setY] = useState(55), [background, setBackground] = useState('#eeeae3'), [message, setMessage] = useState(''), [base, setBase] = useState('');
    const product = products.find(p => p.id === base) ?? products.find(p => p.productType === 'CASE' && p.image);
    useEffect(() => { return () => { if (photo)
        URL.revokeObjectURL(photo); }; }, [photo]);
    function save() { const design = { text, color, font, size, rotation, x, y, background, productId: product?.id }; try {
        localStorage.setItem('alter_studio_design', JSON.stringify(design));
        setMessage('Composición guardada en este dispositivo. La fotografía debe cargarse de nuevo al abrir el estudio.');
    }
    catch {
        setMessage('No fue posible guardar en este navegador.');
    } }
    useEffect(() => { try {
        const saved = JSON.parse(localStorage.getItem('alter_studio_design') || 'null');
        if (saved) {
            setText(saved.text);
            setColor(saved.color);
            setFont(saved.font);
            setSize(saved.size);
            setRotation(saved.rotation);
            setX(saved.x);
            setY(saved.y);
            setBackground(saved.background);
            setBase(saved.productId ?? '');
        }
    }
    catch { } }, []);
    return <><Nav /><main id="main-content" className="page-shell"><p className="eyebrow">ALTER STUDIO / EXPLORA TU IDEA</p><h1 className="page-title">Hazlo tuyo.</h1><p className="muted">Estudio de composición. La fabricación personalizada aún no está habilitada para compra.</p><div className="studio-layout"><section className="filter-controls"><label>Base<select value={product?.id ?? ''} onChange={e => setBase(e.target.value)}><option value="">Seleccionar case</option>{products.filter(p => p.productType === 'CASE' && p.image).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Tu texto<input maxLength={40} value={text} onChange={e => setText(e.target.value)}/></label><label>Tipografía<select value={font} onChange={e => setFont(e.target.value)}><option value="sans-serif">Moderna</option><option value="serif">Editorial</option><option value="monospace">Técnica</option></select></label><label>Color del texto<input type="color" value={color} onChange={e => setColor(e.target.value)}/></label><label>Fondo<input type="color" value={background} onChange={e => setBackground(e.target.value)}/></label><label>Tamaño<input type="range" min="12" max="60" value={size} onChange={e => setSize(+e.target.value)}/></label><label>Rotación<input type="range" min="-180" max="180" value={rotation} onChange={e => setRotation(+e.target.value)}/></label><label>Posición horizontal<input type="range" min="15" max="85" value={x} onChange={e => setX(+e.target.value)}/></label><label>Posición vertical<input type="range" min="15" max="85" value={y} onChange={e => setY(+e.target.value)}/></label><label>Tu fotografía<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (!file)
        return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        setMessage('Selecciona un JPG, PNG o WebP de máximo 5 MB.');
        return;
    } setPhoto(URL.createObjectURL(file)); setMessage(''); }}/></label>{photo && <button className="text-link" onClick={() => setPhoto('')}>Quitar fotografía</button>}<button className="button-dark" onClick={save}>Guardar composición</button>{message && <p role="status">{message}</p>}</section><section className="studio-preview" style={{ background }} aria-label="Vista previa de la composición">{product && <ProductPhoto src={product.image} alt={product.alt}/>}<div className="studio-design" style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${rotation}deg)`, fontFamily: font, fontSize: size, color }}>{photo && <div className="studio-upload"><ProductPhoto src={photo} alt="Tu fotografía"/></div>}<span>{text}</span></div><span className="studio-preview-label">VISTA PREVIA DE COMPOSICIÓN</span></section></div></main><Footer /></>;
}
