import Link from 'next/link';

interface ComputeJob {
  id: string;
  title: string;
  description: string;
  gpuType: string;
  vram: number;
  duration: number; // hours
  pricePerHour: number; // cents
  totalPrice: number; // cents
  status: 'open' | 'bidding' | 'running' | 'completed';
  bidsCount: number;
  createdAt: string;
}

async function getJobs(): Promise<ComputeJob[]> {
  return [
    {
      id: 'job-001',
      title: 'LLM Fine-tuning Job',
      description: 'Fine-tune a 7B parameter model on custom dataset. ~50k examples, 3 epochs.',
      gpuType: 'A100',
      vram: 80,
      duration: 8,
      pricePerHour: 350,
      totalPrice: 2800,
      status: 'open',
      bidsCount: 3,
      createdAt: '2024-03-15T10:00:00Z',
    },
    {
      id: 'job-002',
      title: 'Image Generation Batch',
      description: 'Generate 10,000 images using Stable Diffusion XL with custom LoRA weights.',
      gpuType: 'H100',
      vram: 80,
      duration: 4,
      pricePerHour: 500,
      totalPrice: 2000,
      status: 'bidding',
      bidsCount: 7,
      createdAt: '2024-03-15T09:30:00Z',
    },
    {
      id: 'job-003',
      title: 'Vector Embedding Generation',
      description: 'Generate embeddings for 5M documents using sentence-transformers.',
      gpuType: 'RTX 4090',
      vram: 24,
      duration: 6,
      pricePerHour: 120,
      totalPrice: 720,
      status: 'open',
      bidsCount: 1,
      createdAt: '2024-03-15T11:00:00Z',
    },
  ];
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  bidding: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-600',
};

export default async function HomePage() {
  const jobs = await getJobs();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Compute Marketplace</h1>
          <div className="flex gap-3">
            <Link
              href="/submit-job"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Submit Job
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">GPU Compute Jobs</h2>
          <p className="text-gray-600">
            AI agents bid for compute jobs and pay automatically via Mainlayer. Post a job or deploy a worker agent.
          </p>
        </div>

        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${statusColors[job.status]}`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{job.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>GPU: <strong className="text-gray-700">{job.gpuType}</strong></span>
                    <span>VRAM: <strong className="text-gray-700">{job.vram}GB</strong></span>
                    <span>Duration: <strong className="text-gray-700">{job.duration}h</strong></span>
                    <span>Bids: <strong className="text-gray-700">{job.bidsCount}</strong></span>
                  </div>
                </div>
                <div className="ml-6 text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${(job.totalPrice / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    ${(job.pricePerHour / 100).toFixed(2)}/hr
                  </div>
                  <Link
                    href={`/api/bid?jobId=${job.id}`}
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Place Bid
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
