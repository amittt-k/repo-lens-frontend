/**
 * Isolated AI Provider HTTP Client.
 *
 * Uses native fetch with AbortController for timeout handling, parses standard
 * chat-completion responses, and normalizes errors (timeouts, 429 rate limits, 5xx failures).
 */

import { config } from "../config/env.js";

export class AiServiceError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = "AiServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Dispatches a completion request to the configured AI provider.
 *
 * @param {string} systemPrompt - Grounding system instruction
 * @param {string} userPrompt - Context-specific user query
 * @param {object} [options] - Overrides for testing and configuration
 * @returns {Promise<{ text: string, model: string, usage?: object }>}
 */
export async function sendCompletion(systemPrompt, userPrompt, options = {}) {
  const apiKey = options.apiKey !== undefined ? options.apiKey : config.ai.apiKey;
  const model = options.model || config.ai.model || "gpt-4o-mini";
  const timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : config.ai.timeoutMs || 30000;
  const baseUrl = (options.baseUrl || config.ai.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const fetchFn = options.fetchFn || globalThis.fetch;

  if (!apiKey) {
    throw new AiServiceError(
      "AI API key is not configured on the server. Please set AI_API_KEY in environment variables.",
      "AI_MISSING_KEY",
      503,
    );
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        // ignore parse error
      }

      let providerMessage = "";
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed?.error?.message) {
          providerMessage = parsed.error.message;
        } else if (Array.isArray(parsed) && parsed[0]?.error?.message) {
          providerMessage = parsed[0].error.message;
        }
      } catch {
        // ignore parse error
      }

      if (status === 429) {
        throw new AiServiceError(
          "AI provider rate limit exceeded. Please try again shortly.",
          "AI_RATE_LIMIT_ERROR",
          429,
          errorBody,
        );
      }

      if (status === 404) {
        throw new AiServiceError(
          providerMessage ? `AI provider error (404): ${providerMessage}` : `AI model "${model}" or endpoint was not found (404).`,
          "AI_MODEL_NOT_FOUND",
          404,
          errorBody,
        );
      }

      throw new AiServiceError(
        `AI provider request failed with status ${status}.`,
        "AI_PROVIDER_ERROR",
        status >= 500 ? 502 : status,
        errorBody,
      );
    }

    let json;
    try {
      json = await response.json();
    } catch (err) {
      throw new AiServiceError(
        `Failed to parse response from AI provider: ${err.message}`,
        "AI_RESPONSE_ERROR",
        502,
      );
    }

    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new AiServiceError(
        "Invalid or empty message structure in AI provider response.",
        "AI_RESPONSE_ERROR",
        502,
        json,
      );
    }

    return {
      text: content.trim(),
      model: json.model || model,
      usage: json.usage || null,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AiServiceError) {
      throw error;
    }

    if (error.name === "AbortError" || controller.signal.aborted) {
      throw new AiServiceError(
        `AI request timed out after ${timeoutMs}ms.`,
        "AI_TIMEOUT_ERROR",
        504,
      );
    }

    throw new AiServiceError(
      `AI service connection failed: ${error.message}`,
      "AI_PROVIDER_ERROR",
      502,
      error,
    );
  }
}
