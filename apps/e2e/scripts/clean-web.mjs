// Next keeps a fetch cache in its build folder. A cache from an earlier run holds product and
// variant ids from a different database, so start every e2e run from an empty one.
import { rmSync } from "node:fs";

rmSync(new URL("../../web/.next-e2e", import.meta.url), { recursive: true, force: true });
