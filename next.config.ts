import type { NextConfig } from 'next';
const hosts = new Set<string>(['images.unsplash.com']);
for (const value of [process.env.NEXT_PUBLIC_SUPABASE_URL, ...(process.env.PRODUCT_IMAGE_HOSTS ?? '').split(',')]) {
    if (!value)
        continue;
    try {
        const url = new URL(value.includes('://') ? value : `https://${value}`);
        if (url.protocol === 'https:')
            hosts.add(url.hostname);
    }
    catch { }
}
const nextConfig: NextConfig = { images: { formats: ['image/avif', 'image/webp'], remotePatterns: Array.from(hosts).map(hostname => ({ protocol: 'https' as const, hostname })) } };
export default nextConfig;
