import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { UseCaseCatalogAggregated, UseCaseItem } from "../../src/types/usecase.js";

function parseQueryNumber(q: unknown, fallback: number): number {
  const raw = Array.isArray(q) ? q[0] : q;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function parseText(q: unknown): string | undefined {
  const raw = Array.isArray(q) ? q[0] : q;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
}

function itemSectorMatches(item: UseCaseItem, value: string): boolean {
  const sector = String(item.sector ?? "").toLowerCase();
  if (sector === value) return true;
  const legacy = item as UseCaseItem & { sectors?: string[] };
  if (Array.isArray(legacy.sectors)) {
    return legacy.sectors.some((entry) => String(entry).toLowerCase() === value);
  }
  return false;
}

function itemHasValue(item: UseCaseItem, key: keyof UseCaseItem, value: string): boolean {
  const list = item[key];
  if (!Array.isArray(list)) return false;
  return list.some((entry) => String(entry).toLowerCase() === value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  try {
    const dataPath = join(process.cwd(), "data", "aggregated.json");
    const raw = await readFile(dataPath, "utf-8");
    const parsed = JSON.parse(raw) as UseCaseCatalogAggregated;

    const page = parseQueryNumber(req.query.page, 0);
    const size = Math.min(200, Math.max(1, parseQueryNumber(req.query.size, 20)));
    const search = parseText(req.query.search);
    const sector = parseText(req.query.sector);
    const interactionMode = parseText(req.query.interactionMode);
    const vcFormat = parseText(req.query.vcFormat);
    const issuanceProtocol = parseText(req.query.issuanceProtocol);
    const presentationProtocol = parseText(req.query.presentationProtocol);
    const interopProfile = parseText(req.query.interopProfile);
    const stage = parseText(req.query.stage);
    const status = parseText(req.query.status) ?? "published";

    let items: UseCaseItem[] = Array.isArray(parsed.useCases) ? [...parsed.useCases] : [];
    items = items.filter((item) => item.status.toLowerCase() === status);

    if (sector) {
      items = items.filter((item) => itemSectorMatches(item, sector));
    }
    if (interactionMode) {
      items = items.filter((item) => itemHasValue(item, "interactionModes", interactionMode));
    }
    if (vcFormat) {
      items = items.filter((item) => itemHasValue(item, "vcFormats", vcFormat));
    }
    if (issuanceProtocol) {
      items = items.filter((item) => itemHasValue(item, "issuanceProtocols", issuanceProtocol));
    }
    if (presentationProtocol) {
      items = items.filter((item) => itemHasValue(item, "presentationProtocols", presentationProtocol));
    }
    if (interopProfile) {
      items = items.filter((item) => itemHasValue(item, "interopProfiles", interopProfile));
    }
    if (stage) {
      items = items.filter((item) => (item.stage ?? "").toLowerCase() === stage);
    }
    if (search) {
      items = items.filter((item) => {
        const haystack = [
          item.id,
          item.title,
          item.summary,
          item.organizationName,
          item.sector,
          ...(item.interactionModes ?? []),
          ...(item.vcFormats ?? []),
          ...(item.issuanceProtocols ?? []),
          ...(item.presentationProtocols ?? []),
          ...(item.interopProfiles ?? []),
          ...(item.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    items.sort((a, b) => {
      const ta = Date.parse(a.updatedAt || "");
      const tb = Date.parse(b.updatedAt || "");
      return tb - ta;
    });

    const totalElements = items.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const start = page * size;
    const content = items.slice(start, start + size);

    res.status(200).json({
      content,
      totalElements,
      totalPages,
      number: page,
      size,
      lastUpdated: parsed.lastUpdated,
    });
  } catch (error) {
    console.error("usecase API error:", error);
    res.status(500).json({
      message: "Failed to load use case catalog",
      timestamp: new Date().toISOString(),
    });
  }
}
