import type { FaqItem } from "@/lib/jsonld";

/**
 * Blog posts live in code so they ship with the site and cost no database call.
 * Paragraph text supports [link text](/path) for internal links, which the renderer turns into <Link>.
 */
export type BlogBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  /** Meta description, 150 to 170 characters. */
  description: string;
  /** Direct 40 to 60 word answer shown under the title. */
  answer: string;
  /** ISO dates. */
  published: string;
  modified?: string;
  readingMinutes: number;
  body: BlogBlock[];
  faqs?: FaqItem[];
  /** Occasion slugs this post links to at the end. */
  occasions: string[];
}

export const BLOG_POSTS: readonly BlogPost[] = [
  {
    slug: "how-to-choose-photos-for-a-photo-book",
    title: "How to choose photos for a photo book",
    description:
      "A simple way to pick the right photos for a photo book: how many to use, what to leave out, and how to tell the story so the book is one you keep opening.",
    answer:
      "Choose 60 to 100 photos for a 20 to 30 page book. Pick one strong photo for each moment, add a few close-ups and small details, and leave out near-duplicates and blurry shots. Put the best photo on the cover, and arrange the rest in the order the day happened.",
    published: "2026-08-24",
    readingMinutes: 4,
    occasions: ["wedding", "baby", "travel"],
    body: [
      {
        type: "p",
        text: "A photo book is not a folder of everything you shot. It is a story with a beginning, a middle and an end. The trick is choosing fewer photos, and choosing them on purpose.",
      },
      { type: "h2", text: "Start with a story, not a pile" },
      {
        type: "p",
        text: "Decide what the book is about in one sentence: “Aarav's first year”, “Ten days to Annapurna Base Camp”, “Our wedding in Bhaktapur”. Every photo has to earn its place in that sentence.",
      },
      { type: "h2", text: "How many photos do you need?" },
      {
        type: "p",
        text: "A book of 20 to 30 pages works well with 60 to 100 photos. That is enough to tell the story without every page feeling crowded. Fewer photos on a page make each one feel more important, so it is fine to give your best shot a full page.",
      },
      { type: "h2", text: "What to keep and what to cut" },
      {
        type: "ul",
        items: [
          "Keep the sharpest, best-lit photo from each moment, and drop the near-duplicates.",
          "Keep the small details: hands, food, a doorway, a diya. They make a book feel real.",
          "Keep photos with people you love looking at the camera and looking away.",
          "Cut blurry photos, unless the blur is the memory.",
          "Cut screenshots and heavily compressed photos, as they print soft.",
        ],
      },
      { type: "h2", text: "Put them in order" },
      {
        type: "ol",
        items: [
          "Choose the cover photo first. It should work on its own.",
          "Lay the rest out in the order things happened. Photo file names by date help.",
          "Alternate wide shots, close-ups and details so pages do not look the same.",
          "End on a quiet photo: the last light, the empty table, a sleeping baby.",
        ],
      },
      { type: "h2", text: "Send the best originals" },
      {
        type: "p",
        text: "On WhatsApp, send photos as documents so they are not compressed. Then [choose your photo book](/shop?category=photo-books), and we check every photo for quality before printing and send you the layout to approve.",
      },
    ],
    faqs: [
      {
        question: "How many photos should go in a photo book?",
        answer:
          "For a book of 20 to 30 pages, 60 to 100 photos is a good range. Use fewer if you want each photo to feel bigger.",
      },
      {
        question: "Should I send photos on WhatsApp as documents?",
        answer:
          "Yes. Sending photos as documents keeps the original quality. Normal photo messages are compressed and can print softer.",
      },
    ],
  },
  {
    slug: "photo-gift-ideas-for-dashain-and-tihar",
    title: "Photo gift ideas for Dashain and Tihar",
    description:
      "Thoughtful Dashain and Tihar photo gifts for parents, grandparents and siblings: framed portraits, family photo books, magnets and canvases you can order in Nepal.",
    answer:
      "The best Dashain and Tihar photo gifts are a framed family portrait, a small photo book of the year, photo magnets for relatives, and a canvas of a favourite festival moment. Each one turns a photo you already have into something you can hold, and can be ordered on WhatsApp.",
    published: "2026-09-05",
    readingMinutes: 4,
    occasions: ["dashain", "tihar"],
    body: [
      {
        type: "p",
        text: "Dashain and Tihar are about being together, and the best gifts for them are made from those moments. Here are five ideas that use photos you already have.",
      },
      { type: "h2", text: "1. A framed family portrait" },
      {
        type: "p",
        text: "Take a photo of everyone together at tika this year, and give a framed print to your parents. A single photo with everyone in it is the one that ends up on the living-room wall. Browse [photo frames](/shop?category=photo-frames) to pick a size.",
      },
      { type: "h2", text: "2. A small photo book of the year" },
      {
        type: "p",
        text: "A slim book of 20 pages is enough for one festival season: the shopping, the cooking, the tika, the kites. Make a new one every year and, after a few Dashains, you have a family history. See our [Dashain gift ideas](/occasions/dashain).",
      },
      { type: "h2", text: "3. A then-and-now Bhai Tika gift" },
      {
        type: "p",
        text: "Put a childhood photo of you and your sibling beside one from today. It costs little, and it is the gift they will keep. Our [Tihar page](/occasions/tihar) has more ideas for brothers and sisters.",
      },
      { type: "h2", text: "4. Photo magnets for the fridge" },
      {
        type: "p",
        text: "Magnets are an easy gift for a lot of relatives at once. Print a photo of the kids for each grandparent, aunt and uncle.",
      },
      { type: "h2", text: "5. A canvas of the lit-up house" },
      {
        type: "p",
        text: "A photo of the house lit with diyas on Laxmi Puja night looks good as a canvas, and it makes the festival last through the year.",
      },
      { type: "h2", text: "When to order" },
      {
        type: "p",
        text: "Order at least a week before the festival, and earlier if the gift is going outside Kathmandu Valley. Message us on WhatsApp and we confirm a delivery date before you pay.",
      },
    ],
    faqs: [
      {
        question: "What is a good Dashain gift for parents?",
        answer:
          "A framed family portrait from this year's tika is a gift parents keep on display. A photo book of the family's year is another good choice.",
      },
      {
        question: "What is a good Bhai Tika gift?",
        answer:
          "A framed then-and-now photo of you and your sibling, or a small photo book of your Bhai Tika photos through the years.",
      },
    ],
  },
  {
    slug: "how-to-take-photos-that-print-well",
    title: "How to take photos that print well",
    description:
      "Five simple habits that make phone photos print sharp and clear in photo books, frames and canvases: light, focus, resolution, cropping and how to send originals.",
    answer:
      "Photos print well when they are sharp, well lit and high resolution. Shoot in daylight, tap to focus, hold still, keep the original file size, and leave some space around your subject so the photo can be cropped. Send originals as documents on WhatsApp, not as compressed photo messages.",
    published: "2026-09-12",
    readingMinutes: 3,
    occasions: ["wedding", "travel"],
    body: [
      {
        type: "p",
        text: "You do not need a professional camera to get a good print. A recent phone is enough if you follow a few habits.",
      },
      { type: "h2", text: "Five habits for better prints" },
      {
        type: "ol",
        items: [
          "Use daylight. Stand facing a window or shoot outside in the morning or late afternoon. Avoid the phone's flash.",
          "Tap to focus. Tap on the face or subject on the screen and wait for the frame to sharpen before you shoot.",
          "Hold still. Rest your elbows against your body, or lean on a wall, and take two or three shots.",
          "Leave room around the subject. Prints are cropped to fit the page, and a photo shot too tight can lose a head or hand.",
          "Do not zoom in with your fingers. Digital zoom lowers quality, so step closer instead.",
        ],
      },
      { type: "h2", text: "Keep the original file" },
      {
        type: "p",
        text: "Photos that have been sent through social apps are shrunk to load fast, and that shows in print. Where you can, use the original from your phone gallery. If you only have the version from an app, send it anyway, and we tell you honestly how well it will print.",
      },
      { type: "h2", text: "Send photos as documents on WhatsApp" },
      {
        type: "p",
        text: "In WhatsApp, tap the paperclip, choose Document, and pick your photos. This sends the original without compression. Then see our [how it works](/how-it-works) page for the next steps.",
      },
      { type: "h2", text: "Old and scanned photos" },
      {
        type: "p",
        text: "For a printed photo, scan it or photograph it flat in daylight with no shadow across it. If the photo is torn or faded, ask about [photo restoration](/services).",
      },
    ],
    faqs: [
      {
        question: "What resolution do photos need to print well?",
        answer:
          "Photos straight from a modern phone are usually enough for books, frames and small canvases. Very small or heavily compressed photos may print softly, and we tell you before printing.",
      },
      {
        question: "Can I print a photo I received on Facebook or Messenger?",
        answer:
          "You can, but those apps shrink photos. Ask the sender to share the original as a document if you can, and it will print sharper.",
      },
    ],
  },
];

export const getPost = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((post) => post.slug === slug);

export const postsNewestFirst = (): BlogPost[] =>
  [...BLOG_POSTS].sort((a, b) => b.published.localeCompare(a.published));
