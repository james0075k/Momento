import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { postsNewestFirst } from "@/content/blog";
import { breadcrumbLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Photo tips, gift ideas and festival guides",
  description:
    "Practical guides from Momento: how to choose photos for a photo book, take photos that print well, and pick photo gifts for Dashain and Tihar.",
  path: "/blog",
});

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Blog", path: "/blog" },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

export default function BlogPage() {
  return (
    <PageShell>
      <JsonLd data={breadcrumbLd(CRUMBS)} />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Breadcrumbs crumbs={CRUMBS} />
        <h1 className="mb-3 text-4xl font-semibold tracking-tight md:text-5xl">The Momento blog</h1>
        <p className="text-muted-foreground mb-8 max-w-xl text-lg">
          Photo tips, gift ideas and festival guides for making keepsakes.
        </p>
        <ul className="grid gap-4 md:grid-cols-2">
          {postsNewestFirst().map((post) => (
            <li key={post.slug}>
              <article className="bg-surface h-full rounded-2xl p-5">
                <p className="text-muted-foreground text-sm">
                  <time dateTime={post.published}>
                    {dateFormat.format(new Date(post.published))}
                  </time>
                  {" · "}
                  {post.readingMinutes} min read
                </p>
                <h2 className="font-heading mt-2 text-2xl font-semibold">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="focus-visible:outline-ring hover:underline focus-visible:outline-2"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="text-muted-foreground mt-2">{post.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
