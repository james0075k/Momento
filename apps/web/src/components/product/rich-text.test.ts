import { describe, expect, it } from "vitest";
import { cleanHtml } from "./rich-text";

describe("cleanHtml", () => {
  it("keeps formatting and drops scripts, handlers and javascript links", () => {
    const out = cleanHtml(
      '<p onclick="x()">Hi <strong>there</strong></p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><img src=x onerror=alert(1)>',
    );
    expect(out).toContain("<strong>there</strong>");
    expect(out).not.toMatch(/script|onclick|onerror|javascript:|<img/i);
  });

  it("keeps normal links and marks them safe to open", () => {
    const out = cleanHtml('<a href="https://momento.example/x">x</a>');
    expect(out).toContain('href="https://momento.example/x"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});
