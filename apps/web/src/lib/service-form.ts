import { serviceInputSchema, type Service, type ServiceInput } from "@momento/shared";
import { issuesToErrors, type FormResult } from "./form-errors";

export interface ServiceFormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  images: string[];
  startingPrice: string;
  showOnHome: boolean;
  order: string;
  isActive: boolean;
}

export const emptyServiceForm = (): ServiceFormState => ({
  title: "",
  slug: "",
  slugTouched: false,
  description: "",
  images: [],
  startingPrice: "",
  showOnHome: false,
  order: "0",
  isActive: true,
});

export const formFromService = (service: Service): ServiceFormState => ({
  title: service.title,
  slug: service.slug,
  slugTouched: true,
  description: service.description,
  images: service.image ? [service.image] : [],
  startingPrice: service.startingPrice === undefined ? "" : String(service.startingPrice),
  showOnHome: service.showOnHome,
  order: String(service.order),
  isActive: service.isActive,
});

const whole = /^\d+$/;

export function toServiceInput(form: ServiceFormState): FormResult<ServiceInput> {
  const errors: Record<string, string> = {};
  if (form.startingPrice.trim() !== "" && !whole.test(form.startingPrice.trim())) {
    errors["startingPrice"] = "Enter a whole number of rupees, or leave it empty.";
  }
  if (!whole.test(form.order.trim())) errors["order"] = "Enter a whole number, like 0 or 3.";

  const parsed = serviceInputSchema.safeParse({
    title: form.title,
    slug: form.slug,
    description: form.description,
    image: form.images[0],
    startingPrice: form.startingPrice.trim() === "" ? undefined : Number(form.startingPrice),
    showOnHome: form.showOnHome,
    order: whole.test(form.order.trim()) ? Number(form.order) : 0,
    isActive: form.isActive,
  });
  if (parsed.success && Object.keys(errors).length === 0) return { input: parsed.data, errors: {} };
  return {
    errors: { ...(parsed.success ? {} : issuesToErrors(parsed.error.issues)), ...errors },
  };
}
