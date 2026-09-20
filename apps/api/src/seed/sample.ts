import { CategoryModel } from "../models/Category";
import { HomeSectionModel } from "../models/HomeSection";
import { ProductModel } from "../models/Product";
import { ReviewModel } from "../models/Review";
import { ServiceModel } from "../models/Service";
import { getSettingsDoc } from "../services/settings";

// Cloudinary's public demo images, so the sample data shows pictures before you upload your own.
const img = (name: string): string => `https://res.cloudinary.com/demo/image/upload/${name}.jpg`;

const categories = [
  { name: "Photo Books", slug: "photo-books", order: 1, image: img("cld-sample-4") },
  { name: "Photo Frames", slug: "photo-frames", order: 2, image: img("cld-sample-2") },
  { name: "Photo Magnets", slug: "photo-magnets", order: 3, image: img("cld-sample-3") },
  { name: "Canvas Prints", slug: "canvas-prints", order: 4, image: img("cld-sample-5") },
];

/** Occasion tags for the shop filter, by product slug. */
const OCCASIONS_BY_SLUG: Record<string, string[]> = {
  "classic-lay-flat-photo-book": ["travel", "baby"],
  "wedding-album": ["wedding"],
  "wooden-photo-frame": ["dashain", "tihar", "wedding"],
  "black-metal-frame": ["travel", "baby"],
  "photo-magnet": ["tihar", "dashain"],
  "magnet-set-of-9": ["baby", "travel"],
  "gallery-canvas-print": ["travel", "wedding"],
};

interface SampleProduct {
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  basePrice: number;
  image: string;
  variants: Array<{ size: string; cover?: string; pages?: number; price: number }>;
  highlights: string[];
  specs: Array<{ label: string; value: string }>;
  faqs: Array<{ question: string; answer: string }>;
  isFeatured?: boolean;
}

const deliveryFaq = {
  question: "How long does delivery take in Kathmandu?",
  answer:
    "Orders inside Kathmandu Valley arrive 2 to 3 working days after printing. Outside the valley takes 4 to 7 days.",
};
const payFaq = {
  question: "How do I pay?",
  answer:
    "Place your order, send the order code to us on WhatsApp, then pay by eSewa, Khalti or bank transfer.",
};

const products: SampleProduct[] = [
  {
    title: "Classic Lay-Flat Photo Book",
    slug: "classic-lay-flat-photo-book",
    category: "photo-books",
    shortDescription: "A lay-flat hardcover album for your best moments.",
    description:
      "<p>Printed on premium silk paper with a lay-flat binding, so your photos run across the spread without a gutter.</p>",
    basePrice: 1800,
    image: img("cld-sample-4"),
    variants: [
      { size: "A5 (15 x 21 cm)", cover: "Softcover", pages: 20, price: 1800 },
      { size: "A4 (21 x 30 cm)", cover: "Hardcover", pages: 30, price: 3200 },
      { size: "A4 (21 x 30 cm)", cover: "Hardcover", pages: 60, price: 4800 },
    ],
    highlights: ["Lay-flat binding", "170 gsm silk paper", "Free layout help on WhatsApp"],
    specs: [
      { label: "Paper", value: "170 gsm silk" },
      { label: "Binding", value: "Lay-flat" },
    ],
    faqs: [deliveryFaq, payFaq],
    isFeatured: true,
  },
  {
    title: "Wedding Album",
    slug: "wedding-album",
    category: "photo-books",
    shortDescription: "A heirloom album with a leatherette cover and boxed gift case.",
    description:
      "<p>Designed for wedding photography: thick pages, rich colour and a cover that lasts decades.</p>",
    basePrice: 6500,
    image: img("cld-sample"),
    variants: [
      { size: "12 x 12 in", cover: "Leatherette", pages: 40, price: 6500 },
      { size: "12 x 12 in", cover: "Leatherette", pages: 80, price: 9800 },
    ],
    highlights: ["Boxed gift case", "Thick 300 gsm pages", "Custom cover text"],
    specs: [{ label: "Cover", value: "Leatherette with foil text" }],
    faqs: [deliveryFaq, payFaq],
    isFeatured: true,
  },
  {
    title: "Wooden Photo Frame",
    slug: "wooden-photo-frame",
    category: "photo-frames",
    shortDescription: "Solid wood frame with a glass front, ready to hang.",
    description:
      "<p>A warm walnut-finish frame that suits family portraits and festival photos.</p>",
    basePrice: 900,
    image: img("cld-sample-2"),
    variants: [
      { size: "6 x 8 in", price: 900 },
      { size: "8 x 12 in", price: 1400 },
      { size: "12 x 18 in", price: 2400 },
    ],
    highlights: ["Solid wood", "Glass front", "Hang or stand"],
    specs: [{ label: "Finish", value: "Walnut" }],
    faqs: [deliveryFaq, payFaq],
    isFeatured: true,
  },
  {
    title: "Black Metal Frame",
    slug: "black-metal-frame",
    category: "photo-frames",
    shortDescription: "A slim modern frame with a white mat.",
    description: "<p>Slim black aluminium frame with an optional white mat for a gallery look.</p>",
    basePrice: 1100,
    image: img("sample"),
    variants: [
      { size: "8 x 12 in", price: 1100 },
      { size: "12 x 18 in", price: 1900 },
    ],
    highlights: ["Slim profile", "White mat included"],
    specs: [{ label: "Material", value: "Aluminium" }],
    faqs: [deliveryFaq],
  },
  {
    title: "Photo Magnet",
    slug: "photo-magnet",
    category: "photo-magnets",
    shortDescription: "Turn a favourite photo into a fridge magnet.",
    description:
      "<p>Glossy 3 mm flexible magnet, cut to size. Great as gifts and wedding favours.</p>",
    basePrice: 150,
    image: img("cld-sample-3"),
    variants: [],
    highlights: ["Glossy finish", "Bulk discounts from 20 pieces"],
    specs: [{ label: "Size", value: "7.5 x 7.5 cm" }],
    faqs: [payFaq],
    isFeatured: true,
  },
  {
    title: "Magnet Set of 9",
    slug: "magnet-set-of-9",
    category: "photo-magnets",
    shortDescription: "Nine square magnets in a gift sleeve.",
    description: "<p>A ready-to-gift set of nine photo magnets, presented in a printed sleeve.</p>",
    basePrice: 1100,
    image: img("cld-sample-3"),
    variants: [],
    highlights: ["Gift sleeve", "Nine photos"],
    specs: [{ label: "Pieces", value: "9" }],
    faqs: [payFaq],
  },
  {
    title: "Gallery Canvas Print",
    slug: "gallery-canvas-print",
    category: "canvas-prints",
    shortDescription: "Your photo on stretched canvas, ready to hang.",
    description: "<p>Fade-resistant inks on cotton canvas stretched over a 2 cm wooden frame.</p>",
    basePrice: 2200,
    image: img("cld-sample-5"),
    variants: [
      { size: "12 x 18 in", price: 2200 },
      { size: "16 x 24 in", price: 3600 },
      { size: "24 x 36 in", price: 6200 },
    ],
    highlights: ["Cotton canvas", "2 cm wooden frame", "Hanging kit included"],
    specs: [{ label: "Canvas", value: "Cotton" }],
    faqs: [deliveryFaq, payFaq],
    isFeatured: true,
  },
];

const services = [
  {
    title: "Photo Restoration",
    slug: "photo-restoration",
    description:
      "<p>We repair scratches, fading and tears in old family photos, then print them fresh.</p>",
    icon: "wand",
    image: img("cld-sample-2"),
    startingPrice: 500,
    showOnHome: true,
    order: 1,
  },
  {
    title: "Album Design Help",
    slug: "album-design-help",
    description: "<p>Send us your photos on WhatsApp and we lay out your album for you.</p>",
    icon: "layout",
    image: img("cld-sample-4"),
    startingPrice: 800,
    showOnHome: true,
    order: 2,
  },
  {
    title: "Passport Size Photos",
    slug: "passport-size-photos",
    description: "<p>Sharp passport and visa photos in every standard size, ready in an hour.</p>",
    icon: "id-card",
    image: img("sample"),
    startingPrice: 150,
    showOnHome: false,
    order: 3,
  },
  {
    title: "Event Photo Printing",
    slug: "event-photo-printing",
    description:
      "<p>Bulk prints for weddings, bratabandha and festivals with same-week delivery.</p>",
    icon: "printer",
    image: img("cld-sample-3"),
    startingPrice: 12,
    showOnHome: true,
    order: 4,
  },
];

const reviews = [
  {
    product: "classic-lay-flat-photo-book",
    name: "Anita Shrestha",
    rating: 5,
    title: "Perfect for our trip",
    comment:
      "The pages lie completely flat and the colours are exactly like the screen. Arrived in Lalitpur in two days.",
  },
  {
    product: "classic-lay-flat-photo-book",
    name: "Bikash Thapa",
    rating: 5,
    title: "Great quality",
    comment:
      "Made this for my parents' anniversary. They cried. Quality is better than I expected for the price.",
  },
  {
    product: "wedding-album",
    name: "Sunita Gurung",
    rating: 5,
    title: "Worth every rupee",
    comment: "The boxed album looks premium and the team helped us pick the layout on WhatsApp.",
  },
  {
    product: "wooden-photo-frame",
    name: "Rajan Karki",
    rating: 4,
    title: "Solid frame",
    comment: "Nicely finished wood, glass was well packed. Slightly darker than the photo online.",
  },
  {
    product: "photo-magnet",
    name: "Pooja Adhikari",
    rating: 5,
    title: "Wedding favours",
    comment:
      "Ordered 60 magnets for guests. Everyone loved them and they arrived before the wedding.",
  },
  {
    product: "gallery-canvas-print",
    name: "Dipesh Rai",
    rating: 5,
    title: "Looks great on the wall",
    comment: "Sharp print and the hanging kit made it easy. Will order more for the living room.",
  },
];

export interface SampleSeedResult {
  categories: number;
  products: number;
  services: number;
  reviews: number;
  homeSections: number;
}

/** Inserts sample content. Existing records (matched by slug, or review author+comment) are left untouched. */
export async function seedSample(): Promise<SampleSeedResult> {
  await getSettingsDoc();

  const counts: SampleSeedResult = {
    categories: 0,
    products: 0,
    services: 0,
    reviews: 0,
    homeSections: 0,
  };
  const upserted = (result: { upsertedCount: number }): number => result.upsertedCount;

  for (const category of categories) {
    counts.categories += upserted(
      await CategoryModel.updateOne(
        { slug: category.slug },
        { $setOnInsert: category },
        { upsert: true },
      ),
    );
  }
  const categoryIds = new Map(
    (await CategoryModel.find({ slug: { $in: categories.map((c) => c.slug) } })).map((c) => [
      c.slug,
      c._id,
    ]),
  );

  for (const { category, image, ...product } of products) {
    counts.products += upserted(
      await ProductModel.updateOne(
        { slug: product.slug },
        {
          $setOnInsert: {
            ...product,
            images: [image],
            categoryId: categoryIds.get(category),
            occasions: OCCASIONS_BY_SLUG[product.slug] ?? [],
          },
        },
        { upsert: true },
      ),
    );
  }
  const productIds = new Map(
    (await ProductModel.find({ slug: { $in: products.map((p) => p.slug) } })).map((p) => [
      p.slug,
      p._id,
    ]),
  );

  for (const service of services) {
    counts.services += upserted(
      await ServiceModel.updateOne(
        { slug: service.slug },
        { $setOnInsert: service },
        { upsert: true },
      ),
    );
  }
  const serviceIds = (await ServiceModel.find({ showOnHome: true }).sort({ order: 1 })).map(
    (s) => s._id,
  );

  for (const { product, ...review } of reviews) {
    counts.reviews += upserted(
      await ReviewModel.updateOne(
        { productId: productIds.get(product), name: review.name, comment: review.comment },
        { $setOnInsert: { ...review, productId: productIds.get(product), status: "approved" } },
        { upsert: true },
      ),
    );
  }
  // One review left pending so the moderation queue is not empty in the admin panel.
  counts.reviews += upserted(
    await ReviewModel.updateOne(
      {
        productId: productIds.get("photo-magnet"),
        name: "Test Customer",
        comment: "Waiting for approval.",
      },
      {
        $setOnInsert: {
          productId: productIds.get("photo-magnet"),
          name: "Test Customer",
          rating: 4,
          comment: "Waiting for approval.",
          status: "pending",
        },
      },
      { upsert: true },
    ),
  );

  const featured = products.filter((p) => p.isFeatured).map((p) => productIds.get(p.slug));
  const approvedReviews = (await ReviewModel.find({ status: "approved" }).limit(6)).map(
    (r) => r._id,
  );
  const sections = [
    {
      type: "hero",
      title: "Your memories, beautifully printed",
      subtitle: "Photo books, frames and prints made in Nepal",
      itemRefs: [],
      order: 1,
    },
    {
      type: "featured",
      title: "Loved by our customers",
      subtitle: "Our most popular products",
      itemRefs: featured,
      order: 3,
    },
    { type: "services", title: "More ways we can help", itemRefs: serviceIds, order: 4 },
    { type: "reviews", title: "What customers say", itemRefs: approvedReviews, order: 5 },
    {
      type: "guarantees",
      title: "Our promise",
      subtitle: "Quality guaranteed, support on WhatsApp",
      itemRefs: [],
      order: 6,
    },
    {
      type: "gallery",
      title: "Find a keepsake for the moment",
      subtitle: "Weddings, festivals, babies and trips",
      itemRefs: [],
      order: 2,
    },
  ];
  for (const section of sections) {
    counts.homeSections += upserted(
      await HomeSectionModel.updateOne(
        { type: section.type },
        { $setOnInsert: section },
        { upsert: true },
      ),
    );
  }

  return counts;
}
