import { Collections } from '@/components/collections';
export default async function Page({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) { const { slug } = await params; return <Collections slug={slug}/>; }
