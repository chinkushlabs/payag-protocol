import { getDbPool } from '@/lib/db';

export type AgentReview = {
  rating: number;
  feedback: string;
  reviewer?: `0x${string}`;
  createdAt: string;
};

export type AgentListing = {
  id: string;
  agentName: string;
  service: string;
  price: string;
  currency: string;
  workerAddress: `0x${string}`;
  endpoint?: string;
  status: 'OPEN' | 'PAUSED';
  createdAt: string;
  description?: string;
  capabilities?: string[];
  completedJobs: number;
  rating: number | null;
  reviewCount: number;
  reviews?: AgentReview[];
};

export type GenesisMeta = {
  hasGenesisBadge: boolean;
  platformFee: number;
  feeFreeUntil: string | null;
};

const seedListings: AgentListing[] = [
  {
    id: 'list_1',
    agentName: 'Python Debugging Bot',
    service: 'Python Debugging Bot',
    price: '5',
    currency: 'USDC',
    workerAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    endpoint: 'https://agent.example/python-debugger',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Debugs Python traces, fixes runtime issues, and returns patch-ready output.',
    capabilities: ['Traceback diagnosis', 'Dependency conflict fixes', 'Patch proposals'],
    completedJobs: 14,
    rating: 4.9,
    reviewCount: 14,
    reviews: [],
  },
  {
    id: 'list_2',
    agentName: 'On-Chain Data Scraper',
    service: 'On-Chain Data Scraper',
    price: '10',
    currency: 'USDC',
    workerAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    endpoint: 'https://agent.example/onchain-scraper',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Extracts and normalizes wallet, token, and contract activity across chains.',
    capabilities: ['Token transfer indexing', 'Contract event parsing', 'CSV/JSON exports'],
    completedJobs: 8,
    rating: 4.7,
    reviewCount: 8,
    reviews: [],
  },
  {
    id: 'list_3',
    agentName: 'ML Model Fine-Tuner',
    service: 'ML Model Fine-Tuner',
    price: '50',
    currency: 'USDC',
    workerAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    endpoint: 'https://agent.example/ml-finetuner',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Tunes model checkpoints with reproducible prompts and eval artifacts.',
    capabilities: ['Dataset prep', 'Hyperparameter tuning', 'Eval summary reports'],
    completedJobs: 2,
    rating: 5,
    reviewCount: 2,
    reviews: [],
  },
  {
    id: 'list_4',
    agentName: 'Smart Contract Auditor',
    service: 'Smart Contract Auditor',
    price: '0.05',
    currency: 'ETH',
    workerAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    endpoint: 'https://agent.example/sc-auditor',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Performs security-focused contract reviews with exploit scenario mapping.',
    capabilities: ['Static analysis', 'Access-control review', 'Reentrancy checks'],
    completedJobs: 21,
    rating: 4.9,
    reviewCount: 21,
    reviews: [],
  },
];

const GENESIS_START_ID = 5;
const GENESIS_END_ID = 14;
const GENESIS_FEE_FREE_DAYS = 30;

let schemaReady = false;

function getListingSequence(id: string): number | null {
  const match = /^list_(\d+)$/.exec(id);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function mapRow(row: any): AgentListing {
  return {
    id: row.id,
    agentName: row.agent_name,
    service: row.service,
    price: row.price,
    currency: row.currency,
    workerAddress: row.worker_address,
    endpoint: row.endpoint ?? undefined,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    description: row.description ?? undefined,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
    completedJobs: Number(row.completed_jobs ?? 0),
    rating:
      row.rating === null || row.rating === undefined ? null : Number(row.rating),
    reviewCount: Number(row.review_count ?? 0),
    reviews: Array.isArray(row.reviews) ? row.reviews : [],
  };
}

async function seedRegistryIfEmpty() {
  const db = getDbPool();
  const countResult = await db.query(`select count(*)::int as count from payag_registry`);
  if ((countResult.rows[0]?.count ?? 0) > 0) return;

  for (const listing of seedListings) {
    await db.query(
      `
      insert into payag_registry (
        id, agent_name, service, price, currency, worker_address, endpoint, status,
        created_at, description, capabilities, completed_jobs, rating, review_count, reviews
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15::jsonb
      )
      on conflict (id) do nothing
      `,
      [
        listing.id,
        listing.agentName,
        listing.service,
        listing.price,
        listing.currency,
        listing.workerAddress,
        listing.endpoint ?? null,
        listing.status,
        listing.createdAt,
        listing.description ?? null,
        JSON.stringify(listing.capabilities ?? []),
        listing.completedJobs,
        listing.rating,
        listing.reviewCount,
        JSON.stringify(listing.reviews ?? []),
      ]
    );
  }
}

async function ensureRegistrySchema() {
  if (schemaReady) return;
  const db = getDbPool();

  await db.query(`
    create table if not exists payag_registry (
      id text primary key,
      agent_name text not null,
      service text not null,
      price text not null,
      currency text not null,
      worker_address text not null,
      endpoint text,
      status text not null check (status in ('OPEN', 'PAUSED')),
      created_at timestamptz not null default now(),
      description text,
      capabilities jsonb not null default '[]'::jsonb,
      completed_jobs integer not null default 0,
      rating numeric(3,1),
      review_count integer not null default 0,
      reviews jsonb not null default '[]'::jsonb
    );
  `);

  await db.query(`
    create index if not exists idx_payag_registry_created_at
      on payag_registry (created_at desc);
  `);

  await db.query(`
    create index if not exists idx_payag_registry_worker
      on payag_registry (lower(worker_address));
  `);

  await db.query(`
    create index if not exists idx_payag_registry_service
      on payag_registry (service);
  `);

  await seedRegistryIfEmpty();
  schemaReady = true;
}

async function getNextListingId(): Promise<string> {
  await ensureRegistrySchema();
  const db = getDbPool();
  const result = await db.query(`select id from payag_registry`);
  const maxSequence = result.rows.reduce((max, row) => {
    const sequence = getListingSequence(row.id);
    return sequence !== null ? Math.max(max, sequence) : max;
  }, 0);

  return `list_${maxSequence + 1}`;
}

export function getGenesisMeta(listing: Pick<AgentListing, 'id' | 'createdAt'>): GenesisMeta {
  const sequence = getListingSequence(listing.id);
  const hasGenesisBadge =
    sequence !== null && sequence >= GENESIS_START_ID && sequence <= GENESIS_END_ID;

  if (!hasGenesisBadge) {
    return {
      hasGenesisBadge: false,
      platformFee: 3.5,
      feeFreeUntil: null,
    };
  }

  const createdAtMs = Date.parse(listing.createdAt);
  if (!Number.isFinite(createdAtMs)) {
    return {
      hasGenesisBadge: true,
      platformFee: 3.5,
      feeFreeUntil: null,
    };
  }

  const feeFreeUntilMs = createdAtMs + GENESIS_FEE_FREE_DAYS * 24 * 60 * 60 * 1000;
  const withinFeeWindow = Date.now() <= feeFreeUntilMs;

  return {
    hasGenesisBadge: true,
    platformFee: withinFeeWindow ? 0 : 3.5,
    feeFreeUntil: new Date(feeFreeUntilMs).toISOString(),
  };
}

export async function getListings(): Promise<AgentListing[]> {
  await ensureRegistrySchema();
  const db = getDbPool();
  const result = await db.query(`select * from payag_registry order by created_at desc`);
  return result.rows.map(mapRow);
}

export async function getListingById(id: string): Promise<AgentListing | undefined> {
  await ensureRegistrySchema();
  const db = getDbPool();
  const result = await db.query(`select * from payag_registry where id = $1 limit 1`, [id]);
  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}

export async function addListing(
  input: Omit<AgentListing, 'id' | 'createdAt' | 'status' | 'reviewCount' | 'reviews'> & {
    status?: AgentListing['status'];
  }
): Promise<AgentListing> {
  await ensureRegistrySchema();
  const db = getDbPool();

  const listing: AgentListing = {
    id: await getNextListingId(),
    agentName: input.agentName,
    service: input.service,
    price: input.price,
    currency: input.currency,
    workerAddress: input.workerAddress,
    endpoint: input.endpoint,
    status: input.status ?? 'OPEN',
    createdAt: new Date().toISOString(),
    description: input.description,
    capabilities: input.capabilities ?? [],
    completedJobs: Math.max(0, Math.floor(input.completedJobs ?? 0)),
    rating:
      input.rating === null || input.rating === undefined
        ? null
        : Math.min(5, Math.max(1, input.rating)),
    reviewCount:
      input.rating === null || input.rating === undefined
        ? 0
        : Math.max(0, Math.floor(input.completedJobs ?? 0)),
    reviews: [],
  };

  await db.query(
    `
    insert into payag_registry (
      id, agent_name, service, price, currency, worker_address, endpoint, status,
      created_at, description, capabilities, completed_jobs, rating, review_count, reviews
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15::jsonb
    )
    `,
    [
      listing.id,
      listing.agentName,
      listing.service,
      listing.price,
      listing.currency,
      listing.workerAddress,
      listing.endpoint ?? null,
      listing.status,
      listing.createdAt,
      listing.description ?? null,
      JSON.stringify(listing.capabilities ?? []),
      listing.completedJobs,
      listing.rating,
      listing.reviewCount,
      JSON.stringify(listing.reviews ?? []),
    ]
  );

  return listing;
}

export async function applyListingReview(input: {
  listingId?: string;
  workerAddress?: string;
  service?: string;
  rating: number;
  feedback: string;
  reviewer?: `0x${string}`;
}): Promise<AgentListing | undefined> {
  await ensureRegistrySchema();
  const db = getDbPool();

  const target = input.listingId
    ? await getListingById(input.listingId)
    : (await getListings()).find(
        (l) =>
          (!input.workerAddress || l.workerAddress.toLowerCase() === input.workerAddress.toLowerCase()) &&
          (!input.service || l.service === input.service)
      );

  if (!target) return undefined;

  const normalizedRating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const currentRating = target.rating ?? 0;
  const currentReviewCount = target.reviewCount ?? 0;
  const nextReviewCount = currentReviewCount + 1;
  const nextRating = (currentRating * currentReviewCount + normalizedRating) / nextReviewCount;
  const nextReviews = [
    {
      rating: normalizedRating,
      feedback: input.feedback,
      reviewer: input.reviewer,
      createdAt: new Date().toISOString(),
    },
    ...(target.reviews ?? []),
  ];

  const result = await db.query(
    `
    update payag_registry
    set review_count = $2,
        rating = $3,
        reviews = $4::jsonb
    where id = $1
    returning *
    `,
    [
      target.id,
      nextReviewCount,
      Number(nextRating.toFixed(1)),
      JSON.stringify(nextReviews),
    ]
  );

  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}

export async function markListingCompleted(input: {
  listingId?: string;
  workerAddress?: string;
  service?: string;
}): Promise<AgentListing | undefined> {
  await ensureRegistrySchema();
  const db = getDbPool();

  const target = input.listingId
    ? await getListingById(input.listingId)
    : (await getListings()).find(
        (l) =>
          (!input.workerAddress ||
            l.workerAddress.toLowerCase() === input.workerAddress.toLowerCase()) &&
          (!input.service || l.service === input.service)
      );

  if (!target) return undefined;

  const result = await db.query(
    `
    update payag_registry
    set completed_jobs = $2
    where id = $1
    returning *
    `,
    [target.id, (target.completedJobs ?? 0) + 1]
  );

  return result.rowCount ? mapRow(result.rows[0]) : undefined;
}
