import { NextResponse } from 'next/server';
import { addJob, getJobs } from '@/lib/jobsStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const worker = searchParams.get('worker') ?? undefined;

  return NextResponse.json({ jobs: getJobs(worker) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const vaultAddress = String(body?.vaultAddress ?? '').trim() as `0x${string}`;
    const buyer = String(body?.buyer ?? '').trim() as `0x${string}`;
    const workerAddress = String(body?.workerAddress ?? '').trim() as `0x${string}`;
    const service = String(body?.service ?? '').trim();
    const requirements = String(body?.requirements ?? '').trim();
    const amount = String(body?.amount ?? '').trim();
    const currency = String(body?.currency ?? 'ETH').trim().toUpperCase();

    if (!vaultAddress || !buyer || !workerAddress || !service || !requirements || !amount) {
      return NextResponse.json(
        { error: 'vaultAddress, buyer, workerAddress, service, requirements, amount are required' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(buyer) || !/^0x[a-fA-F0-9]{40}$/.test(workerAddress)) {
      return NextResponse.json({ error: 'buyer/workerAddress must be valid EVM addresses' }, { status: 400 });
    }

    const job = addJob({
      vaultAddress,
      buyer,
      workerAddress,
      service,
      requirements,
      amount,
      currency,
    });

    return NextResponse.json({ status: 'OPEN', job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    );
  }
}
