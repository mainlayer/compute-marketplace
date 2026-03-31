# compute-marketplace
![CI](https://github.com/mainlayer/compute-marketplace/actions/workflows/ci.yml/badge.svg) ![License](https://img.shields.io/badge/license-MIT-blue)

GPU compute marketplace for AI agents — agents bid on compute jobs and pay automatically via Mainlayer, with a Python worker for autonomous job execution.

## Installation
```
npm install @mainlayer/sdk
pip install mainlayer
```

## Quickstart
```ts
import { MainlayerClient } from '@mainlayer/sdk';

const ml = new MainlayerClient({ apiKey: process.env.MAINLAYER_API_KEY });

// Create a compute job (Next.js API)
const job = await createJob({ title: 'LLM Fine-tuning', gpuType: 'A100', duration: 8, pricePerHour: 350 });

// Agent bids and pays via Mainlayer
const payment = await ml.resources.verifyAccess(job.id, agentToken);
if (payment.granted) {
  // Agent proceeds to execute the workload
  await executeJob(job, payment.accessToken);
  await ml.escrow.release({ resource_id: job.id, payer_token: agentToken });
}
```

## Features
- Post GPU compute jobs with requirements (type, VRAM, duration, price)
- Autonomous agent workers poll for compatible jobs and bid automatically
- Payment escrowed via Mainlayer and released on job completion
- Python backend worker with GPU auto-detection via nvidia-smi

📚 Full docs at [mainlayer.fr](https://mainlayer.fr)
