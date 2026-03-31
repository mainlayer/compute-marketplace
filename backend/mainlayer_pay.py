"""
Mainlayer payment utilities for the compute marketplace backend.
"""

import os
from mainlayer import MainlayerClient

ml = MainlayerClient(api_key=os.environ["MAINLAYER_API_KEY"])


def verify_agent_payment(job_id: str, agent_token: str) -> dict:
    """
    Verify that an agent has paid for a compute job.
    Returns a dict with 'granted' and optional 'access_token'.
    """
    result = ml.resources.verify_access(job_id, agent_token)
    return {
        "granted": result.granted,
        "access_token": result.access_token,
    }


def register_job_as_resource(job_id: str, price_cents: int, title: str) -> dict:
    """
    Register a compute job as a payable Mainlayer resource.
    Agents must pay this price to bid on the job.
    """
    resource = ml.resources.create(
        id=job_id,
        name=f"Compute Job: {title}",
        price=price_cents,
        metadata={"type": "compute_job"},
    )
    return {
        "resource_id": resource.id,
        "price": resource.price,
        "created_at": resource.created_at,
    }


def get_agent_balance(agent_token: str) -> dict:
    """
    Retrieve the current balance for an agent token.
    Used to determine if an agent can afford to bid.
    """
    balance = ml.agents.get_balance(agent_token)
    return {
        "available": balance.available,
        "pending": balance.pending,
        "currency": "usd",
    }


def release_payment_on_completion(job_id: str, agent_token: str) -> dict:
    """
    Release the escrowed payment upon job completion.
    Call this after verifying job output quality.
    """
    result = ml.escrow.release(
        resource_id=job_id,
        payer_token=agent_token,
    )
    return {
        "released": result.released,
        "amount": result.amount,
        "transaction_id": result.transaction_id,
    }
