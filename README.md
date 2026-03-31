# Compute Marketplace

![CI](https://github.com/mainlayer/compute-marketplace/actions/workflows/ci.yml/badge.svg) ![License](https://img.shields.io/badge/license-MIT-blue)

GPU compute marketplace powered by Mainlayer. Post compute jobs with GPU requirements, accept agent bids, and release payments upon job completion.

## Overview

This template demonstrates a production-ready compute marketplace where:

- **Job Posters** create GPU compute tasks with specific hardware requirements and pricing
- **Compute Agents** browse jobs, submit bids, and execute workloads on available GPUs
- **Mainlayer** processes secure escrow payments — funds are held until job completion
- **Autonomous Workers** can poll jobs and auto-execute compatible tasks

## Installation

### Frontend (Next.js)

```bash
npm install @mainlayer/sdk next react
```

### Backend (Python Worker)

```bash
pip install mainlayer fastapi httpx aiohttp tenacity
```

## Quick Start

### 1. Create a compute job

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "LLM Fine-tuning with A100",
    "description": "Fine-tune 7B model on custom dataset (8 hours)",
    "gpuType": "A100",
    "vram": 80,
    "duration": 8,
    "pricePerHour": 350
  }'
```

Response:

```json
{
  "success": true,
  "job": {
    "id": "job-1234567890",
    "title": "LLM Fine-tuning with A100",
    "totalPrice": 2800,
    "status": "open",
    "createdAt": "2025-01-20T10:30:00Z"
  }
}
```

### 2. Browse available jobs

```bash
curl http://localhost:3000/api/jobs
```

### 3. Agent submits a bid

```bash
curl -X POST http://localhost:3000/api/bid \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job-1234567890",
    "agentToken": "sk_agent_...",
    "bidAmount": 280000,
    "workerCapabilities": {
      "gpuType": "A100",
      "vram": 80,
      "availableFrom": "2025-01-20T11:00:00Z"
    }
  }'
```

Response:

```json
{
  "success": true,
  "bid": {
    "id": "bid-9876543210",
    "jobId": "job-1234567890",
    "status": "accepted",
    "accessToken": "at_...",
    "message": "Bid accepted. Payment will be processed when job completes."
  }
}
```

### 4. Python worker executes the job

```python
import asyncio
from src.worker import ComputeWorker

async def main():
    worker = ComputeWorker(api_key="sk_...")
    job = await worker.get_available_job()
    result = await worker.execute_job(job)
    await worker.submit_result(job.id, result)

asyncio.run(main())
```

### 5. Release payment upon completion

```bash
curl -X POST http://localhost:3000/api/jobs/job-1234567890/complete \
  -H "Content-Type: application/json" \
  -d '{
    "bidId": "bid-9876543210",
    "result": "Model fine-tuned and uploaded to S3",
    "logs": "Training completed in 7.5 hours"
  }'
```

## API Endpoints

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/jobs` | List available compute jobs |
| `POST` | `/api/jobs` | Create a new compute job |
| `GET` | `/api/jobs/{id}` | Get job details & bids |
| `POST` | `/api/jobs/{id}/complete` | Mark job complete & release escrow |

### Bidding

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/bid` | Submit a bid on a job |
| `GET` | `/api/jobs/{id}/bids` | List bids on a job |

## Features

- **GPU Requirements**: Specify exact GPU type, VRAM, and compute needs
- **Dynamic Pricing**: Price per hour, calculated total based on duration
- **Bidding System**: Accept lowest-cost bids or choose by reputation
- **Escrow Payments**: Mainlayer holds funds securely until job completion
- **Autonomous Workers**: Python agents can auto-detect GPUs and execute jobs
- **Payment Release**: Automatic fund release upon job completion
- **Status Tracking**: Monitor jobs through bidding, running, and completion states
- **Next.js Frontend**: Modern, responsive job dashboard

## Architecture

```
Job Poster (POST /api/jobs)
        ↓
Create Job Resource (Mainlayer)
        ↓
Compute Agent (POST /api/bid with verification)
        ↓
Mainlayer verifies payment capability
        ↓
Agent executes on GPU (Python worker)
        ↓
Job Poster (POST /api/jobs/{id}/complete)
        ↓
Release Escrow → Payment to Agent
```

## Python Worker

The autonomous worker polls for available jobs and executes them:

```python
# backend/worker.py
# - Detect available GPUs via nvidia-smi
# - Poll for compatible compute jobs
# - Execute job workload (training, inference, etc.)
# - Upload results
# - Signal completion for payment release
```

## Development

```bash
# Frontend
npm run dev

# Backend worker
python -m src.worker

# Tests
npm test
pytest tests/
```

## Production Deployment

1. Replace in-memory job store with PostgreSQL/MongoDB
2. Implement persistent bid tracking and winner selection
3. Set up GPU availability monitoring
4. Configure async job execution (Celery, RQ)
5. Add webhook handlers for payment notifications
6. Implement result verification before payment release
7. Set up logging and monitoring (DataDog, Prometheus)

## Support

- Docs: [mainlayer.fr](https://mainlayer.fr)
- Issues: [GitHub Issues](https://github.com/mainlayer/compute-marketplace/issues)
