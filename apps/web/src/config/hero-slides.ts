import type { HeroSlide } from "@/components/home/hero-slider";

/**
 * The full-screen slides behind the homepage headline. Leave empty to show the brand-colour
 * placeholders. To use your own, put the files in apps/web/public/hero/ and list them here:
 *
 *   { type: "image", src: "/hero/family.jpg" },
 *   { type: "video", src: "/hero/album.mp4", poster: "/hero/album.jpg" },
 *
 * Slides fade into each other. Images stay for 6 seconds; a video plays to the end (muted, no
 * sound) and then moves on. Use landscape files around 1920 x 1080, and keep videos under 10 MB.
 */
export const HERO_SLIDES: HeroSlide[] = [];
