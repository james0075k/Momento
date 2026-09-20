import { createHash } from "node:crypto";
import { env } from "../config/env";
import { HttpError } from "../middleware/errorHandler";

export const UPLOAD_FOLDERS = [
  "products",
  "services",
  "categories",
  "reviews",
  "site",
  "orders",
] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  /** Present when the upload is restricted; the client must send it exactly as given. */
  allowedFormats?: string;
}

/** Formats customers may upload for print orders. */
export const ORDER_PHOTO_FORMATS = "jpg,jpeg,png,webp,heic";

/**
 * Signs a Cloudinary upload so the browser can upload directly without ever seeing the API secret.
 * The signature covers `folder` and `timestamp`; the client must send exactly those values.
 * https://cloudinary.com/documentation/authentication_signatures
 */
export function signUpload(
  folder: UploadFolder,
  now = Date.now(),
  allowedFormats?: string,
): UploadSignature {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new HttpError(503, "Image uploads are not configured");
  }
  const timestamp = Math.floor(now / 1000);
  const fullFolder = `momento/${folder}`;
  // Cloudinary needs signed parameters in alphabetical order.
  const toSign = `${allowedFormats ? `allowed_formats=${allowedFormats}&` : ""}folder=${fullFolder}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(toSign + CLOUDINARY_API_SECRET)
    .digest("hex");
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    folder: fullFolder,
    signature,
    ...(allowedFormats ? { allowedFormats } : {}),
  };
}
