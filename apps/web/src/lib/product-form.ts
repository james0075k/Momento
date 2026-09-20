import { productInputSchema, type Product, type ProductInput } from "@momento/shared";
import { issuesToErrors, type FormResult } from "./form-errors";

export interface VariantRow {
  /** Set for a size that already exists, and sent back unchanged so carts and orders keep pointing at it. */
  id?: string;
  size: string;
  cover: string;
  pages: string;
  price: string;
}

export interface ProductFormState {
  title: string;
  slug: string;
  /** Once the slug is edited by hand, it stops following the title. */
  slugTouched: boolean;
  categoryId: string;
  shortDescription: string;
  description: string;
  images: string[];
  basePrice: string;
  variants: VariantRow[];
  highlights: string[];
  occasions: string[];
  specs: Array<{ label: string; value: string }>;
  faqs: Array<{ question: string; answer: string }>;
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  isActive: boolean;
}

export const emptyProductForm = (): ProductFormState => ({
  title: "",
  slug: "",
  slugTouched: false,
  categoryId: "",
  shortDescription: "",
  description: "",
  images: [],
  basePrice: "",
  variants: [],
  highlights: [],
  occasions: [],
  specs: [],
  faqs: [],
  seoTitle: "",
  seoDescription: "",
  isFeatured: false,
  isActive: true,
});

export function formFromProduct(product: Product): ProductFormState {
  return {
    title: product.title,
    slug: product.slug,
    slugTouched: true,
    categoryId: product.categoryId,
    shortDescription: product.shortDescription,
    description: product.description,
    images: product.images,
    basePrice: String(product.basePrice),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      cover: variant.cover ?? "",
      pages: variant.pages ? String(variant.pages) : "",
      price: String(variant.price),
    })),
    highlights: product.highlights,
    occasions: product.occasions,
    specs: product.specs,
    faqs: product.faqs,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    isFeatured: product.isFeatured,
    isActive: product.isActive,
  };
}

const whole = /^\d+$/;

/**
 * Turns the form into what the API takes and checks it with the same schema the API uses, so the
 * messages match. Blank rows (a size with no name, half-filled specs) are dropped rather than rejected.
 */
export function toProductInput(form: ProductFormState): FormResult<ProductInput> {
  const errors: Record<string, string> = {};

  if (!whole.test(form.basePrice.trim())) {
    errors["basePrice"] = "Enter a whole number of rupees, like 1500.";
  }
  const variants = form.variants
    .filter((row) => row.size.trim() !== "" || row.price.trim() !== "")
    .map((row, index) => {
      if (!whole.test(row.price.trim()))
        errors[`variants.${index}.price`] = "Enter a whole number of rupees.";
      if (row.pages.trim() !== "" && !whole.test(row.pages.trim())) {
        errors[`variants.${index}.pages`] = "Enter a whole number of pages.";
      }
      return {
        ...(row.id ? { id: row.id } : {}),
        size: row.size.trim(),
        cover: row.cover.trim() || undefined,
        pages: row.pages.trim() ? Number(row.pages) : undefined,
        price: Number(row.price),
      };
    });

  if (Object.keys(errors).length > 0) {
    // The numbers cannot even be read, so do not run the schema on nonsense.
    const partial = productInputSchema.safeParse(buildRaw(form, variants, 0));
    return {
      errors: { ...(partial.success ? {} : issuesToErrors(partial.error.issues)), ...errors },
    };
  }

  const parsed = productInputSchema.safeParse(buildRaw(form, variants, Number(form.basePrice)));
  if (parsed.success) return { input: parsed.data, errors: {} };
  return { errors: issuesToErrors(parsed.error.issues) };
}

function buildRaw(form: ProductFormState, variants: unknown[], basePrice: number) {
  return {
    title: form.title,
    slug: form.slug,
    categoryId: form.categoryId,
    shortDescription: form.shortDescription,
    description: form.description,
    images: form.images,
    basePrice,
    variants,
    highlights: form.highlights.map((text) => text.trim()).filter(Boolean),
    occasions: form.occasions,
    specs: form.specs
      .map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() }))
      .filter((spec) => spec.label && spec.value),
    faqs: form.faqs
      .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
      .filter((faq) => faq.question && faq.answer),
    seoTitle: form.seoTitle.trim() || undefined,
    seoDescription: form.seoDescription.trim() || undefined,
    isFeatured: form.isFeatured,
    isActive: form.isActive,
  };
}
