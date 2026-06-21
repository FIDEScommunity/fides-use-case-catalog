/**
 * GET /api/public/usecase/:id
 * Returns one use case by catalog id (e.g. age-verification-online-purchase).
 * Encode reserved characters in the path.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadUseCaseData } from '../../../lib/aggregatedData';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    res.status(405).json({
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const idRaw = req.query.id;
  const idParam = Array.isArray(idRaw) ? idRaw[0] : idRaw;
  if (typeof idParam !== 'string' || !idParam.length) {
    res.status(400).json({
      message: 'Missing use case id',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  let id: string;
  try {
    id = decodeURIComponent(idParam);
  } catch {
    res.status(400).json({
      message: 'Invalid use case id encoding',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const data = loadUseCaseData();
  const useCase = (data.useCases || []).find((uc) => uc.id === id);

  if (!useCase) {
    res.status(404).json({
      message: 'Use case not found',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json(useCase);
}
