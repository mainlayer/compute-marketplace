"""
Compute Marketplace Worker Backend

A production-ready worker process that connects to the marketplace,
bids on compatible jobs, and executes GPU workloads.
"""

import os
import sys
import time
import logging
import json
import subprocess
from dataclasses import dataclass
from typing import Optional
import requests

from mainlayer_pay import (
    verify_agent_payment,
    get_agent_balance,
    release_payment_on_completion,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

MARKETPLACE_URL = os.environ.get("MARKETPLACE_URL", "http://localhost:3000")
AGENT_TOKEN = os.environ["AGENT_TOKEN"]
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))


@dataclass
class WorkerConfig:
    gpu_type: str
    vram_gb: int
    max_concurrent_jobs: int = 1

    def to_dict(self) -> dict:
        return {
            "gpuType": self.gpu_type,
            "vram": self.vram_gb,
            "availableFrom": "immediate",
        }


def detect_gpu_config() -> WorkerConfig:
    """Auto-detect GPU configuration from nvidia-smi."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            line = result.stdout.strip().split("\n")[0]
            name, memory = line.split(", ")
            vram_mb = int(memory.replace(" MiB", ""))
            vram_gb = vram_mb // 1024
            logger.info(f"Detected GPU: {name.strip()} ({vram_gb}GB)")
            return WorkerConfig(gpu_type=name.strip(), vram_gb=vram_gb)
    except Exception:
        pass

    # Fallback to env vars or defaults
    return WorkerConfig(
        gpu_type=os.environ.get("GPU_TYPE", "A100"),
        vram_gb=int(os.environ.get("GPU_VRAM_GB", "80")),
    )


def fetch_open_jobs() -> list[dict]:
    """Fetch open jobs from the marketplace API."""
    response = requests.get(f"{MARKETPLACE_URL}/api/jobs", timeout=10)
    response.raise_for_status()
    data = response.json()
    return [job for job in data.get("jobs", []) if job["status"] == "open"]


def submit_bid(job: dict, config: WorkerConfig) -> Optional[dict]:
    """Submit a bid and pay via Mainlayer."""
    logger.info(f"Submitting bid for job {job['id']}: {job['title']}")

    # Check balance before bidding
    balance = get_agent_balance(AGENT_TOKEN)
    if balance["available"] < job["totalPrice"]:
        logger.warning(
            f"Insufficient balance: ${balance['available']/100:.2f} < ${job['totalPrice']/100:.2f}"
        )
        return None

    response = requests.post(
        f"{MARKETPLACE_URL}/api/bid",
        json={
            "jobId": job["id"],
            "agentToken": AGENT_TOKEN,
            "bidAmount": job["totalPrice"],
            "workerCapabilities": config.to_dict(),
        },
        timeout=15,
    )

    if response.status_code == 200:
        result = response.json()
        logger.info(f"Bid accepted: {result['bid']['id']}")
        return result
    elif response.status_code == 402:
        logger.warning("Payment verification failed")
        return None
    else:
        logger.error(f"Bid error {response.status_code}: {response.json()}")
        return None


def execute_job(job: dict, access_token: str) -> bool:
    """
    Execute a compute job. Override this for your specific workload.
    Returns True on success.
    """
    logger.info(f"Starting job execution: {job['id']}")
    logger.info(f"  Type: {job.get('description', 'N/A')}")

    # TODO: Implement actual job execution logic:
    # 1. Download job payload from secure URL
    # 2. Set up compute environment
    # 3. Run training/inference/generation
    # 4. Upload results
    # 5. Return completion status

    time.sleep(1)  # Simulate work
    logger.info(f"Job {job['id']} completed")
    return True


def is_compatible(job: dict, config: WorkerConfig) -> bool:
    """Check if this worker can handle the job."""
    return (
        job.get("gpuType") == config.gpu_type
        and job.get("vram", 0) <= config.vram_gb
    )


def run():
    """Main worker event loop."""
    config = detect_gpu_config()
    logger.info(f"Worker started with config: {json.dumps(config.to_dict())}")

    active_jobs = 0

    while True:
        try:
            if active_jobs >= config.max_concurrent_jobs:
                time.sleep(5)
                continue

            jobs = fetch_open_jobs()
            logger.info(f"Found {len(jobs)} open jobs")

            for job in jobs:
                if not is_compatible(job, config):
                    continue

                bid_result = submit_bid(job, config)
                if not bid_result:
                    continue

                access_token = bid_result["bid"]["accessToken"]
                active_jobs += 1

                success = execute_job(job, access_token)
                active_jobs -= 1

                if success:
                    release_payment_on_completion(job["id"], AGENT_TOKEN)
                    logger.info(f"Payment released for job {job['id']}")

            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            logger.info("Worker shutting down...")
            sys.exit(0)
        except requests.RequestException as e:
            logger.error(f"Network error: {e}")
            time.sleep(10)
        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    run()
