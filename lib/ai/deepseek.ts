import { z } from "zod";
import type { AiReviewProvider, ReviewRequest, ReviewResponse } from "./provider";
import { aiReviewSchema } from "./review-schema";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 16_000;

const completionSchema = z.object({
  id: z.string().optional(),
  model: z.string().min(1),
  choices: z.array(z.object({
    finish_reason: z.string().nullable(),
    message: z.object({
      content: z.string().nullable(),
    }),
  })).min(1),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional(),
    prompt_cache_hit_tokens: z.number().int().nonnegative().optional(),
    prompt_cache_miss_tokens: z.number().int().nonnegative().optional(),
  }).passthrough().optional(),
}).passthrough();

export type DeepSeekRuntimeConfig = {
  configured: boolean;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
};

type DeepSeekProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
  userId?: string;
};

export class DeepSeekReviewError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DeepSeekReviewError";
  }
}

function parseInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function getDeepSeekRuntimeConfig(): DeepSeekRuntimeConfig {
  return {
    configured: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
    baseUrl: (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
    timeoutMs: parseInteger(process.env.AI_REVIEW_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 10_000, 300_000),
    maxOutputTokens: parseInteger(
      process.env.AI_REVIEW_MAX_OUTPUT_TOKENS,
      DEFAULT_MAX_OUTPUT_TOKENS,
      2_000,
      64_000,
    ),
  };
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1_000, 5_000);
  return 750 * (attempt + 1);
}

function isTransientStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function trimJsonFences(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

async function wait(delayMs: number) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export class DeepSeekReviewProvider implements AiReviewProvider {
  readonly provider = "deepseek";
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;
  private readonly userId?: string;

  constructor(options: DeepSeekProviderOptions = {}) {
    const config = getDeepSeekRuntimeConfig();
    this.apiKey = options.apiKey?.trim() || process.env.DEEPSEEK_API_KEY?.trim() || "";
    this.baseUrl = (options.baseUrl || config.baseUrl).replace(/\/+$/, "");
    this.model = options.model || config.model;
    this.timeoutMs = options.timeoutMs || config.timeoutMs;
    this.maxOutputTokens = options.maxOutputTokens || config.maxOutputTokens;
    this.userId = options.userId;
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    if (!this.apiKey) {
      throw new DeepSeekReviewError(
        "DEEPSEEK_NOT_CONFIGURED",
        "DeepSeek API 尚未配置。",
        503,
      );
    }

    let lastError: DeepSeekReviewError | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: request.systemPrompt },
              { role: "user", content: request.userPrompt },
            ],
            response_format: { type: "json_object" },
            thinking: { type: "disabled" },
            temperature: 0.1,
            max_tokens: this.maxOutputTokens,
            stream: false,
            ...(this.userId ? { user_id: this.userId } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();
          const retryable = isTransientStatus(response.status);
          const error = new DeepSeekReviewError(
            `DEEPSEEK_HTTP_${response.status}`,
            response.status === 402
              ? "DeepSeek 余额不足。"
              : response.status === 401
                ? "DeepSeek API Key 无效。"
                : `DeepSeek 请求失败（${response.status}）。`,
            response.status,
            retryable,
            body.slice(0, 1_000),
          );
          if (retryable && attempt === 0) {
            lastError = error;
            await wait(retryDelay(response, attempt));
            continue;
          }
          throw error;
        }

        const completion = completionSchema.safeParse(await response.json());
        if (!completion.success) {
          throw new DeepSeekReviewError(
            "DEEPSEEK_RESPONSE_INVALID",
            "DeepSeek 返回了无法识别的响应。",
            502,
            attempt === 0,
            completion.error.issues,
          );
        }

        const choice = completion.data.choices[0];
        if (choice.finish_reason === "length") {
          throw new DeepSeekReviewError(
            "DEEPSEEK_OUTPUT_TRUNCATED",
            "AI 输出达到长度上限，未形成完整评阅。",
            502,
          );
        }
        if (!choice.message.content?.trim()) {
          const error = new DeepSeekReviewError(
            "DEEPSEEK_EMPTY_OUTPUT",
            "DeepSeek 返回了空内容。",
            502,
            true,
          );
          if (attempt === 0) {
            lastError = error;
            await wait(500);
            continue;
          }
          throw error;
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(trimJsonFences(choice.message.content));
        } catch {
          const error = new DeepSeekReviewError(
            "DEEPSEEK_JSON_INVALID",
            "DeepSeek 输出不是有效 JSON。",
            502,
            true,
          );
          if (attempt === 0) {
            lastError = error;
            await wait(500);
            continue;
          }
          throw error;
        }

        const review = aiReviewSchema.safeParse(parsedJson);
        if (!review.success) {
          const error = new DeepSeekReviewError(
            "DEEPSEEK_SCHEMA_INVALID",
            "DeepSeek 输出没有通过评阅结构校验。",
            502,
            true,
            review.error.issues.slice(0, 30),
          );
          if (attempt === 0) {
            lastError = error;
            await wait(500);
            continue;
          }
          throw error;
        }

        return {
          review: review.data,
          provider: this.provider,
          model: completion.data.model || this.model,
          rawOutput: {
            response_id: completion.data.id || null,
            model: completion.data.model,
            finish_reason: choice.finish_reason,
            usage: completion.data.usage || null,
            review: parsedJson,
          },
        };
      } catch (error) {
        if (error instanceof DeepSeekReviewError) {
          if (error.retryable && attempt === 0) {
            lastError = error;
            await wait(500);
            continue;
          }
          throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
          throw new DeepSeekReviewError(
            "DEEPSEEK_TIMEOUT",
            "DeepSeek 评阅超时。",
            504,
            true,
          );
        }
        const requestError = new DeepSeekReviewError(
          "DEEPSEEK_NETWORK_ERROR",
          "无法连接 DeepSeek API。",
          502,
          true,
        );
        if (attempt === 0) {
          lastError = requestError;
          await wait(500);
          continue;
        }
        throw requestError;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new DeepSeekReviewError("DEEPSEEK_UNKNOWN", "DeepSeek 评阅失败。");
  }
}
