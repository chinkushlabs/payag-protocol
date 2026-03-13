import { NextResponse } from 'next/server';
import { generateProofHash } from '@/lib/payagProof';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const service = String(body?.service ?? '').trim();
    const requirements = String(body?.requirements ?? '').trim();
    const budget = String(body?.budget ?? '').trim();
    const currency = String(body?.currency ?? '').trim().toUpperCase();
    const worker = String(body?.worker ?? '').trim().toLowerCase();

    if (!service) {
      return NextResponse.json({ error: 'service is required' }, { status: 400 });
    }

    if (!requirements) {
      return NextResponse.json({ error: 'requirements are required' }, { status: 400 });
    }

    if (!budget || Number.isNaN(Number(budget)) || Number(budget) <= 0) {
      return NextResponse.json({ error: 'budget must be a positive number' }, { status: 400 });
    }

    if (!currency) {
      return NextResponse.json({ error: 'currency is required' }, { status: 400 });
    }

    if (!/^0x[a-f0-9]{40}$/.test(worker)) {
      return NextResponse.json({ error: 'worker must be a valid EVM address' }, { status: 400 });
    }

    const proofPayload = {
      service,
      requirements,
      budget,
      currency,
      worker,
    };

    const proofString = JSON.stringify(proofPayload);
    const taskHash = generateProofHash(proofString);

    return NextResponse.json({
      proofString,
      taskHash,
      proofPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build create payload' },
      { status: 500 }
    );
  }
}
