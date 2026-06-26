interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Rentcast MCP — wraps Rentcast API (api.rentcast.io/v1)
 *
 * BYO key: requires an API key from https://www.rentcast.io/
 * Passed via _apiKey parameter.
 *
 * Tools:
 * - get_rent_estimate: get rental price estimate for a property address
 * - get_property: get property details (beds, baths, sqft, year built, etc.)
 */


const BASE = 'https://api.rentcast.io/v1';

// ── Helpers ───────────────────────────────────────────────────────────

function extractKey(args: Record<string, unknown>): string {
  const key = args._apiKey as string;
  delete args._apiKey;
  if (!key) throw new Error('Rentcast API key required. Get one at https://www.rentcast.io/ and pass via _apiKey.');
  return key;
}

async function rentcastGet(apiKey: string, path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rentcast API error (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Tool definitions ──────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'get_rent_estimate',
    description:
      'Get a rental price estimate for a US property address. Returns estimated monthly rent, price range, and comparable rental data. Example: "1234 Main St, Austin, TX 78701".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'Rentcast API key' },
        address: {
          type: 'string',
          description: 'Full street address with city, state, and ZIP (e.g., "5500 Grand Lake Dr, San Antonio, TX 78244")',
        },
      },
      required: ['_apiKey', 'address'],
    },
  },
  {
    name: 'get_property',
    description:
      'Get property details for a US address. Returns bedrooms, bathrooms, square footage, lot size, year built, property type, and owner info when available.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'Rentcast API key' },
        address: {
          type: 'string',
          description: 'Full street address with city, state, and ZIP (e.g., "123 Oak Ave, Denver, CO 80202")',
        },
      },
      required: ['_apiKey', 'address'],
    },
  },
];

// ── callTool dispatcher ───────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const key = extractKey(args);

  switch (name) {
    case 'get_rent_estimate':
      return getRentEstimate(key, args.address as string);
    case 'get_property':
      return getProperty(key, args.address as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Tool implementations ─────────────────────────────────────────────

async function getRentEstimate(apiKey: string, address: string) {
  const data = (await rentcastGet(apiKey, '/avm/rent/long-term', { address })) as {
    price: number;
    priceRangeLow: number;
    priceRangeHigh: number;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    squareFootage: number;
    latitude: number;
    longitude: number;
    comparables: Array<{
      formattedAddress: string;
      price: number;
      bedrooms: number;
      bathrooms: number;
      squareFootage: number;
      distance: number;
    }>;
  };

  return {
    estimated_rent: data.price ?? null,
    price_range_low: data.priceRangeLow ?? null,
    price_range_high: data.priceRangeHigh ?? null,
    property_type: data.propertyType ?? null,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    square_footage: data.squareFootage ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    comparables_count: (data.comparables ?? []).length,
    comparables: (data.comparables ?? []).slice(0, 10).map((c) => ({
      address: c.formattedAddress ?? null,
      price: c.price ?? null,
      bedrooms: c.bedrooms ?? null,
      bathrooms: c.bathrooms ?? null,
      square_footage: c.squareFootage ?? null,
      distance_miles: c.distance ?? null,
    })),
  };
}

async function getProperty(apiKey: string, address: string) {
  const records = (await rentcastGet(apiKey, '/properties', { address })) as Array<{
    formattedAddress: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    county: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    squareFootage: number;
    lotSize: number;
    yearBuilt: number;
    lastSaleDate: string;
    lastSalePrice: number;
    ownerOccupied: boolean;
    latitude: number;
    longitude: number;
  }>;

  if (!records || records.length === 0) {
    throw new Error(`No property found for address: ${address}`);
  }

  const p = records[0];
  return {
    address: p.formattedAddress ?? null,
    city: p.city ?? null,
    state: p.state ?? null,
    zip: p.zipCode ?? null,
    county: p.county ?? null,
    property_type: p.propertyType ?? null,
    bedrooms: p.bedrooms ?? null,
    bathrooms: p.bathrooms ?? null,
    square_footage: p.squareFootage ?? null,
    lot_size: p.lotSize ?? null,
    year_built: p.yearBuilt ?? null,
    last_sale_date: p.lastSaleDate ?? null,
    last_sale_price: p.lastSalePrice ?? null,
    owner_occupied: p.ownerOccupied ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
  };
}

export default { tools, callTool, meter: { credits: 5 } } satisfies McpToolExport;
