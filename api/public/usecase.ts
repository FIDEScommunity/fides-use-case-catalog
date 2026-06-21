import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadUseCaseData, type AggregatedUseCase } from '../../lib/aggregatedData';

function toNumber(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isNaN(n) || n < 0 ? fallback : n;
}

function parseQueryArray(val: unknown): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) {
    return val
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return String(val)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function searchHaystack(uc: AggregatedUseCase): string {
  const parts: string[] = [uc.title, uc.summary, uc.id];
  if (uc.organizationName) parts.push(uc.organizationName);
  if (uc.tags?.length) parts.push(...uc.tags);
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  const data = loadUseCaseData();
  let useCases = [...(data.useCases || [])];

  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : undefined;
  const country = typeof req.query.country === 'string' ? req.query.country : undefined;
  const sectors = parseQueryArray(req.query.sector);
  const vcFormats = parseQueryArray(req.query.vcFormat);
  const interactionModes = parseQueryArray(req.query.interactionMode);
  const tags = parseQueryArray(req.query.tag);
  const productionDeployment =
    typeof req.query.productionDeployment === 'string'
      ? req.query.productionDeployment.toLowerCase()
      : undefined;

  if (country) {
    const wanted = country.toUpperCase();
    useCases = useCases.filter((uc) => (uc.country || '').toUpperCase() === wanted);
  }

  if (sectors.length > 0) {
    const selected = new Set(sectors);
    useCases = useCases.filter((uc) => uc.sector != null && selected.has(uc.sector));
  }

  if (vcFormats.length > 0) {
    const selected = new Set(vcFormats);
    useCases = useCases.filter((uc) => (uc.vcFormats || []).some((f) => selected.has(f)));
  }

  if (interactionModes.length > 0) {
    const selected = new Set(interactionModes);
    useCases = useCases.filter((uc) => (uc.interactionModes || []).some((m) => selected.has(m)));
  }

  if (tags.length > 0) {
    const selected = new Set(tags.map((t) => t.toLowerCase()));
    useCases = useCases.filter((uc) =>
      (uc.tags || []).some((t) => selected.has(t.toLowerCase())),
    );
  }

  if (productionDeployment === 'yes' || productionDeployment === 'no') {
    useCases = useCases.filter((uc) => uc.productionDeployment === productionDeployment);
  }

  if (search) {
    useCases = useCases.filter((uc) => searchHaystack(uc).includes(search));
  }

  const sortField = typeof req.query.sort === 'string' ? req.query.sort : 'title';
  const sortDir = req.query.direction === 'desc' ? -1 : 1;

  useCases.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'country':
        cmp = (a.country || '').localeCompare(b.country || '');
        break;
      case 'updatedAt':
        cmp = (a.updatedAt || '').localeCompare(b.updatedAt || '');
        break;
      case 'organizationName':
        cmp = (a.organizationName || '').localeCompare(b.organizationName || '');
        break;
      default:
        cmp = (a.title || '').localeCompare(b.title || '');
    }
    return cmp * sortDir;
  });

  const page = toNumber(req.query.page, 0);
  const size = toNumber(req.query.size, 20);
  const start = page * size;
  const paged = useCases.slice(start, start + size);

  res.status(200).json({
    content: paged,
    totalElements: useCases.length,
    totalPages: Math.ceil(useCases.length / size),
    number: page,
    size,
  });
}
