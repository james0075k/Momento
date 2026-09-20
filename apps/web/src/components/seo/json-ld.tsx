import { serializeLd, type JsonLdObject } from "@/lib/jsonld";

/** One JSON-LD block for a page. Pass every entity for the page in a single call. */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />
  );
}
