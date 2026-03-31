import { MainlayerClient } from '@mainlayer/sdk';

const ml = new MainlayerClient({ apiKey: process.env.MAINLAYER_API_KEY! });

/**
 * Example: Submit a compute job to the marketplace
 */
async function submitComputeJob() {
  console.log('Submitting compute job...\n');

  const response = await fetch('http://localhost:3000/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'LLM Fine-tuning — Llama 3 8B',
      description: 'Fine-tune Llama 3 8B on custom instruction dataset (50k examples, 3 epochs)',
      gpuType: 'A100',
      vram: 80,
      duration: 8,
      pricePerHour: 350,
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log(`Job created: ${data.job.id}`);
    console.log(`Title: ${data.job.title}`);
    console.log(`Total price: $${(data.job.totalPrice / 100).toFixed(2)}`);
    console.log(`Status: ${data.job.status}`);
    return data.job;
  } else {
    console.error('Failed to create job:', data.error);
    return null;
  }
}

/**
 * Example: Monitor job status and payment via Mainlayer
 */
async function monitorJob(jobId: string, agentToken: string) {
  console.log(`\nMonitoring job: ${jobId}`);

  const balance = await ml.agents.getBalance(agentToken);
  console.log(`Agent balance: $${(balance.available / 100).toFixed(2)}`);

  const accessCheck = await ml.resources.verifyAccess(jobId, agentToken);
  console.log(`Payment status: ${accessCheck.granted ? 'Verified' : 'Pending'}`);

  return accessCheck;
}

/**
 * Example: List all open jobs available for bidding
 */
async function listOpenJobs() {
  const response = await fetch('http://localhost:3000/api/jobs');
  const data = await response.json();

  const openJobs = data.jobs.filter((job: { status: string }) => job.status === 'open');
  console.log(`\nOpen jobs available for bidding: ${openJobs.length}`);

  for (const job of openJobs) {
    console.log(`\n[${job.id}] ${job.title}`);
    console.log(`  GPU: ${job.gpuType} ${job.vram}GB`);
    console.log(`  Duration: ${job.duration}h`);
    console.log(`  Total price: $${(job.totalPrice / 100).toFixed(2)}`);
    console.log(`  Current bids: ${job.bidsCount}`);
  }

  return openJobs;
}

// Run examples
submitComputeJob()
  .then(() => listOpenJobs())
  .catch(console.error);
