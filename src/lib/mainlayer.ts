import { MainlayerClient } from '@mainlayer/sdk';

const ml = new MainlayerClient({ apiKey: process.env.MAINLAYER_API_KEY! });

export async function verifyComputePayment(
  jobId: string,
  agentToken: string
): Promise<{ granted: boolean; accessToken?: string }> {
  const result = await ml.resources.verifyAccess(jobId, agentToken);
  return {
    granted: result.granted,
    accessToken: result.accessToken,
  };
}

export async function createJobResource(jobId: string, price: number) {
  return await ml.resources.create({
    id: jobId,
    price,
    name: `Compute Job: ${jobId}`,
  });
}

export async function getAgentBalance(agentToken: string) {
  return await ml.agents.getBalance(agentToken);
}

export default ml;
