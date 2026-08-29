import type { Metadata } from 'next'; import './globals.css'; import {StoreProvider} from '@/components/store-provider';
export const metadata: Metadata={title:{default:'ALTER//CASE — tecnología que se lleva',template:'%s | ALTER//CASE'},description:'Cases, drops y accesorios de tecnología + moda.',openGraph:{title:'ALTER//CASE',description:'Tu celular. Tu estilo.',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body><StoreProvider>{children}</StoreProvider></body></html>}
