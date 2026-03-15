import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { createTask } from '@/lib/taskStore';
import { generateProofHash } from '@/lib/payagProof';

function buildProofString(input: {
  service: string;
  requirements?: string;
  payment: string;
  token: string;
  workerWallet: `0x${string}`;
}) {
  return JSON.stringify({
    service: input.service,
    requirements: input.requirements ?? '',
    budget: input.payment,
    currency: input.token,
    worker: input.workerWallet,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const buyerAgentId = String(body?.buyerAgentId ?? '').trim();
    const buyerWallet = String(body?.buyerWallet ?? '').trim() as `0x${string}`;
    const workerListingId = String(body?.workerListingId ?? '').trim() || undefined;
    const workerWallet = String(body?.workerWallet ?? '').trim() as `0x${string}`;
    const description = String(body?.description ?? '').trim();
    const requirements = String(body?.requirements ?? '').trim();
    const payment = String(body?.payment ?? '').trim();
    const token = String(body?.token ?? 'ETH').trim().toUpperCase();
    const vaultAddressRaw = String(body?.vaultAddress ?? '').trim();
    const vaultAddress = vaultAddressRaw ? (vaultAddressRaw as `0x${string}`) : undefined;

    if (!buyerAgentId || !buyerWallet || !workerWallet || !description || !payment || !token) {
      return NextResponse.json(
        { error: 'buyerAgentId, buyerWallet, workerWallet, description, payment, token are required' },
        { status: 400 }
      );
    }

    if (!isAddress(buyerWallet) || !isAddress(workerWallet)) {
      return NextResponse.json({ error: 'buyerWallet and workerWallet must be valid EVM addresses' }, { status: 400 });
    }

    if (vaultAddress && !isAddress(vaultAddress)) {
      return NextResponse.json({ error: 'vaultAddress must be a valid EVM address' }, { status: 400 });
    }

    const proofString = buildProofString({
      service: description,
      requirements,
      payment,
      token,
      workerWallet,
    });

    const taskHash = generateProofHash(proofString);

    const task = await createTask({
      vaultAddress,
      buyerAgentId,
      workerListingId,
      buyerWallet,
      workerWallet,
      description,
      requirements,
      payment,
      token,
      proofString,
    });

    return NextResponse.json({
      taskId: task.id,
      vaultAddress: task.vaultAddress ?? null,
      status: task.status,
      proofString,
      taskHash,
      createdAt: task.createdAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    );
  }
}
