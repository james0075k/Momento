import { describe, expect, it } from "vitest";
import { isCloudinaryUrl } from "./admin-upload";

describe("isCloudinaryUrl", () => {
  it("accepts images from Cloudinary only", () => {
    expect(isCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/v1/sample.jpg")).toBe(
      true,
    );
    expect(isCloudinaryUrl("  https://res.cloudinary.com/demo/image/upload/a.png  ")).toBe(true);
    for (const value of [
      "",
      "http://res.cloudinary.com/demo/image/upload/a.jpg",
      "https://evil.example/image/upload/a.jpg",
      "https://res.cloudinary.com.evil.example/demo/image/upload/a.jpg",
      "https://res.cloudinary.com/demo/video/upload/a.mp4",
      "javascript:alert(1)",
    ]) {
      expect(isCloudinaryUrl(value), value).toBe(false);
    }
  });
});
