/**
 * Cloudflare Workers AI client
 * Uses the Cloudflare Workers AI REST API to run inference on models
 * at the edge with zero cold starts.
 * 
 * Docs: https://developers.cloudflare.com/workers-ai/
 */

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4/accounts";

export interface CloudflareAIConfig {
  accountId: string;
  apiToken: string;
}

export interface CloudflareMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CloudflareAIResponse {
  result: {
    response?: string;
    [key: string]: unknown;
  };
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

/** Available Cloudflare Workers AI models */
export const CLOUDFLARE_MODELS = {
  "llama-3.3-70b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "deepseek-r1-distill": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  "gemma-2-27b": "@cf/google/gemma-2-27b-it",
  "mistral-7b": "@cf/mistral/mistral-7b-instruct-v0.2-lora",
  "qwen-2.5-coder": "@cf/qwen/qwen2.5-coder-32b-instruct",
} as const;

export type CloudflareModelKey = keyof typeof CLOUDFLARE_MODELS;

/**
 * Run a text generation inference on Cloudflare Workers AI
 */
export async function runCloudflareAI(
  config: CloudflareAIConfig,
  modelKey: CloudflareModelKey,
  messages: CloudflareMessage[],
  options?: {
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
  }
): Promise<CloudflareAIResponse> {
  const modelId = CLOUDFLARE_MODELS[modelKey];
  const url = `${CLOUDFLARE_API_BASE}/${config.accountId}/ai/run/${modelId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      max_tokens: options?.max_tokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      stream: options?.stream ?? false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare Workers AI error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Simple chat completion with a Cloudflare Workers AI model
 */
export async function chatWithCloudflare(
  config: CloudflareAIConfig,
  modelKey: CloudflareModelKey,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const messages: CloudflareMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const result = await runCloudflareAI(config, modelKey, messages);

  if (!result.success) {
    throw new Error(`Cloudflare AI failed: ${result.errors.map(e => e.message).join(", ")}`);
  }

  return result.result.response || "";
}

/**
 * Get the Cloudflare AI config from environment variables
 */
export function getCloudflareConfig(): CloudflareAIConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken || accountId === "your-cloudflare-account-id") {
    return null;
  }

  return { accountId, apiToken };
}
