import type { ProductCardData, ReviewData, ServiceRowData } from "./home";

/**
 * Preview content for development, so the homepage is never empty before the API has data.
 * Never used in production unless SAMPLE_CONTENT=1 is set (for demos): the reviews here are made up.
 */
export const SAMPLE_PRODUCTS: ProductCardData[] = [
  {
    id: "sample-book",
    slug: "classic-lay-flat-photo-book",
    category: "Photo books",
    title: "Classic Lay-Flat Photo Book",
    shortDescription: "A lay-flat hardcover album for your best moments.",
    scene: "travel",
    fromPrice: 1800,
    hasVariants: true,
  },
  {
    id: "sample-album",
    slug: "wedding-album",
    category: "Photo books",
    title: "Wedding Album",
    shortDescription: "A heirloom album with a leatherette cover and boxed gift case.",
    scene: "wedding",
    fromPrice: 6500,
    hasVariants: true,
  },
  {
    id: "sample-frame",
    slug: "wooden-photo-frame",
    category: "Photo frames",
    title: "Wooden Photo Frame",
    shortDescription: "Solid wood frame with a glass front, ready to hang.",
    scene: "dashain",
    fromPrice: 900,
    hasVariants: true,
  },
  {
    id: "sample-magnet",
    slug: "photo-magnet",
    category: "Photo magnets",
    title: "Photo Magnet",
    shortDescription: "Turn a favourite photo into a fridge magnet.",
    scene: "tihar",
    fromPrice: 150,
    hasVariants: false,
  },
  {
    id: "sample-canvas",
    slug: "gallery-canvas-print",
    category: "Canvas prints",
    title: "Gallery Canvas Print",
    shortDescription: "Your photo on stretched canvas, ready to hang.",
    scene: "himal",
    fromPrice: 2200,
    hasVariants: true,
  },
  {
    id: "sample-baby",
    slug: "first-year-baby-book",
    category: "Photo books",
    title: "First-Year Baby Book",
    shortDescription: "Twelve months of firsts, one page at a time.",
    scene: "baby",
    fromPrice: 2400,
    hasVariants: true,
  },
];

export const SAMPLE_SERVICES: ServiceRowData[] = [
  {
    id: "sample-restore",
    title: "Photo Restoration",
    description:
      "We repair scratches, fading and tears in old family photos, then print them fresh.",
    startingPrice: 500,
  },
  {
    id: "sample-design",
    title: "Album Design Help",
    description: "Send us your photos on WhatsApp and we lay out your album for you.",
    startingPrice: 800,
  },
  {
    id: "sample-event",
    title: "Event Photo Printing",
    description: "Bulk prints for weddings, bratabandha and festivals with same-week delivery.",
    startingPrice: 12,
  },
];

export const SAMPLE_REVIEWS: ReviewData[] = [
  {
    id: "sample-r1",
    name: "Anita Shrestha",
    rating: 5,
    title: "Perfect for our trip",
    comment:
      "The pages lie completely flat and the colours are exactly like the screen. Arrived in Lalitpur in two days.",
    verified: true,
  },
  {
    id: "sample-r2",
    name: "Bikash Thapa",
    rating: 5,
    title: "Great quality",
    comment:
      "Made this for my parents' anniversary. They cried. Quality is better than I expected for the price.",
    verified: true,
  },
  {
    id: "sample-r3",
    name: "Sunita Gurung",
    rating: 5,
    title: "Worth every rupee",
    comment: "The boxed album looks premium and the team helped us pick the layout on WhatsApp.",
    verified: false,
  },
  {
    id: "sample-r4",
    name: "Rajan Karki",
    rating: 4,
    title: "Solid frame",
    comment: "Nicely finished wood, glass was well packed. Slightly darker than the photo online.",
    verified: false,
  },
  {
    id: "sample-r5",
    name: "Pooja Adhikari",
    rating: 5,
    title: "Wedding favours",
    comment:
      "Ordered 60 magnets for guests. Everyone loved them and they arrived before the wedding.",
    verified: false,
  },
];
