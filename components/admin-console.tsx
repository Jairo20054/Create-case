'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, LogOut, Plus, RefreshCw } from 'lucide-react';
import { money } from '@/lib/catalog';
import { getBrowserSupabase } from '@/lib/browser/supabase';
import { useStore } from './store-provider';

export type AdminSection = 'overview' | 'products' | 'inventory' | 'orders' | 'customers' | 'collections';

type AdminVariant = {
  id: string; sku: string; name: string | null; color: string; price: number;
  imageUrl: string | null; quantity: number; reservedQuantity: number; lowStockThreshold: number;
  deviceIds: string[]; brandIds: string[];
};
type AdminProduct = {
  id: string; slug: string; name: string; description: string; productType: string;
  compatibilityMode: string; isActive: boolean; isFeatured: boolean; isDemo: boolean;
  variants: AdminVariant[];
};
type Order = { id: string; orderNumber: string; status: string; subtotal: number; createdAt: string; itemsCount: number };
type Gate = 'loading' | 'authorized' | 'login' | 'forbidden' | 'unconfigured' | 'error';

const nav: { id: AdminSection; name: string; href: string }[] = [
  { id: 'overview', name: 'Resumen', href: '/admin' },
  { id: 'products', name: 'Productos', href: '/admin/products' },
  { id: 'inventory', name: 'Inventario', href: '/admin/inventory' },
  { id: 'orders', name: 'Pedidos', href: '/admin/orders' },
  { id: 'collections', name: 'Colecciones', href: '/admin/collections' },
  { id: 'customers', name: 'Clientes', href: '/admin/customers' },
];

const client = getBrowserSupabase();
export function AdminConsole({ section }: { section: AdminSection }) {
  const { devices, refreshCatalog } = useStore();
  const [gate, setGate] = useState<Gate>('loading');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState<{ productId: string; variant: AdminVariant } | null>(null);

  async function authenticatedFetch(url: string, init?: RequestInit) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError || !data.session) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
    return fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${data.session.access_token}` }, cache: 'no-store' });
  }

  async function reload() {
    const [response, ordersResponse] = await Promise.all([
      authenticatedFetch('/api/admin/products'),
      authenticatedFetch('/api/admin/orders'),
    ]);
    if (response.status === 401 || ordersResponse.status === 401) { setGate('login'); return; }
    if (response.status === 403 || ordersResponse.status === 403) { setGate('forbidden'); return; }
    const productBody = await response.json();
    const ordersBody = await ordersResponse.json();
    if (!response.ok) throw new Error(productBody.error?.message || 'No se pudieron consultar los productos.');
    if (!ordersResponse.ok) throw new Error(ordersBody.error?.message || 'No se pudieron consultar los pedidos.');
    setProducts(productBody.products || []);
    setOrders(ordersBody.orders || []);
    setGate('authorized');
  }

  useEffect(() => {
    let disposed = false;
    (async () => {
      if (!client) { setGate('unconfigured'); return; }
      try {
        const { data } = await client.auth.getSession();
        if (!data.session) { if (!disposed) setGate('login'); return; }
        if (!disposed) await reload();
      } catch (cause) {
        if (!disposed) { setError(cause instanceof Error ? cause.message : 'Error al consultar la tienda.'); setGate('error'); }
      }
    })();
    return () => { disposed = true; };
  }, []);

  async function mutate(url: string, method: 'PATCH' | 'POST', data: object) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await authenticatedFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'No fue posible guardar los cambios.');
      await reload(); refreshCatalog();
      setNotice('Cambios guardados en el servidor.');
      setEditing(null); setCreate(false);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al guardar.');
      return false;
    } finally { setBusy(false); }
  }

  async function uploadPhoto(file: File) {
    const form = new FormData();
    form.set('file', file);
    const response = await authenticatedFetch('/api/admin/images', { method: 'POST', body: form });
    const body = await response.json();
    if (!response.ok || typeof body.imageUrl !== 'string') throw new Error(body.error?.message || 'Error al subir la fotografía.');
    return body.imageUrl as string;
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const description = String(form.get('description') || '').trim();
    const sku = String(form.get('sku') || '').trim();
    const color = String(form.get('color') || '').trim();
    const price = Number(form.get('price'));
    const quantity = Number(form.get('quantity'));
    const deviceId = String(form.get('deviceId') || '');
    if (!name || !description || sku.length < 3 || !color || !deviceId ||
        !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(quantity) || quantity < 0) {
      setError('Completa el nombre, SKU, descripción, modelo, precio y unidades correctamente.'); return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const file = form.get('photo');
      const imageUrl = file instanceof File && file.size ? await uploadPhoto(file) : undefined;
      const slugBase = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'case';
      const slug = `${slugBase}-${Date.now().toString(36)}`;
      const input = {
        name, slug, description, productType: 'CASE', compatibilityMode: 'DEVICE_SPECIFIC',
        isDemo: false, isActive: true, isFeatured: false, technologyTags: [],
        variants: [{
          sku, color, price, quantity, reservedQuantity: 0, lowStockThreshold: 5,
          deviceIds: [deviceId], brandIds: [], requiredCapabilities: [], ...(imageUrl ? { imageUrl } : {}),
        }],
      };
      const response = await authenticatedFetch('/api/admin/products', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'No se pudo crear el case.');
      await reload(); refreshCatalog();
      setCreate(false); setNotice('Case creado y publicado con compatibilidad exacta.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el case.');
    } finally { setBusy(false); }
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    const form = new FormData(event.currentTarget);
    const price = Number(form.get('price'));
    const quantity = Number(form.get('quantity'));
    if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(quantity) ||
        quantity < editing.variant.reservedQuantity) {
      setError('El precio debe ser válido y el stock no puede ser menor a las unidades reservadas.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const file = form.get('photo');
      const imageUrl = file instanceof File && file.size ? await uploadPhoto(file) : undefined;
      const response = await authenticatedFetch(`/api/admin/variants/${editing.variant.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price, quantity, ...(imageUrl ? { imageUrl } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'No fue posible actualizar la variante.');
      await reload(); refreshCatalog(); setEditing(null); setNotice('Inventario y precio guardados.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar.');
    } finally { setBusy(false); }
  }

  async function signOut() { await client?.auth.signOut(); setGate('login'); }

  const variants = useMemo(() => products.flatMap(p => p.variants.map(v => ({ product: p, variant: v }))), [products]);
  const available = variants.reduce((s, item) => s + Math.max(0, item.variant.quantity - item.variant.reservedQuantity), 0);
  const low = variants.filter(item => item.variant.quantity - item.variant.reservedQuantity <= item.variant.lowStockThreshold).length;

  return <div className="admin-v2">
    <header className="admin-v2-header">
      <Link href="/admin" className="admin-v2-brand">ALTER<span>/</span>CASE <small>ADMIN</small></Link>
      <nav aria-label="Acciones del administrador">
        <Link href="/shop">Ver tienda <ArrowUpRight size={14} className="inline"/></Link>
        {gate === 'authorized' && <button onClick={signOut}><LogOut size={15} className="inline"/> Salir</button>}
      </nav>
    </header>
    {gate !== 'authorized' ? <main className="gate"><div>
      <h1>{gate === 'loading' ? 'Verificando acceso…' : gate === 'forbidden' ? 'Acceso restringido' :
        gate === 'login' ? 'Inicia sesión para administrar.' : gate === 'unconfigured' ? 'Falta configurar la autenticación.' : 'No se pudo abrir el panel.'}</h1>
      <p>{gate === 'forbidden' ? 'Esta cuenta no tiene el rol ADMIN en ALTER / CASE.' :
        gate === 'unconfigured' ? 'Conecta únicamente el proyecto Supabase de ALTER / CASE.' :
        gate === 'error' ? error : 'El inventario y los pedidos solo son visibles para administradores autorizados.'}</p>
      {gate !== 'loading' && <Link href="/login" className="button-dark">Ir a iniciar sesión</Link>}
    </div></main> :
    <main className="admin-v2-main">
      <div className="admin-v2-top"><div><p className="eyebrow">PANEL ADMINISTRATIVO / DATOS REALES</p><h1>Control de tu tienda.</h1><p className="muted">Gestiona el catálogo y las existencias sin editar código.</p></div>
        <button className="action-light" onClick={async () => { try { await reload(); setNotice('Datos actualizados.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error al actualizar.'); } }}><RefreshCw size={16} className="inline"/> Actualizar</button>
      </div>
      <nav className="admin-v2-tabs" aria-label="Secciones del panel">
        {nav.map(item => <Link key={item.id} href={item.href} aria-current={section === item.id ? 'page' : undefined}>{item.name}</Link>)}
      </nav>
      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-v2-metrics">
        <Metric title="Productos activos" value={String(products.filter(p => p.isActive && !p.isDemo).length)}/>
        <Metric title="Variantes" value={String(variants.length)}/>
        <Metric title="Unidades disponibles" value={String(available)}/>
        <Metric title="Stock bajo o agotado" value={String(low)}/>
      </div>
      {(section === 'overview' || section === 'products' || section === 'inventory') && <>
        <section className="admin-v2-panel">
          <div className="admin-v2-panel-heading"><div><h2>{section === 'inventory' ? 'Inventario por variante' : 'Catálogo de productos'}</h2><p className="muted">Los datos proceden de PostgreSQL, no del almacenamiento del navegador.</p></div>
            {section !== 'inventory' && <button className="action-primary" onClick={() => { setEditing(null); setCreate(!create); }}><Plus size={17} className="inline"/> {create ? 'Cerrar formulario' : 'Agregar case'}</button>}
          </div>
          {create && <form className="admin-v2-form" onSubmit={createProduct}>
            <label>Nombre del case<input required minLength={2} maxLength={160} name="name" placeholder="Nombre comercial"/></label>
            <label>SKU único<input required minLength={3} maxLength={80} name="sku" placeholder="CASE-001"/></label>
            <label className="wide">Descripción<textarea required name="description" placeholder="Materiales, protección, características reales…"/></label>
            <label>Modelo compatible<select name="deviceId" required defaultValue=""><option value="">Selecciona el modelo exacto</option>
              {devices.map(device => <option key={device.id} value={device.id}>{device.brand.name} · {device.name}</option>)}
            </select></label>
            <label>Color<input name="color" required maxLength={60} placeholder="Negro mate"/></label>
            <label>Precio (COP)<input type="number" required min={0} step={1} name="price"/></label>
            <label>Unidades disponibles<input type="number" required min={0} step={1} name="quantity"/></label>
            <label className="wide">Fotografía (JPG, PNG o WebP, máximo 5 MB)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"/></label>
            <p className="wide muted">Las fotos se guardan en Supabase Storage. Si Storage no está configurado, crea el producto sin foto y agrégala cuando se habilite.</p>
            <button className="action-primary wide" disabled={busy || !devices.length}>{busy ? 'Guardando…' : 'Guardar y publicar case'}</button>
          </form>}
          {editing && <form className="admin-v2-form" onSubmit={saveVariant}>
            <h2 className="wide">Editar SKU {editing.variant.sku}</h2>
            <label>Precio (COP)<input key={editing.variant.id + '-price'} name="price" type="number" required min={0} step={1} defaultValue={editing.variant.price}/></label>
            <label>Inventario físico<input key={editing.variant.id + '-quantity'} name="quantity" type="number" required min={editing.variant.reservedQuantity} step={1} defaultValue={editing.variant.quantity}/></label>
            <p className="wide muted">Reservadas: {editing.variant.reservedQuantity}. No podrás disminuir el inventario por debajo de esa cifra.</p>
            <label className="wide">Sustituir fotografía (opcional)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"/></label>
            <div className="wide flex gap-3"><button className="action-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><button type="button" className="action-light" onClick={() => setEditing(null)}>Cancelar</button></div>
          </form>}
          <div className="admin-v2-table-wrap"><table><thead><tr><th>Producto / SKU</th><th>Modelo / Color</th><th>Precio</th><th>Disponible</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
            {variants.map(({ product, variant }) => {
              const stock = Math.max(0, variant.quantity - variant.reservedQuantity);
              return <tr key={variant.id}>
                <td><strong>{product.name}</strong><small>{variant.sku}</small></td>
                <td>{variant.color}<small>{variant.deviceIds.length} modelo(s) exactos</small></td>
                <td>{money(variant.price)}</td><td>{stock}</td>
                <td><span className={`status-tag ${stock <= variant.lowStockThreshold || !product.isActive ? 'low' : ''}`}>{!product.isActive ? 'Archivado' : stock === 0 ? 'Agotado' : stock <= variant.lowStockThreshold ? 'Stock bajo' : 'Disponible'}</span></td>
                <td><button className="action-light" onClick={() => { setCreate(false); setEditing({ productId: product.id, variant }); }}>Editar</button>{' '}
                  <button className="action-danger" disabled={busy} onClick={() => { if (window.confirm(product.isActive ? '¿Retirar este producto de la tienda?' : '¿Volver a publicar este producto?')) mutate(`/api/admin/products/${product.id}`, 'PATCH', { isActive: !product.isActive }); }}>
                    {product.isActive ? 'Archivar' : 'Publicar'}</button></td>
              </tr>;
            })}
          </tbody></table></div>
          {!variants.length && <p className="muted">Todavía no hay productos en la base de datos. Añade el primer case desde este panel.</p>}
        </section>
      </>}
      {section === 'orders' && <section className="admin-v2-panel"><h2>Pedidos registrados</h2><p className="muted">Se muestran pedidos persistidos en PostgreSQL. Un pedido pendiente no equivale a un pago confirmado.</p>
        <div className="admin-v2-table-wrap"><table><thead><tr><th>Número</th><th>Fecha</th><th>Artículos</th><th>Subtotal</th><th>Estado</th></tr></thead><tbody>
          {orders.map(order => <tr key={order.id}><td>{order.orderNumber}</td><td>{new Date(order.createdAt).toLocaleDateString('es-CO')}</td><td>{order.itemsCount}</td><td>{money(order.subtotal)}</td><td>{order.status}</td></tr>)}
        </tbody></table></div>{!orders.length && <p className="muted">No hay pedidos persistidos todavía.</p>}
      </section>}
      {(section === 'collections' || section === 'customers') && <section className="admin-v2-panel"><h2>{section === 'collections' ? 'Colecciones' : 'Clientes'}</h2><p className="muted">Este módulo requiere completar su API y política de permisos antes de habilitar edición. No se muestran datos de prueba como si fueran reales.</p></section>}
    </main>}
  </div>;
}
function Metric({ title, value }: { title: string; value: string }) {
  return <div className="admin-v2-metric"><span>{title}</span><strong>{value}</strong></div>;
}
