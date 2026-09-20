import {
  resolveFeatures,
  settingsInputSchema,
  type FeatureFlags,
  type SettingsInput,
} from "@momento/shared";
import { asyncHandler } from "../middleware/asyncHandler";
import { revalidateWeb } from "../services/revalidate";
import { getSettingsDoc, saveSettings } from "../services/settings";

/** Mongoose drops empty nested objects; re-run the schema so clients always get every section. */
function present(doc: { toJSON(): unknown }) {
  const { key: _key, ...json } = doc.toJSON() as Record<string, unknown>;
  return {
    ...json,
    ...settingsInputSchema.parse(json),
    features: resolveFeatures(json.features as Partial<FeatureFlags> | undefined),
  };
}

export const settingsController = {
  /** Public: the payment details are shown to customers for manual payment. */
  get: asyncHandler(async (_req, res) => {
    res.json({ data: present(await getSettingsDoc()) });
  }),

  update: asyncHandler(async (req, res) => {
    const saved = await saveSettings(req.body as SettingsInput);
    // Tell the web app to drop its cached settings so a flag change shows straight away.
    await revalidateWeb("settings");
    res.json({ data: present(saved) });
  }),
};
