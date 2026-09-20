import { DEFAULT_SETTINGS, type Settings, type SettingsInput } from "@momento/shared";
import { env } from "../config/env";
import { SettingsModel } from "../models/Settings";

const KEY = "main";

/** Returns the singleton settings document, creating it with defaults on first use. */
export async function getSettingsDoc() {
  return SettingsModel.findOneAndUpdate(
    { key: KEY },
    {
      $setOnInsert: {
        ...DEFAULT_SETTINGS,
        key: KEY,
        shopWhatsappNumber: env.SHOP_WHATSAPP_NUMBER ?? DEFAULT_SETTINGS.shopWhatsappNumber,
      },
    },
    { upsert: true, new: true },
  );
}

export async function getSettings(): Promise<Settings> {
  const doc = await getSettingsDoc();
  const json = doc.toJSON() as unknown as Settings;
  return json;
}

export async function saveSettings(input: Partial<SettingsInput>) {
  // Flags are written one by one (features.wishlist, ...), so an update that names only some of them
  // leaves the rest as they were.
  const { features, banner, ...rest } = input;
  const flags = Object.fromEntries(
    Object.entries(features ?? {}).map(([key, value]) => [`features.${key}`, value]),
  );
  return SettingsModel.findOneAndUpdate(
    { key: KEY },
    {
      $set: { ...rest, ...flags, ...(banner ? { banner } : {}) },
      // `banner: null` removes it.
      ...(banner === null ? { $unset: { banner: "" } } : {}),
    },
    { upsert: true, new: true, runValidators: true },
  );
}
