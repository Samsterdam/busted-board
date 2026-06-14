import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicMovieGrid } from "@/components/browse/PublicMovieGrid";
import { PLATFORM_REGISTRY, getPlatformBySlug } from "@/lib/platforms";
import { APP_URL } from "@/lib/config/app";

export const revalidate = 3600;

export async function generateStaticParams() {
  return PLATFORM_REGISTRY.map((p) => ({ platform: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }) {
  const { platform: slug } = await params;
  const platform = getPlatformBySlug(slug);
  if (!platform) return {};
  const description = `Top-rated movies and shows available on ${platform.name} right now. Find what to watch tonight.`;
  return {
    title: `Best Movies on ${platform.name} — Busted Board`,
    description,
    alternates: { canonical: `/top/${slug}` },
    openGraph: {
      title: `Best Movies on ${platform.name} — Busted Board`,
      description,
      url: `${APP_URL}/top/${slug}`,
      images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export default async function PlatformBrowsePage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform: slug } = await params;
  const platform = getPlatformBySlug(slug);
  if (!platform) notFound();

  const updatedLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Browse", item: `${APP_URL}/browse` },
              { "@type": "ListItem", position: 2, name: platform.name, item: `${APP_URL}/top/${slug}` },
            ],
          }),
        }}
      />
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Busted Board</Link>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* CTA */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-8 text-center">
          <p className="text-sm font-medium">Sign in for personalized picks — not just the top-rated list</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            AI-powered recommendations based on what you actually watch, across all your platforms.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get personalized picks
          </Link>
        </div>

        <nav className="text-xs text-muted-foreground mb-4">
          <Link href="/browse" className="hover:text-foreground transition-colors">Browse</Link>
          <span className="mx-1.5">›</span>
          <span>{platform.name}</span>
        </nav>

        <h1 className="text-2xl font-bold mb-2">Best on {platform.name}</h1>
        <p className="text-sm text-muted-foreground mb-1">
          Top-rated movies and shows available on {platform.name} right now.
        </p>
        <p className="text-xs text-muted-foreground/60 mb-6">Updated {updatedLabel}</p>

        {/* Platform switcher */}
        <div className="flex gap-2 flex-wrap mb-6">
          {PLATFORM_REGISTRY.map((p) => (
            <Link
              key={p.slug}
              href={`/top/${p.slug}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                p.slug === slug
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>

        <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />)}</div>}>
          <PublicMovieGrid platform={slug} />
        </Suspense>
      </main>
    </div>
  );
}
