'use client';

import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {Product, products as seedProducts} from '@/lib/catalog';

export type CartItem = {id:string; slug:string; name:string; price:number; image:string; color:string; model:string; qty:number};
export type StoreOrder = {id:string;createdAt:string;customer:string;phone:string;email:string;address:string;city:string;payment:string;total:number;status:'Nuevo'|'Confirmado'|'Enviado';items:CartItem[]};
type StoreContextValue = {
  products:Product[]; cart:CartItem[]; orders:StoreOrder[]; cartOpen:boolean;
  setCartOpen:(open:boolean)=>void; addToCart:(product:Product,color:string,model:string,qty?:number)=>void;
  updateCart:(id:string,qty:number)=>void; removeFromCart:(id:string)=>void; clearCart:()=>void;
  updateProduct:(slug:string,changes:Partial<Product>)=>void; resetCatalog:()=>void;
  createOrder:(details:Omit<StoreOrder,'id'|'createdAt'|'total'|'status'|'items'>)=>StoreOrder;
  updateOrderStatus:(id:string,status:StoreOrder['status'])=>void;
};

const StoreContext=createContext<StoreContextValue|null>(null);
const read=<T,>(key:string,fallback:T):T=>{try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch{return fallback}};

export function StoreProvider({children}:{children:React.ReactNode}){
  const [ready,setReady]=useState(false);
  const [catalog,setCatalog]=useState<Product[]>(seedProducts);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [orders,setOrders]=useState<StoreOrder[]>([]);
  const [cartOpen,setCartOpen]=useState(false);

  useEffect(()=>{setCatalog(read('alter_catalog',seedProducts));setCart(read('alter_cart',[]));setOrders(read('alter_orders',[]));setReady(true)},[]);
  useEffect(()=>{if(ready)localStorage.setItem('alter_catalog',JSON.stringify(catalog))},[catalog,ready]);
  useEffect(()=>{if(ready)localStorage.setItem('alter_cart',JSON.stringify(cart))},[cart,ready]);
  useEffect(()=>{if(ready)localStorage.setItem('alter_orders',JSON.stringify(orders))},[orders,ready]);

  const value=useMemo<StoreContextValue>(()=>({
    products:catalog,cart,orders,cartOpen,setCartOpen,
    addToCart(product,color,model,qty=1){
      if(product.stock<1)return;
      const id=`${product.slug}__${color}__${model}`;
      setCart(current=>{const found=current.find(item=>item.id===id);return found?current.map(item=>item.id===id?{...item,qty:Math.min(product.stock,item.qty+qty)}:item):[...current,{id,slug:product.slug,name:product.name,price:product.price,image:product.image,color,model,qty:Math.min(product.stock,qty)}]});
      setCartOpen(true);
    },
    updateCart(id,qty){setCart(current=>qty<=0?current.filter(item=>item.id!==id):current.map(item=>item.id===id?{...item,qty}:item))},
    removeFromCart(id){setCart(current=>current.filter(item=>item.id!==id))},clearCart(){setCart([])},
    updateProduct(slug,changes){setCatalog(current=>current.map(product=>product.slug===slug?{...product,...changes}:product))},
    resetCatalog(){setCatalog(seedProducts)},
    createOrder(details){
      const total=cart.reduce((sum,item)=>sum+item.price*item.qty,0);
      const order:StoreOrder={...details,id:`AC-${String(Date.now()).slice(-6)}`,createdAt:new Date().toISOString(),total,status:'Nuevo',items:cart};
      setOrders(current=>[order,...current]);
      setCatalog(current=>current.map(product=>{const sold=cart.filter(item=>item.slug===product.slug).reduce((n,item)=>n+item.qty,0);return sold?{...product,stock:Math.max(0,product.stock-sold)}:product}));
      setCart([]); return order;
    },
    updateOrderStatus(id,status){setOrders(current=>current.map(order=>order.id===id?{...order,status}:order))},
  }),[catalog,cart,orders,cartOpen]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(){const context=useContext(StoreContext);if(!context)throw new Error('useStore debe estar dentro de StoreProvider');return context}
