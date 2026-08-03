import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SUPPORT_ARTICLES, findArticle } from '@/features/support/articles';

export function generateStaticParams() {
  return SUPPORT_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  return { title: article ? article.title : 'Ayuda' };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();

  return (
    <div className="container max-w-2xl py-14">
      <Link href="/ayuda" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a la ayuda
      </Link>
      <span className="mt-6 block text-xs font-semibold uppercase tracking-wide text-brand-orange">
        {article.category}
      </span>
      <h1 className="mt-1 font-display text-3xl">{article.title}</h1>
      <p className="mt-5 leading-relaxed text-foreground/90">{article.content}</p>
    </div>
  );
}
