import { NextResponse } from 'next/server';
import {
  addJob,
  addJobActivity,
  getJobs,
  openJobDispute,
} from '@/lib/jobsStore';
import { markSubmissionDisputedByVaultMilestone } from '@/lib/arbiterQueueDb';

const DISPUTE_WINDOW_HOURS = 24;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const worker = searchParams.get('worker') ?? undefined;

  return NextResponse.json({ jobs: await getJobs(worker) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (String(body?.action ?? '').trim().toUpperCase() === 'FILE_DISPUTE') {
      const vaultAddress = String(body?.vaultAddress ?? '').trim() as `0x${string}`;
      const buyer = String(body?.buyer ?? '').trim() as `0x${string}`;
      const reason = String(body?.reason ?? '').trim();
      const milestoneIndex = Number(body?.milestoneIndex ?? 0);

      if (!vaultAddress || !buyer || !reason || Number.isNaN(milestoneIndex) || milestoneIndex < 0) {
        return NextResponse.json(
          { error: 'vaultAddress, buyer, reason, milestoneIndex are required' },
          { status: 400 }
        );
      }

      const dispute = await openJobDispute({
        vaultAddress,
        buyer,
        reason,
        maxHours: DISPUTE_WINDOW_HOURS,
      });

      if (!dispute.ok) {
        return NextResponse.json({ error: dispute.error }, { status: 400 });
      }

      const submission = await markSubmissionDisputedByVaultMilestone({
        vaultAddress,
        milestoneIndex,
        reason,
      });

      if (!submission) {
        return NextResponse.json(
          {
            error:
              'No queued proof found for this vault/milestone. Worker must submit proof first.',
          },
          { status: 400 }
        );
      }

      await addJobActivity(vaultAddress, {
        actor: 'BUYER',
        message: `Buyer filed dispute (${DISPUTE_WINDOW_HOURS}h window): ${reason}`,
      });

      return NextResponse.json({
        status: 'DISPUTED',
        disputeWindowHours: DISPUTE_WINDOW_HOURS,
        vaultAddress,
        milestoneIndex,
        submissionId: submission.id,
      });
    }

    const vaultAddress = String(body?.vaultAddress ?? '').trim() as `0x${string}`;
    const buyer = String(body?.buyer ?? '').trim() as `0x${string}`;
    const workerAddress = String(body?.workerAddress ?? '').trim() as `0x${string}`;
    const listingId = body?.listingId ? String(body.listingId).trim() : undefined;
    const service = String(body?.service ?? '').trim();
    const requirements = String(body?.requirements ?? '').trim();
    const amount = String(body?.amount ?? '').trim();
    const currency = String(body?.currency ?? 'ETH').trim().toUpperCase();
    const taskHash = String(body?.taskHash ?? '').trim() as `0x${string}`;
    const latestProofPayload = body?.latestProofPayload
      ? String(body.latestProofPayload)
      : undefined;

    if (!vaultAddress || !buyer || !workerAddress || !service || !requirements || !amount) {
      return NextResponse.json(
        { error: 'vaultAddress, buyer, workerAddress, service, requirements, amount are required' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(buyer) || !/^0x[a-fA-F0-9]{40}$/.test(workerAddress)) {
      return NextResponse.json({ error: 'buyer/workerAddress must be valid EVM addresses' }, { status: 400 });
    }

    const job = await addJob({
      vaultAddress,
      buyer,
      workerAddress,
      listingId,
      service,
      requirements,
      amount,
      currency,
      taskHash: /^0x[a-fA-F0-9]{64}$/.test(taskHash) ? taskHash : undefined,
      latestProofPayload,
    });

    return NextResponse.json({ status: 'OPEN', job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    );
  }
}
