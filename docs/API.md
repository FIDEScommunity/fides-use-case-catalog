# Use Case Catalog API

## Overview

The FIDES Use Case Catalog exposes a read-only API over `data/aggregated.json`.
The API defaults to published use cases and supports sector/taxonomy filtering.

## Endpoints

### `GET /api/public/usecase`

Returns a paginated list of use cases.

Query parameters:

- `search` - text search in title, summary, organization, tags, sector, taxonomy
- `sector` - exact sector code filter (one sector per use case)
- `interactionMode` - `remote` or `proximity`
- `vcFormat` - VC format code filter
- `issuanceProtocol` - `oid4vci` or `other`
- `presentationProtocol` - presentation protocol filter
- `interopProfile` - interop profile filter
- `stage` - `technical-demo`, `use-case-demo`, `production-pilot`, `production`
- `status` - defaults to `published`
- `page` - zero-based page (default `0`)
- `size` - page size (default `20`, max `200`)

Response shape:

```json
{
  "content": [],
  "totalElements": 0,
  "totalPages": 1,
  "number": 0,
  "size": 20,
  "lastUpdated": "2026-06-03T00:00:00.000Z"
}
```

### `GET /api/public/usecase/{id}`

Returns a single published use case by id.

### `GET /api/public/api-docs`

Returns OpenAPI 3.1 JSON.
