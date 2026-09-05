'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
export type StoreOrder = {id:string;createdAt:string;customer:string;phone:string;email:string;address:string;city:string;payment:string;total:number;status:'Nuevo'|'Confirmado'|'Enviado';items:CartItem[]};
type StoreContextValue = {
  products: Product[];
  devices: CatalogDevice[];
  catalogLoading: boolean;
  catalogError: string | null;
  cart: CartItem[];
  orders: StoreOrder[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variantId: string, deviceId: string, qty?: number) => Promise<void>;
  updateCart: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  createOrder: (details: Omit<StoreOrder,'id'|'createdAt'|'total'|'status'|'items'>) => Promise<StoreOrder>;
  updateOrderStatus: (id:string,status:StoreOrder['status']) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const read = <T,>(key:string,fallback:T):T => {try{const value=localStorage.getItem(key);return value?JSON.parse(value) as T:fallback}catch{return fallback}};

export function StoreProvider({children}:{children:React.ReactNode}){
  const [ready,setReady]=useState(false);
  const [products,setProducts]=useState<Product[]>([]);
  const [devices,setDevices]=useState<CatalogDevice[]>([]);
  const [catalogLoading,setCatalogLoading]=useState(true);
  const [catalogError,setCatalogError]=useState<string|null>(null);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [orders,setOrders]=useState<StoreOrder[]>([]);
  const [cartOpen,setCartOpen]=useState(false);

  useEffect(()=>{
    setCart(read('alter_cart',[]));
    setOrders(read('alter_orders',[]));
    setReady(true);
    const controller=new AbortController();
    fetch('/api/catalog/products?includeDemo=true',{signal:controller.signal})
      .then(async response=>{
        const body=await response.json() as CatalogResponse & {error?:{message?:string}};
        if(!response.ok)throw new Error(body.error?.message||'No fue posible cargar el catálogo.');
        setProducts(body.products);
        setDevices(body.devices);
      })
      .catch(error=>{if(error instanceof Error&&error.name!=='AbortError')setCatalogError(error.message)})
      .finally(()=>setCatalogLoading(false));
    return()=>controller.abort();
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem('alter_cart',JSON.stringify(cart))},[cart,ready]);
  useEffect(()=>{if(ready)localStorage.setItem('alter_orders',JSON.stringify(orders))},[orders,ready]);

  const value=useMemo<StoreContextValue>(()=>({
    products,devices,catalogLoading,catalogError,cart,orders,cartOpen,setCartOpen,
    async addToCart(product,variantId,deviceId,qty=1){
      const existing=cart.find(item=>item.productVariantId===variantId&&item.deviceId===deviceId);
      const requestedQuantity=(existing?.qty??0)+qty;
      const response=await fetch('/api/cart/items',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productVariantId:variantId,deviceId,quantity:requestedQuantity})});
      const body=await response.json() as {item?:{variantId:string;deviceId:string;quantity:number;unitPrice:number;availableStock:number;color:string};error?:{message?:string}};
      if(!response.ok||!body.item)throw new Error(body.error?.message||'No fue posible validar esta referencia.');
      const variant=product.variants.find(item=>item.id===body.item!.variantId);
      const device=devices.find(item=>item.id===body.item!.deviceId);
      if(!variant||!device)throw new Error('La referencia o el dispositivo ya no están disponibles.');
      const id=`${variant.id}__${device.id}`;
      setCart(current=>{
        const found=current.find(item=>item.id===id);
        const nextQuantity=Math.min(body.item!.availableStock,body.item!.quantity);
        const next:CartItem={id,productVariantId:variant.id,deviceId:device.id,slug:product.slug,name:product.name,price:body.item!.unitPrice,image:variant.imageUrl||product.image,color:variant.color,model:device.name,qty:nextQuantity,availableStock:body.item!.availableStock};
        return found?current.map(item=>item.id===id?next:item):[...current,next];
      });
      setCartOpen(true);
    },
    updateCart(id,qty){setCart(current=>qty<=0?current.filter(item=>item.id!==id):current.map(item=>item.id===id?{...item,qty:Math.min(item.availableStock,qty)}:item))},
    removeFromCart(id){setCart(current=>current.filter(item=>item.id!==id))},
    clearCart(){setCart([])},
    async createOrder(details){
      const response=await fetch('/api/cart/validate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:cart.map(item=>({productVariantId:item.productVariantId,deviceId:item.deviceId,quantity:item.qty}))})});
      const body=await response.json() as {subtotal?:number;items?:Array<{variantId:string;deviceId:string;unitPrice:number}>;error?:{message?:string}};
      if(!response.ok||body.subtotal===undefined||!body.items)throw new Error(body.error?.message||'No fue posible validar el carrito.');
      const validatedItems=cart.map(item=>({...item,price:body.items!.find(valid=>valid.variantId===item.productVariantId&&valid.deviceId===item.deviceId)?.unitPrice??item.price}));
      const order:StoreOrder={...details,id:`AC-${String(Date.now()).slice(-6)}`,createdAt:new Date().toISOString(),total:body.subtotal,status:'Nuevo',items:validatedItems};
      setOrders(current=>[order,...current]);
      setCart([]);
      return order;
    },
    updateOrderStatus(id,status){setOrders(current=>current.map(order=>order.id===id?{...order,status}:order))},
  }),[products,devices,catalogLoading,catalogError,cart,orders,cartOpen]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(){const context=useContext(StoreContext);if(!context)throw new Error('useStore debe estar dentro de StoreProvider');return context}
