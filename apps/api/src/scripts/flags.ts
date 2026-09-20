import { FEATURE_KEYS, isFeatureOn, type FeatureKey } from "@momento/shared";
import mongoose from "mongoose";
import { env } from "../config/env";
import { revalidateWeb } from "../services/revalidate";
import { getSettings, saveSettings } from "../services/settings";
import "../models";

/**
 * Switch a Phase 8 feature on or off until the admin panel exists.
 *   pnpm --filter @momento/api flags list
 *   pnpm --filter @momento/api flags set wishlist on
 */
async function main(): Promise<void> {
  const [command, name, value] = process.argv.slice(2);
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(env.MONGODB_URI);
  try {
    if (command === "list") {
      const settings = await getSettings();
      for (const key of FEATURE_KEYS) {
        console.log(`${isFeatureOn(settings, key) ? "on " : "off"}  ${key}`);
      }
    } else if (command === "set") {
      if (!FEATURE_KEYS.includes(name as FeatureKey)) {
        throw new Error(`Unknown flag "${name}". Known: ${FEATURE_KEYS.join(", ")}`);
      }
      if (value !== "on" && value !== "off") throw new Error('Use "on" or "off"');
      await saveSettings({ features: { [name as FeatureKey]: value === "on" } });
      await revalidateWeb("settings");
      console.log(`${name} is now ${value}`);
    } else {
      console.log("Usage: flags list | flags set <name> on|off");
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
