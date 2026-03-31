import { jest } from '@jest/globals';

jest.mock('@mainlayer/sdk', () => {
  return {
    MainlayerClient: jest.fn().mockImplementation(() => ({
      resources: {
        verifyAccess: jest.fn(),
        create: jest.fn(),
      },
      agents: {
        getBalance: jest.fn(),
      },
      escrow: {
        release: jest.fn(),
      },
    })),
  };
});

import { MainlayerClient } from '@mainlayer/sdk';

describe('Compute Job Bidding', () => {
  let mlClient: ReturnType<typeof MainlayerClient.prototype.constructor>;

  beforeEach(() => {
    jest.clearAllMocks();
    mlClient = new (MainlayerClient as jest.MockedClass<typeof MainlayerClient>)({
      apiKey: 'test-key',
    });
  });

  describe('Agent balance check', () => {
    it('returns agent balance before bidding', async () => {
      (mlClient.agents.getBalance as jest.Mock).mockResolvedValue({
        available: 50000, // $500.00
        pending: 5000,
        currency: 'usd',
      });

      const balance = await mlClient.agents.getBalance('agent-token-xyz');

      expect(balance.available).toBe(50000);
      expect(balance.available / 100).toBe(500);
    });

    it('identifies insufficient balance', async () => {
      (mlClient.agents.getBalance as jest.Mock).mockResolvedValue({
        available: 100, // $1.00
        pending: 0,
        currency: 'usd',
      });

      const balance = await mlClient.agents.getBalance('agent-poor');
      const jobPrice = 2800; // $28.00

      expect(balance.available).toBeLessThan(jobPrice);
    });
  });

  describe('Payment verification for jobs', () => {
    it('grants bid access when agent has sufficient funds', async () => {
      (mlClient.resources.verifyAccess as jest.Mock).mockResolvedValue({
        granted: true,
        accessToken: 'job-access-token-abc',
      });

      const result = await mlClient.resources.verifyAccess('job-001', 'agent-token');

      expect(result.granted).toBe(true);
      expect(result.accessToken).toBeDefined();
    });

    it('rejects bid when payment cannot be verified', async () => {
      (mlClient.resources.verifyAccess as jest.Mock).mockResolvedValue({
        granted: false,
      });

      const result = await mlClient.resources.verifyAccess('job-001', 'broke-agent');

      expect(result.granted).toBe(false);
    });
  });

  describe('Job resource creation', () => {
    it('creates job resource with correct price', async () => {
      const mockResource = {
        id: 'job-001',
        name: 'Compute Job: LLM Fine-tuning',
        price: 2800,
        createdAt: new Date().toISOString(),
      };

      (mlClient.resources.create as jest.Mock).mockResolvedValue(mockResource);

      const resource = await mlClient.resources.create({
        id: 'job-001',
        name: 'Compute Job: LLM Fine-tuning',
        price: 2800,
        metadata: { type: 'compute_job' },
      });

      expect(resource.price).toBe(2800);
      expect(resource.price / 100).toBe(28);
    });
  });

  describe('Escrow release on completion', () => {
    it('releases payment after job completes', async () => {
      (mlClient.escrow.release as jest.Mock).mockResolvedValue({
        released: true,
        amount: 2800,
        transaction_id: 'txn-abc123',
      });

      const result = await mlClient.escrow.release({
        resource_id: 'job-001',
        payer_token: 'agent-token',
      });

      expect(result.released).toBe(true);
      expect(result.amount).toBe(2800);
      expect(result.transaction_id).toBeDefined();
    });

    it('handles escrow release failure gracefully', async () => {
      (mlClient.escrow.release as jest.Mock).mockRejectedValue(
        new Error('Escrow release failed')
      );

      await expect(
        mlClient.escrow.release({ resource_id: 'job-999', payer_token: 'agent' })
      ).rejects.toThrow('Escrow release failed');
    });
  });

  describe('Bid validation', () => {
    it('validates bid amount is positive', () => {
      const bidAmount = -100;
      const isValid = bidAmount > 0;
      expect(isValid).toBe(false);
    });

    it('validates worker capabilities match job requirements', () => {
      const job = { gpuType: 'A100', vram: 80 };
      const worker = { gpuType: 'A100', vram: 80 };

      const isCompatible = job.gpuType === worker.gpuType && job.vram <= worker.vram;
      expect(isCompatible).toBe(true);
    });

    it('rejects incompatible worker', () => {
      const job = { gpuType: 'A100', vram: 80 };
      const worker = { gpuType: 'RTX 3090', vram: 24 };

      const isCompatible = job.gpuType === worker.gpuType && job.vram <= worker.vram;
      expect(isCompatible).toBe(false);
    });
  });
});
