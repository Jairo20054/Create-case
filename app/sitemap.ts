import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://alter-case.vercel.app'; return ['', '/shop', '/drops', '/smart', '/custom'].map(url => ({ url: base + url, lastModified: new Date() })); }
