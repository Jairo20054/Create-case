'use client';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Nav, ProductGrid } from './storefront';
import { money } from '@/lib/catalog';
import { CheckCircle2, Minus, Plus, Trash2 } from 'lucide-react';
import { StoreOrder, useStore } from './store-provider';
export function SimplePage({ kind }: {
    kind: string;
}) {
    const { products } = useStore();
    const title = kind.toUpperCase();
    if (kind === 'accessories' || kind === 'favorites')
        return <><Nav /><main className="light-page px-5 pb-20 pt-32 md:px-10"><p className="eyebrow text-clay">ALTER / CASE</p><h1 className="font-display mt-3 text-6xl tracking-tighter md:text-8xl">{title}</h1><div className="mt-12">{kind === 'accessories' ? <ProductGrid list={products.filter(p => p.category === 'ACCESSORIES')}/> : <Empty />}</div></main></>;
    if (kind === 'cart')
        return <CartPage />;
    if (kind === 'checkout')
        return <Checkout />;
    return <><Nav /><main className="light-page px-5 pt-32"><h1 className="font-display text-7xl">{title}</h1></main></>;
}
function Empty() { return <div className="grid min-h-72 place-items-center border border-dashed border-black/20 text-center text-muted">Aún no hay piezas aquí.<br /><Link href="/shop" className="mt-4 inline-block border-b border-clay pb-1 text-clay">EXPLORAR TIENDA</Link></div>; }
function CartPage() { const { cart, updateCart, removeFromCart } = useStore(); const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0); return <><Nav /><main className="light-page min-h-screen px-5 pb-20 pt-32 md:px-10"><p className="eyebrow text-clay">TU SELECCIÓN</p><h1 className="font-display mt-3 text-6xl tracking-tighter md:text-8xl">CARRITO</h1>{!cart.length ? <div className="mt-12"><Empty /></div> : <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]"><div>{cart.map(item => <div className="grid grid-cols-[90px_1fr] gap-4 border-t border-black/15 py-5 md:grid-cols-[120px_1fr]" key={item.id}><div className="relative h-28 bg-stone"><Image src={item.image} alt={item.name} fill className="object-contain"/></div><div><div className="flex justify-between"><div><b>{item.name}</b><p className="mt-1 text-xs text-muted">{item.model} · {item.color}</p></div><button onClick={() => removeFromCart(item.id)}><Trash2 size={17}/></button></div><div className="mt-6 flex items-center justify-between"><div className="flex items-center border border-black/15"><button onClick={() => updateCart(item.id, item.qty - 1)} className="p-2"><Minus size={13}/></button><span className="px-2 text-sm">{item.qty}</span><button onClick={() => updateCart(item.id, item.qty + 1)} className="p-2"><Plus size={13}/></button></div><b>{money(item.price * item.qty)}</b></div></div></div>)}</div><OrderSummary subtotal={subtotal}/></div>}</main></>; }
function OrderSummary({ subtotal }: {
    subtotal: number;
}) { return <aside className="h-fit bg-stone p-6"><p className="eyebrow text-clay">RESUMEN</p><div className="mt-8 space-y-3 text-sm"><p className="flex justify-between"><span>Subtotal</span><b>{money(subtotal)}</b></p><p className="flex justify-between"><span>Envío</span><span>Calculado al finalizar</span></p></div><div className="my-6 border-t border-black/15"/><p className="flex justify-between text-lg font-bold"><span>TOTAL</span><span>{money(subtotal)}</span></p><Link href="/checkout" className="button-dark mt-6 block text-center">CONTINUAR</Link></aside>; }
function Checkout() { const { cart, createOrder } = useStore(); const [done, setDone] = useState<StoreOrder | null>(null); const [error, setError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false); const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0); async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setError(null); setSubmitting(true); const data = new FormData(e.currentTarget); try {
    setDone(await createOrder({ customer: String(data.get('customer')), phone: String(data.get('phone')), email: String(data.get('email')), address: String(data.get('address')), city: String(data.get('city')), payment: 'Pendiente de confirmación' }));
}
catch (cause) {
    setError(cause instanceof Error ? cause.message : 'No fue posible validar el pedido.');
}
finally {
    setSubmitting(false);
} } if (done)
    return <><Nav /><main className="light-page grid min-h-screen place-items-center px-5 pt-20"><div className="max-w-lg text-center"><CheckCircle2 className="mx-auto text-clay" size={48}/><p className="eyebrow mt-6 text-clay">PEDIDO RECIBIDO</p><h1 className="font-display mt-3 text-6xl">GRACIAS</h1><p className="mt-5 text-muted">Tu solicitud <b className="text-charcoal">{done.id}</b> quedó registrada en el servidor. El pedido está pendiente de confirmación; no se ha cobrado ningún pago.</p><p className="mt-6 text-sm">Total del pedido: <b>{money(done.total)}</b></p><Link className="mt-5 block text-xs underline" href="/shop">VOLVER A LA TIENDA</Link></div></main></>; return <><Nav /><main className="light-page mx-auto min-h-screen max-w-6xl px-5 pb-20 pt-32"><p className="eyebrow text-clay">ÚLTIMO PASO</p><h1 className="font-display mt-3 text-6xl md:text-8xl">FINALIZAR COMPRA</h1>{!cart.length ? <div className="mt-10"><Empty /></div> : <div className="mt-10 grid gap-10 md:grid-cols-[1fr_420px]"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="field sm:col-span-2">Nombre completo<input required name="customer"/></label><label className="field">Teléfono<input required name="phone" type="tel"/></label><label className="field">Correo<input required name="email" type="email"/></label><label className="field">Ciudad<input required name="city"/></label><label className="field sm:col-span-2">Dirección de entrega<input required name="address"/></label><p className="sm:col-span-2 text-sm text-muted">Esta solicitud reserva las unidades disponibles. El pago y el envío quedan pendientes de confirmación. No se realizará ningún cobro automático.</p>{error && <p role="alert" className="text-clay sm:col-span-2">{error}</p>}<button disabled={submitting} className="button-clay sm:col-span-2 disabled:opacity-50">{submitting ? 'VALIDANDO PRECIO, STOCK Y COMPATIBILIDAD…' : `CREAR PEDIDO · ${money(subtotal)}`}</button><p className="text-xs text-muted sm:col-span-2">Tus datos se utilizarán para gestionar el pedido. Verifica la información antes de continuar.</p></form><aside className="h-fit bg-stone p-6"><p className="eyebrow text-clay">TU PEDIDO / {cart.reduce((n, i) => n + i.qty, 0)} PIEZAS</p>{cart.map(i => <div key={i.id} className="mt-5 flex justify-between gap-4 border-b border-black/10 pb-4 text-sm"><span>{i.qty} × {i.name}<small className="mt-1 block text-muted">{i.model} · {i.color}</small></span><b>{money(i.price * i.qty)}</b></div>)}<p className="mt-6 flex justify-between text-lg font-bold"><span>TOTAL</span><span>{money(subtotal)}</span></p></aside></div>}</main></>; }
