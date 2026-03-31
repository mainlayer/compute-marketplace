import { NextRequest, NextResponse } from 'next/server';
import { createJobResource } from '@/lib/mainlayer';

interface ComputeJob {
  id: string;
  title: string;
  description: string;
  gpuType: string;
  vram: number;
  duration: number;
  pricePerHour: number;
  totalPrice: number;
  status: 'open' | 'bidding' | 'running' | 'completed';
  bidsCount: number;
  createdAt: string;
}

// In-memory store; replace with a database in production
const jobs: ComputeJob[] = [
  {
    id: 'job-001',
    title: 'LLM Fine-tuning Job',
    description: 'Fine-tune a 7B parameter model on custom dataset.',
    gpuType: 'A100',
    vram: 80,
    duration: 8,
    pricePerHour: 350,
    totalPrice: 2800,
    status: 'open',
    bidsCount: 3,
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, gpuType, vram, duration, pricePerHour } = body;

    if (!title || !gpuType || !vram || !duration || !pricePerHour) {
      return NextResponse.json(
        { error: 'title, gpuType, vram, duration, and pricePerHour are required' },
        { status: 400 }
      );
    }

    const jobId = `job-${Date.now()}`;
    const totalPrice = duration * pricePerHour;

    // Register job as a payable resource in Mainlayer
    await createJobResource(jobId, totalPrice);

    const newJob: ComputeJob = {
      id: jobId,
      title,
      description: description ?? '',
      gpuType,
      vram,
      duration,
      pricePerHour,
      totalPrice,
      status: 'open',
      bidsCount: 0,
      createdAt: new Date().toISOString(),
    };

    jobs.push(newJob);

    return NextResponse.json({ success: true, job: newJob }, { status: 201 });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
