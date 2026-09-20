export interface Occasion {
  slug: string;
  name: string;
  /** Page heading. */
  headline: string;
  /** Meta description, 150 to 170 characters. */
  description: string;
  /** Direct 40 to 60 word answer shown at the top of the landing page. */
  answer: string;
  /** Gift and album ideas, one line each. */
  ideas: string[];
  faqs: Array<{ question: string; answer: string }>;
  /** Blog post slugs that help someone planning this occasion. */
  posts: string[];
}

/** Occasion tags a product can carry. The slugs match the homepage "Find a keepsake" tabs. */
export const OCCASIONS: readonly Occasion[] = [
  {
    slug: "wedding",
    name: "Wedding",
    headline: "Wedding albums and keepsakes",
    description:
      "Wedding photo albums, framed portraits and thank-you gifts printed in Nepal. Lay-flat pages, boxed covers and delivery across the country.",
    answer:
      "The best wedding keepsake in Nepal is a lay-flat photo album with a boxed cover and quality paper. Momento prints wedding albums from your photos, lets you approve the layout on WhatsApp, and delivers in Kathmandu Valley in two to three working days, with payment by eSewa, Khalti or bank transfer.",
    ideas: [
      "A lay-flat album of the ceremony, with the tika, pheras and reception on their own spreads",
      "A smaller mehendi or sangeet book for the family",
      "Framed portraits of the couple for both sets of parents",
      "Photo magnets as thank-you gifts for guests",
    ],
    faqs: [
      {
        question: "How many photos should a wedding album have?",
        answer:
          "Most couples choose 60 to 120 photos over 20 to 40 pages. Pick the strongest 10 to 15 from each ritual and let the best ones fill a full page.",
      },
      {
        question: "Can I get a wedding album made for a date in Bikram Sambat?",
        answer:
          "Yes. Tell us the date and the wording you want on the cover and we print it exactly as written, in English or Nepali.",
      },
      {
        question: "How long does a wedding album take?",
        answer:
          "Tell us your event date on WhatsApp and we confirm a delivery date once you approve the layout.",
      },
    ],
    posts: ["how-to-choose-photos-for-a-photo-book", "photo-gift-ideas-for-dashain-and-tihar"],
  },
  {
    slug: "dashain",
    name: "Dashain",
    headline: "Dashain photo gifts and family albums",
    description:
      "Dashain photo books, framed tika portraits and family gifts printed in Nepal. Order early on WhatsApp and get delivery before Vijaya Dashami.",
    answer:
      "For Dashain, a framed family photo or a small photo book is the gift that lasts longer than the festival. Momento prints both in Nepal from your photos, delivers in Kathmandu Valley in two to three working days, and takes orders on WhatsApp. Order a week before Vijaya Dashami, as printers get busy.",
    ideas: [
      "A framed photo of the whole family together at tika",
      "A photo book of this year's reunion, to be added to every Dashain",
      "A framed portrait of grandparents for the living room",
      "Photo magnets of the kids for relatives abroad",
    ],
    faqs: [
      {
        question: "When should I order for Dashain?",
        answer:
          "Order at least a week before Vijaya Dashami. Delivery outside the valley takes 4 to 7 working days, so order earlier if the gift is going to another district.",
      },
      {
        question: "Can you deliver a gift straight to a relative?",
        answer:
          "Yes. Give us their address and phone number at checkout and add a note, and we deliver it to them directly.",
      },
    ],
    posts: ["photo-gift-ideas-for-dashain-and-tihar", "how-to-choose-photos-for-a-photo-book"],
  },
  {
    slug: "tihar",
    name: "Tihar",
    headline: "Tihar photo gifts for brothers and sisters",
    description:
      "Bhai Tika gifts, framed photos and photo books for Tihar, printed in Nepal. Order on WhatsApp and pay by eSewa, Khalti or bank transfer.",
    answer:
      "A Bhai Tika gift that keeps its meaning is a framed photo or a small photo book of you and your sibling, from childhood to now. Momento prints them in Nepal from your photos and delivers in Kathmandu Valley in two to three working days. Order on WhatsApp before Laxmi Puja to be safe.",
    ideas: [
      "A framed then-and-now photo of you and your sibling",
      "A small photo book of every Bhai Tika through the years",
      "A canvas of the family lit by diyas on Laxmi Puja night",
      "Photo magnets for every sibling's fridge",
    ],
    faqs: [
      {
        question: "Can I send a Tihar gift to a sibling abroad?",
        answer:
          "We deliver within Nepal. If you send us their family's address in Nepal we can deliver there, and you can share a digital preview of the gift with them on WhatsApp.",
      },
      {
        question: "What is a good budget Tihar gift?",
        answer:
          "Photo magnets and small framed prints are the most affordable gifts. Message us on WhatsApp with your budget and we suggest the best fit.",
      },
    ],
    posts: ["photo-gift-ideas-for-dashain-and-tihar", "how-to-choose-photos-for-a-photo-book"],
  },
  {
    slug: "baby",
    name: "Baby",
    headline: "Baby books and first-year keepsakes",
    description:
      "First-year baby books, annaprashan albums and framed newborn portraits printed in Nepal. Order on WhatsApp and approve the layout before printing.",
    answer:
      "A first-year baby book is the best way to keep the pasni and annaprashan photos in one place. Choose about 12 photos, one for each month, add a few of the family, and Momento prints a hardcover book in Nepal. We share the layout on WhatsApp for your approval before printing.",
    ideas: [
      "A 12-month book with one photo and a caption for each month",
      "An annaprashan or pasni album for the family to sign",
      "A framed newborn portrait for the nursery",
      "Photo magnets to send to relatives",
    ],
    faqs: [
      {
        question: "What photos should go in a baby book?",
        answer:
          "One photo a month, the big firsts like the first smile and first steps, and family portraits. Add the date under each photo so the book works as a record.",
      },
      {
        question: "Is a baby book safe to hand to a baby?",
        answer:
          "Baby books are keepsakes to look through together, so keep them out of reach of little hands and mouths.",
      },
    ],
    posts: ["how-to-choose-photos-for-a-photo-book"],
  },
  {
    slug: "travel",
    name: "Travel",
    headline: "Travel photo books and trek prints",
    description:
      "Turn trek and holiday photos into lay-flat photo books, canvases and framed prints. Printed in Nepal, ordered on WhatsApp, delivered across the country.",
    answer:
      "Turn a trek into a lay-flat photo book, where panoramic mountain photos can run across two pages without a gap in the middle. Momento prints travel books and canvases in Nepal from your photos, takes orders on WhatsApp, and delivers in Kathmandu Valley in two to three working days.",
    ideas: [
      "A lay-flat book of the trek, with each day on its own spread",
      "A canvas of the best summit or sunrise photo",
      "A set of framed prints of the places along the route",
      "Photo magnets of the trip for the trekking group",
    ],
    faqs: [
      {
        question: "Do panoramic photos print well?",
        answer:
          "Yes, if the original is large enough. Send the original file from your phone or camera on WhatsApp as a document so it is not compressed.",
      },
      {
        question: "How do I send lots of trip photos?",
        answer:
          "Send them as documents on WhatsApp, or share a Google Drive folder link, and tell us which ones matter most.",
      },
    ],
    posts: ["how-to-choose-photos-for-a-photo-book"],
  },
];

export const getOccasion = (slug: string): Occasion | undefined =>
  OCCASIONS.find((occasion) => occasion.slug === slug);
