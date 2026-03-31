import { NextRequest, NextResponse } from 'next/server';
import { verifyComputePayment } from '@/lib/mainlayer';

interface BidRequest {
  jobId: string;
  agentToken: string;
  bidAmount: number; // cents
  workerCapabilities: {
    gpuType: string;
    vram: number;
    availableFrom: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BidRequest = await request.json();
    const { jobId, agentToken, bidAmount, workerCapabilities } = body;

    if (!jobId || !agentToken || !bidAmount || !workerCapabilities) {
      return NextResponse.json(
        { error: 'jobId, agentToken, bidAmount, and workerCapabilities are required' },
        { status: 400 }
      );
    }

    if (bidAmount <= 0) {
      return NextResponse.json({ error: 'bidAmount must be greater than 0' }, { status: 400 });
    }

    // Verify the agent has sufficient funds via Mainlayer
    const paymentResult = await verifyComputePayment(jobId, agentToken);

    if (!paymentResult.granted) {
      return NextResponse.json(
        {
          error: 'Insufficient funds or payment verification failed.',
          paymentRequired: true,
        },
        { status: 402 }
      );
    }

    const bid = {
      id: `bid-${Date.now()}`,
      jobId,
      agentToken: agentToken.substring(0, 8) + '...', // masked
      bidAmount,
      workerCapabilities,
      accessToken: paymentResult.accessToken,
      status: 'accepted',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      bid,
      message: 'Bid accepted. Payment will be processed when job completes.',
    });
  } catch (error) {
    console.error('Bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
