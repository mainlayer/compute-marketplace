"""
Compute Marketplace Agent Worker Example

An autonomous agent that polls for open compute jobs,
places bids, and processes jobs when selected.
"""

import os
import time
import json
import requests
from mainlayer import MainlayerClient

# Initialize Mainlayer Python client
ml = MainlayerClient(api_key=os.environ["MAINLAYER_API_KEY"])
AGENT_TOKEN = os.environ["AGENT_TOKEN"]
MARKETPLACE_URL = os.environ.get("MARKETPLACE_URL", "http://localhost:3000")

# Worker capabilities
WORKER_CAPABILITIES = {
    "gpuType": "A100",
    "vram": 80,
    "availableFrom": "immediate",
}


def get_open_jobs() -> list[dict]:
    """Fetch all open compute jobs from the marketplace."""
    response = requests.get(f"{MARKETPLACE_URL}/api/jobs")
    response.raise_for_status()
    data = response.json()
    return [job for job in data["jobs"] if job["status"] == "open"]


def is_job_compatible(job: dict) -> bool:
    """Check if this worker can handle the job requirements."""
    return (
        job["gpuType"] == WORKER_CAPABILITIES["gpuType"]
        and job["vram"] <= WORKER_CAPABILITIES["vram"]
    )


def place_bid(job: dict) -> dict | None:
    """
    Place a bid on a job and pay via Mainlayer.
    The bid amount equals the job's total price.
    """
    print(f"Placing bid on job: {job['id']} — {job['title']}")

    response = requests.post(
        f"{MARKETPLACE_URL}/api/bid",
        json={
            "jobId": job["id"],
            "agentToken": AGENT_TOKEN,
            "bidAmount": job["totalPrice"],
            "workerCapabilities": WORKER_CAPABILITIES,
        },
    )

    if response.status_code == 200:
        bid = response.json()
        print(f"  Bid accepted: {bid['bid']['id']}")
        return bid
    elif response.status_code == 402:
        # Insufficient funds — check Mainlayer balance
        balance = ml.agents.get_balance(AGENT_TOKEN)
        print(f"  Insufficient funds. Balance: ${balance['available'] / 100:.2f}")
        return None
    else:
        print(f"  Bid failed: {response.json().get('error')}")
        return None


def execute_job(job: dict, access_token: str) -> bool:
    """
    Execute the compute job. This is where the actual GPU work happens.
    Returns True if successful.
    """
    print(f"Executing job: {job['id']}")
    print(f"  GPU: {job['gpuType']} {job['vram']}GB")
    print(f"  Duration: {job['duration']}h")

    # In production, this would:
    # 1. Download the job payload
    # 2. Spin up the GPU workload
    # 3. Monitor progress
    # 4. Upload results
    # 5. Report completion

    # Simulate work
    time.sleep(2)
    print(f"  Job {job['id']} completed successfully")
    return True


def run_worker():
    """Main worker loop — continuously polls for jobs and executes them."""
    print("Agent worker starting...")
    print(f"Capabilities: {json.dumps(WORKER_CAPABILITIES, indent=2)}\n")

    while True:
        try:
            jobs = get_open_jobs()
            print(f"Found {len(jobs)} open jobs")

            for job in jobs:
                if is_job_compatible(job):
                    bid_result = place_bid(job)
                    if bid_result and bid_result.get("success"):
                        access_token = bid_result["bid"]["accessToken"]
                        execute_job(job, access_token)

            print("Waiting 30s before next poll...\n")
            time.sleep(30)

        except KeyboardInterrupt:
            print("\nWorker stopped.")
            break
        except Exception as e:
            print(f"Worker error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    run_worker()
