import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RequestHandler, Router } from "express";
import { describe, expect, it } from "vitest";
import { buildRoutes } from "../routes";

const passThrough: RequestHandler = (_req, _res, next) => next();
const DOCS = resolve(__dirname, "../../../../docs/api.md");

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

function registeredRoutes(): string[] {
  const routes: string[] = [];
  const limiters = {
    login: passThrough,
    createOrder: passThrough,
    lookup: passThrough,
    createReview: passThrough,
    upload: passThrough,
  };
  for (const [prefix, router] of buildRoutes(limiters)) {
    for (const layer of (router as Router & { stack: RouteLayer[] }).stack) {
      if (!layer.route) continue;
      const path = layer.route.path === "/" ? prefix : `${prefix}${layer.route.path}`;
      for (const method of Object.keys(layer.route.methods)) {
        routes.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  return routes.sort();
}

describe("docs/api.md", () => {
  const docs = readFileSync(DOCS, "utf8");
  const documented = [...docs.matchAll(/^###\s+`([A-Z]+ \/[^`]*)`/gm)].map((m) => m[1]!).sort();

  it("documents every registered route", () => {
    const missing = registeredRoutes().filter((route) => !documented.includes(route));
    expect(missing).toEqual([]);
  });

  it("does not document routes that do not exist", () => {
    const stale = documented.filter((route) => !registeredRoutes().includes(route));
    expect(stale).toEqual([]);
  });
});
