import { ApiError } from "./api";

/** The parts of a Zod issue we read (the website does not import Zod itself; the schemas come from @momento/shared). */
export interface IssueLike {
  code: string;
  path: Array<string | number>;
  message: string;
  type?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  received?: unknown;
  validation?: unknown;
}

/** A form error message a shop owner can act on, instead of Zod's developer wording. */
function friendly(issue: IssueLike): string {
  if (issue.code === "too_small" && issue.type === "string" && Number(issue.minimum) === 1) {
    return "This is required.";
  }
  if (issue.code === "too_small" && issue.type === "string") {
    return `Use at least ${String(issue.minimum)} characters.`;
  }
  if (issue.code === "too_big" && issue.type === "string") {
    return `Use at most ${String(issue.maximum)} characters.`;
  }
  if (issue.code === "invalid_type" && issue.received === "undefined") return "This is required.";
  if (issue.code === "invalid_string" && issue.validation === "url") return "Enter a valid link.";
  return issue.message;
}

/** One message per field, keyed by its path with dots: "title", "variants.0.price". The first message wins. */
export function issuesToErrors(issues: IssueLike[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    errors[key] ??= friendly(issue);
  }
  return errors;
}

/** The API's field messages (`fieldErrors`) as the same shape, plus a form-level message when it has none. */
export function apiErrorsToForm(error: unknown): { fields: Record<string, string>; form?: string } {
  if (error instanceof ApiError) {
    const fields = Object.fromEntries(
      Object.entries(error.fields).flatMap(([key, messages]) =>
        messages[0] ? [[key, messages[0]]] : [],
      ),
    );
    if (error.status === 409) {
      return { fields: { ...fields, slug: "That web address is already used. Choose another." } };
    }
    return {
      fields,
      form: Object.keys(fields).length > 0 ? "Please fix the fields marked below." : error.message,
    };
  }
  return { fields: {}, form: "Something went wrong. Please try again." };
}

export interface FormResult<T> {
  input?: T;
  errors: Record<string, string>;
}
