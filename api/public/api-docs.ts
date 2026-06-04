import type { VercelRequest, VercelResponse } from "@vercel/node";

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "FIDES Use Case Catalog API",
    version: "1.1.0",
    description: "Read-only API for published FIDES use cases.",
  },
  paths: {
    "/api/public/usecase": {
      get: {
        summary: "List published use cases",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "sector", in: "query", schema: { type: "string" } },
          { name: "interactionMode", in: "query", schema: { type: "string", enum: ["remote", "proximity"] } },
          { name: "vcFormat", in: "query", schema: { type: "string" } },
          { name: "issuanceProtocol", in: "query", schema: { type: "string", enum: ["oid4vci", "other"] } },
          { name: "presentationProtocol", in: "query", schema: { type: "string" } },
          { name: "interopProfile", in: "query", schema: { type: "string" } },
          { name: "stage", in: "query", schema: { type: "string", enum: ["demo", "production"] } },
          { name: "status", in: "query", schema: { type: "string" }, description: "Defaults to published" },
          { name: "page", in: "query", schema: { type: "integer", default: 0 } },
          { name: "size", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated use cases",
          },
        },
      },
    },
    "/api/public/usecase/{id}": {
      get: {
        summary: "Get one published use case",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Use case object" },
          "404": { description: "Not found" },
        },
      },
    },
  },
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.status(200).json(OPENAPI_SPEC);
}
