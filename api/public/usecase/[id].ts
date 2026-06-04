import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { UseCaseCatalogAggregated } from "../../../src/types/usecase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  try {
    const idParam = req.query.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!id) {
      res.status(400).json({ message: "Missing use case id" });
      return;
    }

    const dataPath = join(process.cwd(), "data", "aggregated.json");
    const raw = await readFile(dataPath, "utf-8");
    const parsed = JSON.parse(raw) as UseCaseCatalogAggregated;
    const item = parsed.useCases.find((entry) => entry.id === id && entry.status === "published");

    if (!item) {
      res.status(404).json({ message: "Use case not found" });
      return;
    }

    res.status(200).json(item);
  } catch (error) {
    console.error("usecase detail API error:", error);
    res.status(500).json({
      message: "Failed to load use case",
      timestamp: new Date().toISOString(),
    });
  }
}
