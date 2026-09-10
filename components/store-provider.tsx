'use client';
import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import type { CatalogDevice, CatalogResponse, Product } from '@/lib/catalog';
export type CartItem = {
    id: string;
    productVariantId: string;
    deviceId: string;
    slug: string;
    name: string;
    price: number;
    image: string;
    color: string;
    model: string;
    qty: number;
    availableStock: number;
};
export type StoreOrder = {
    id: string;
    createdAt: string;
    customer: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    payment: string;
    total: number;
    status: 'Nuevo' | 'Confirmado' | 'Enviado';
    items: CartItem[];
};
type StoreContextValue = {
    products: Product[];
    selectedDeviceId: string;
    setSelectedDeviceId: (id: string) => void;
    favorites: string[];
    toggleFavorite: (id: string) => void;
    refreshCatalog: () => void;
    devices: CatalogDevice[];
    catalogLoading: boolean;
    catalogError: string | null;
    cart: CartItem[];
    orders: StoreOrder[];
    cartOpen: boolean;
    setCartOpen: (open: boolean) => void;
    addToCart: (product: Product, variantId: string, deviceId: string, qty?: number) => Promise<void>;
    addSetToCart: (items: {
        product: Product;
        variantId: string;
    }[], deviceId: string) => Promise<void>;
    updateCart: (id: string, qty: number) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    createOrder: (details: Omit<StoreOrder, 'id' | 'createdAt' | 'total' | 'status' | 'items'>) => Promise<StoreOrder>;
    updateOrderStatus: (id: string, status: StoreOrder['status']) => void;
};
const StoreContext = createContext<StoreContextValue | null>(null);
const read = <T,>(key: string, fallback: T): T => { try {
    const value = localStorage.getItem(key);
    if (!value)
        return fallback;
    const parsed = JSON.parse(value);
    return (Array.isArray(fallback) ? Array.isArray(parsed) : typeof parsed === typeof fallback) ? parsed as T : fallback;
}
catch {
    return fallback;
} };
export function StoreProvider({ children }: {
    children: React.ReactNode;
}) {
    const [ready, setReady] = useState(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [revision, setRevision] = useState(0);
    const mutations = useRef(new Set<string>());
    const [products, setProducts] = useState<Product[]>([]);
    const [devices, setDevices] = useState<CatalogDevice[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orders, setOrders] = useState<StoreOrder[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    useEffect(() => {
        setCart(read('alter_cart', []));
        setSelectedDeviceId(read('alter_device', ''));
        setFavorites(read('alter_favorites', []));
        setOrders(read('alter_orders', []));
        setReady(true);
    }, []);
    useEffect(() => {
        setCatalogLoading(true);
        setCatalogError(null);
        const controller = new AbortController();
        fetch('/api/catalog/products', { signal: controller.signal })
            .then(async (response) => {
            const body = await response.json() as CatalogResponse & {
                error?: {
                    message?: string;
                };
            };
            if (!response.ok)
                throw new Error(body.error?.message || 'No fue posible cargar el catálogo.');
            setProducts(body.products);
            setDevices(body.devices);
        })
            .catch(error => { if (error instanceof Error && error.name !== 'AbortError')
            setCatalogError(error.message); })
            .finally(() => { if (!controller.signal.aborted)
            setCatalogLoading(false); });
        return () => controller.abort();
    }, [revision]);
    useEffect(() => { if (ready) {
        try {
            localStorage.setItem('alter_cart', JSON.stringify(cart));
        }
        catch { }
    } }, [cart, ready]);
    useEffect(() => { if (ready) {
        try {
            localStorage.setItem('alter_device', JSON.stringify(selectedDeviceId));
            localStorage.setItem('alter_favorites', JSON.stringify(favorites));
        }
        catch { }
    } }, [selectedDeviceId, favorites, ready]);
    useEffect(() => { if (ready) {
        try {
            localStorage.setItem('alter_orders', JSON.stringify(orders));
        }
        catch { }
    } }, [orders, ready]);
    const value = useMemo<StoreContextValue>(() => ({
        selectedDeviceId, setSelectedDeviceId, favorites, toggleFavorite(id) { setFavorites(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]); }, refreshCatalog() { setRevision(n => n + 1); },
        products, devices, catalogLoading, catalogError, cart, orders, cartOpen, setCartOpen,
        async addToCart(product, variantId, deviceId, qty = 1) {
            if (product.isDemo)
                throw new Error('Los productos DEMO no están disponibles para compra.');
            if (mutations.current.has(variantId))
                return;
            mutations.current.add(variantId);
            try {
                const existing = cart.find(item => item.productVariantId === variantId && item.deviceId === deviceId);
                const requestedQuantity = (existing?.qty ?? 0) + qty;
                const response = await fetch('/api/cart/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productVariantId: variantId, deviceId, quantity: requestedQuantity }) });
                const body = await response.json() as {
                    item?: {
                        variantId: string;
                        deviceId: string;
                        quantity: number;
                        unitPrice: number;
                        availableStock: number;
                        color: string;
                    };
                    error?: {
                        message?: string;
                    };
                };
                if (!response.ok || !body.item)
                    throw new Error(body.error?.message || 'No fue posible validar esta referencia.');
                const variant = product.variants.find(item => item.id === body.item!.variantId);
                const device = devices.find(item => item.id === body.item!.deviceId);
                if (!variant || !device)
                    throw new Error('La referencia o el dispositivo ya no están disponibles.');
                const id = `${variant.id}__${device.id}`;
                setCart(current => {
                    const found = current.find(item => item.id === id);
                    const nextQuantity = Math.min(body.item!.availableStock, body.item!.quantity);
                    const next: CartItem = { id, productVariantId: variant.id, deviceId: device.id, slug: product.slug, name: product.name, price: body.item!.unitPrice, image: variant.imageUrl || product.image, color: variant.color, model: device.name, qty: nextQuantity, availableStock: body.item!.availableStock };
                    return found ? current.map(item => item.id === id ? next : item) : [...current, next];
                });
                setCartOpen(true);
            }
            finally {
                mutations.current.delete(variantId);
            }
        },
        async addSetToCart(items, deviceId) {
            if (mutations.current.size)
                throw new Error('Espera a que termine la selección anterior.');
            if (items.some(item => item.product.isDemo))
                throw new Error('Los productos DEMO no están disponibles para compra.');
            mutations.current.add('bundle');
            try {
                const requested = items.map(({ variantId }) => ({ productVariantId: variantId, deviceId, quantity: (cart.find(c => c.productVariantId === variantId && c.deviceId === deviceId)?.qty ?? 0) + 1 }));
                const response = await fetch('/api/cart/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: requested }) });
                const body = await response.json();
                if (!response.ok || !body.items)
                    throw new Error(body.error?.message || 'No fue posible validar el set.');
                const device = devices.find(d => d.id === deviceId);
                if (!device)
                    throw new Error('Selecciona un dispositivo disponible.');
                const additions: CartItem[] = items.map(({ product, variantId }) => {
                    const variant = product.variants.find(v => v.id === variantId)!;
                    const valid = body.items.find((i: {
                        variantId: string;
                        deviceId: string;
                    }) => i.variantId === variantId && i.deviceId === deviceId);
                    if (!valid)
                        throw new Error('No fue posible validar todos los artículos.');
                    return { id: `${variantId}__${deviceId}`, productVariantId: variantId, deviceId, slug: product.slug, name: product.name, price: valid.unitPrice, image: variant.imageUrl || product.image, color: variant.color, model: device.name, qty: valid.quantity, availableStock: valid.availableStock };
                });
                setCart(current => [...current.filter(c => !additions.some(a => a.id === c.id)), ...additions]);
                setCartOpen(true);
            }
            finally {
                mutations.current.delete('bundle');
            }
        },
        updateCart(id, qty) { setCart(current => qty <= 0 ? current.filter(item => item.id !== id) : current.map(item => item.id === id ? { ...item, qty: Math.min(item.availableStock, qty) } : item)); },
        removeFromCart(id) { setCart(current => current.filter(item => item.id !== id)); },
        clearCart() { setCart([]); },
        async createOrder(details) {
            const response = await fetch('/api/cart/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: cart.map(item => ({ productVariantId: item.productVariantId, deviceId: item.deviceId, quantity: item.qty })) }) });
            const body = await response.json() as {
                subtotal?: number;
                items?: Array<{
                    variantId: string;
                    deviceId: string;
                    unitPrice: number;
                }>;
                error?: {
                    message?: string;
                };
            };
            if (!response.ok || body.subtotal === undefined || !body.items)
                throw new Error(body.error?.message || 'No fue posible validar el carrito.');
            const validatedItems = cart.map(item => ({ ...item, price: body.items!.find(valid => valid.variantId === item.productVariantId && valid.deviceId === item.deviceId)?.unitPrice ?? item.price }));
            const order: StoreOrder = { ...details, id: `AC-${String(Date.now()).slice(-6)}`, createdAt: new Date().toISOString(), total: body.subtotal, status: 'Nuevo', items: validatedItems };
            setOrders(current => [order, ...current]);
            setCart([]);
            return order;
        },
        updateOrderStatus(id, status) { setOrders(current => current.map(order => order.id === id ? { ...order, status } : order)); },
    }), [selectedDeviceId, favorites, products, devices, catalogLoading, catalogError, cart, orders, cartOpen]);
    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() { const context = useContext(StoreContext); if (!context)
    throw new Error('useStore debe estar dentro de StoreProvider'); return context; }
