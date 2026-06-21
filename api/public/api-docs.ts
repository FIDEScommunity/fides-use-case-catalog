import type { VercelRequest, VercelResponse } from '@vercel/node';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'FIDES Use Case Catalog API',
    version: '1.0.0',
    description:
      'Public API for querying real-world verifiable credential use cases in the FIDES ecosystem (e.g. age verification, mDL login, digital travel credentials).',
  },
  servers: [{ url: '/api/public' }],
  paths: {
    '/usecase': {
      get: {
        summary: 'List use cases',
        operationId: 'listUseCases',
        parameters: [
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search by title, summary, id, organization name, or tags',
          },
          {
            name: 'country',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by ISO 3166-1 alpha-2 country code',
          },
          {
            name: 'sector',
            in: 'query',
            schema: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'public_sector',
                  'finance',
                  'trade',
                  'supply_chain',
                  'manufacturing',
                  'energy',
                  'agriculture',
                  'food',
                  'retail',
                  'healthcare',
                  'education',
                  'construction',
                  'mobility',
                  'digital',
                ],
              },
            },
            description: 'Filter by sector code (OR semantics).',
          },
          {
            name: 'vcFormat',
            in: 'query',
            schema: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'sd_jwt_vc',
                  'mdoc',
                  'jwt_vc',
                  'vcdm_1_1',
                  'vcdm_2_0',
                  'anoncreds',
                  'idemix',
                  'apple_wallet_pass',
                  'google_wallet_pass',
                  'acdc',
                ],
              },
            },
            description: 'Filter by credential format used (OR semantics).',
          },
          {
            name: 'interactionMode',
            in: 'query',
            schema: {
              type: 'array',
              items: { type: 'string', enum: ['proximity', 'remote', 'both'] },
            },
            description: 'Filter by interaction mode (OR semantics).',
          },
          {
            name: 'tag',
            in: 'query',
            schema: { type: 'array', items: { type: 'string' } },
            description: 'Filter by tag (OR semantics).',
          },
          {
            name: 'productionDeployment',
            in: 'query',
            schema: { type: 'string', enum: ['yes', 'no'] },
            description: 'Filter by whether the use case is in production.',
          },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['title', 'country', 'updatedAt', 'organizationName'],
              default: 'title',
            },
          },
          {
            name: 'direction',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Paginated list of use cases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: { type: 'array', items: { $ref: '#/components/schemas/UseCase' } },
                    totalElements: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    number: { type: 'integer' },
                    size: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/usecase/{id}': {
      get: {
        summary: 'Get use case by id',
        operationId: 'getUseCaseById',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Use case catalog id (URL-encoded when needed)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Use case',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UseCase' },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      UseCaseLinkRef: {
        type: 'object',
        properties: {
          refId: { type: 'string', nullable: true },
          labelRaw: { type: 'string' },
          url: { type: 'string', nullable: true },
          source: { type: 'string' },
          walletType: { type: 'string', nullable: true },
        },
      },
      UseCaseLinks: {
        type: 'object',
        properties: {
          personalWallets: { type: 'array', items: { $ref: '#/components/schemas/UseCaseLinkRef' } },
          businessWallets: { type: 'array', items: { $ref: '#/components/schemas/UseCaseLinkRef' } },
          issuers: { type: 'array', items: { $ref: '#/components/schemas/UseCaseLinkRef' } },
          credentials: { type: 'array', items: { $ref: '#/components/schemas/UseCaseLinkRef' } },
          organizations: { type: 'array', items: { $ref: '#/components/schemas/UseCaseLinkRef' } },
          rps: { type: 'array', items: { $ref: '#/components/schemas/UseCaseLinkRef' } },
        },
      },
      UseCase: {
        type: 'object',
        required: ['id', 'title', 'summary'],
        properties: {
          id: { type: 'string', example: 'age-verification-online-purchase' },
          title: { type: 'string' },
          summary: { type: 'string' },
          sector: { type: 'string' },
          organizationName: { type: 'string' },
          productionDeployment: { type: 'string', enum: ['yes', 'no', ''] },
          status: { type: 'string' },
          country: { type: 'string' },
          updatedAt: { type: 'string', format: 'date-time' },
          publishedAt: { type: 'string', format: 'date-time', nullable: true },
          moreInfoUrl: { type: 'string', format: 'uri' },
          userJourney: { type: 'string' },
          imageUrl: { type: 'string', format: 'uri' },
          imageUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
          tags: { type: 'array', items: { type: 'string' } },
          interactionModes: { type: 'array', items: { type: 'string' } },
          vcFormats: { type: 'array', items: { type: 'string' } },
          issuanceProtocols: { type: 'array', items: { type: 'string' } },
          presentationProtocols: { type: 'array', items: { type: 'string' } },
          interopProfiles: { type: 'array', items: { type: 'string' } },
          links: { $ref: '#/components/schemas/UseCaseLinks' },
        },
      },
    },
  },
};

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json(spec);
}
