import type { RequestHandler } from "express";
import { ORDER_PHOTO_FORMATS, signUpload, type UploadFolder } from "../services/cloudinary";

export const uploadController = {
  signature: ((req, res) => {
    const { folder } = req.body as { folder: UploadFolder };
    res.json({ data: signUpload(folder) });
  }) satisfies RequestHandler,

  /** Public: customers uploading photos for a print order. Fixed folder, restricted formats. */
  orderSignature: ((_req, res) => {
    res.json({ data: signUpload("orders", Date.now(), ORDER_PHOTO_FORMATS) });
  }) satisfies RequestHandler,
};
