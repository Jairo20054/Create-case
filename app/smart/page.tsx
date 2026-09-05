'use client';
import Image from 'next/image';
import {Nav,ProductGrid} from '@/components/storefront';
import {useStore} from '@/components/store-provider';

export default function Page(){
  const {products}=useStore();
  const smart=products.filter(product=>product.category==='SMART');
  const image=smart[0]?.image??'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=1400&q=88';
  return <><Nav/><main><section className="grid min-h-screen items-end gap-8 bg-[#202923] px-5 pb-10 pt-32 md:grid-cols-2 md:px-10"><div><p className="text-xs tracking-[.2em] text-acid">ACTIVE OBJECTS</p><h1 className="font-display mt-4 text-7xl tracking-tighter md:text-9xl">SMART<br/>CASES</h1><p className="mt-7 max-w-sm text-lg text-white/70">Un case. Infinitos diseños. Tecnología útil, no ruido.</p></div><div className="relative min-h-[460px] overflow-hidden rounded-[2rem] bg-acid"><Image src={image} fill alt="Case inteligente" className="object-cover mix-blend-multiply"/><div className="absolute bottom-6 left-6 bg-ink p-4 text-sm">TECNOLOGÍA COMPATIBLE<br/><span className="text-xs text-acid">Elige. Valida. Disfruta.</span></div></div></section><section className="px-5 py-20 md:px-10"><ProductGrid list={smart}/></section></main></>;
}
