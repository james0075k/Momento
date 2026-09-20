import mongoose from "mongoose";

/**
 * Global toJSON: expose `id` instead of `_id`/`__v`, and never leak password hashes.
 * Must be imported before any schema is created, so every model file imports it first.
 */
mongoose.set("toJSON", {
  transform(_doc, ret: Record<string, unknown>) {
    if (ret["_id"] !== undefined) {
      ret["id"] = (ret["_id"] as { toString(): string }).toString();
      delete ret["_id"];
    }
    delete ret["__v"];
    delete ret["passwordHash"];
    return ret;
  },
});
