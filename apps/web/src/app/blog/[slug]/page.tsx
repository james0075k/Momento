import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { ShareButtons } from "@/components/shop/share-buttons";
import { absoluteUrl } from "@/lib/site";
import { BlogBody } from "@/components/seo/blog-body";
import { AnswerBox } from "@/components/seo/answer-box";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FaqList } from "@/components/seo/faq-list";
import { JsonLd } from "@/components/seo/json-ld";
import { getOccasion } from "@/config/occasions";
import { BLOG_POSTS, getPost } from "@/content/blog";
import { articleLd, breadcrumbLd, faqLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "Post not found", robots: { index: false } };
  return buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.published,
    modifiedTime: post.modified ?? post.published,
  });
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

export default async function BlogPostPage({ params }: Params) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  const path = `/blog/${post.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path },
  ];
  const occasions = post.occasions.flatMap((slug) => getOccasion(slug) ?? []);
  const others = BLOG_POSTS.filter((other) => other.slug !== post.slug);

  return (
    <PageShell>
      <JsonLd
        data={[
          articleLd({
            title: post.title,
            description: post.description,
            path,
            published: post.published,
            modified: post.modified,
          }),
          breadcrumbLd(crumbs),
          ...(post.faqs ? [faqLd(post.faqs)] : []),
        ]}
      />
      <article className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="mb-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          {post.title}
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          By Momento ·{" "}
          <time dateTime={post.published}>{dateFormat.format(new Date(post.published))}</time>
          {" · "}
          {post.readingMinutes} min read
        </p>
        <AnswerBox>{post.answer}</AnswerBox>
        <BlogBody blocks={post.body} />

        <ShareButtons url={absoluteUrl(path)} title={post.title} className="mt-10" />

        {post.faqs && (
          <section aria-labelledby="post-faq" className="mt-14">
            <h2 id="post-faq" className="mb-5 text-2xl font-semibold md:text-3xl">
              Common questions
            </h2>
            <FaqList faqs={post.faqs} />
          </section>
        )}

        <aside aria-labelledby="related-title" className="mt-14">
          <h2 id="related-title" className="mb-4 text-2xl font-semibold">
            Keep exploring
          </h2>
          <ul className="max-w-3xl space-y-2">
            {occasions.map((occasion) => (
              <li key={occasion.slug}>
                <Link href={`/occasions/${occasion.slug}`} className="text-brand underline">
                  {occasion.headline}
                </Link>
              </li>
            ))}
            {others.map((other) => (
              <li key={other.slug}>
                <Link href={`/blog/${other.slug}`} className="text-brand underline">
                  {other.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className="text-brand underline">
                Shop photo books, frames and prints
              </Link>
            </li>
          </ul>
        </aside>
      </article>
    </PageShell>
  );
}
