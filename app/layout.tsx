import type { Metadata } from 'next'; import './globals.css';
export const metadata: Metadata={title:{default:'ALTER//CASE — tecnología que se lleva',template:'%s | ALTER//CASE'},description:'Cases, drops y accesorios de tecnología + moda.',openGraph:{title:'ALTER//CASE',description:'Tu celular. Tu estilo.',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
