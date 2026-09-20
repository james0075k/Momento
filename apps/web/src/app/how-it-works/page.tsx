import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { AnswerBox } from "@/components/seo/answer-box";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { HOW_IT_WORKS_STEPS } from "@/content/faq";
import { breadcrumbLd, howToLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

const TITLE = "How to order a photo book, frame or print from Momento";
const DESCRIPTION =
  "Order in three steps: choose your keepsake, send your photos on WhatsApp and approve the layout, then pay by eSewa, Khalti or bank once we confirm. We print and deliver.";

export const metadata: Metadata = buildMetadata({
  title: "How it works",
  description: DESCRIPTION,
  path: "/how-it-works",
});

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "How it works", path: "/how-it-works" },
];

export default function HowItWorksPage() {
  return (
    <PageShell>
      <JsonLd
        data={[
          howToLd({
            name: TITLE,
            description: DESCRIPTION,
            path: "/how-it-works",
            totalTime: "P3D",
            steps: [...HOW_IT_WORKS_STEPS],
          }),
          breadcrumbLd(CRUMBS),
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Breadcrumbs crumbs={CRUMBS} />
        <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">
          How ordering works
        </h1>
        <AnswerBox>
          Ordering from Momento takes three steps. Choose a photo book, frame, magnet or canvas,
          send your photos on WhatsApp and approve the layout, then pay by eSewa, Khalti or bank
          once we confirm. We print in Nepal and deliver to your door, usually in two to three
          working days in Kathmandu Valley.
        </AnswerBox>
        <ol className="max-w-3xl space-y-4">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <li
              key={step.title}
              id={`step-${index + 1}`}
              className="bg-surface flex scroll-mt-24 gap-4 rounded-2xl p-5"
            >
              <span className="bg-brand text-surface font-heading flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold">
                {index + 1}
              </span>
              <div>
                <h2 className="text-xl font-semibold">{step.title}</h2>
                <p className="text-muted-foreground mt-1">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-10 max-w-prose">
          Ready?{" "}
          <Link href="/shop" className="text-brand underline">
            Browse the shop
          </Link>
          , read the{" "}
          <Link href="/faq" className="text-brand underline">
            common questions
          </Link>
          , or get ideas from our{" "}
          <Link href="/occasions" className="text-brand underline">
            occasion guides
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
