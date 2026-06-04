import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { UseCaseCatalogAggregated, UseCaseItem } from "../types/usecase.js";

interface SourcePayload {
  useCases?: UseCaseItem[];
}

async function loadSource(): Promise<UseCaseItem[]> {
  const sourceUrl = process.env.USE_CASE_SOURCE_URL;
  if (!sourceUrl) {
    return [];
  }

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source URL (${res.status}): ${sourceUrl}`);
  }

  const json = (await res.json()) as SourcePayload | UseCaseItem[];
  if (Array.isArray(json)) return json;
  return Array.isArray(json.useCases) ? json.useCases : [];
}

function normalize(items: UseCaseItem[]): UseCaseItem[] {
  return items
    .filter((item) => Boolean(item?.id))
    .map((item) => ({
      ...item,
      status: item.status ?? "submitted",
      updatedAt: item.updatedAt ?? new Date().toISOString(),
    }));
}

async function main(): Promise<void> {
  const items = normalize(await loadSource());

  const aggregated: UseCaseCatalogAggregated = {
    schemaVersion: "1.1.0",
    catalogType: "use-case-catalog",
    lastUpdated: new Date().toISOString(),
    useCases: items,
  };

  const outDir = join(process.cwd(), "data");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "aggregated.json"), JSON.stringify(aggregated, null, 2) + "\n", "utf-8");

  console.log(`Wrote ${items.length} use cases to data/aggregated.json`);
}

main().catch((err) => {
  console.error("Crawler failed:", err);
  process.exit(1);
});
