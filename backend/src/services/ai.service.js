/**
 * Backend AI Service for RepoLens.
 *
 * Provides grounded explanation methods for repositories, nodes, and application flows
 * by feeding structured static analysis facts into secure prompt templates and delegating
 * to the isolated AI provider client.
 */

import {
  buildRepositoryPrompt,
  buildNodePrompt,
  buildFlowPrompt,
} from "./aiPrompt.service.js";
import { sendCompletion, AiServiceError } from "./aiProvider.client.js";

export { AiServiceError };

export class AiService {
  /**
   * Generates a grounded architectural overview of a repository.
   *
   * @param {object} analysisData - Structured repository analysis facts
   * @param {object} [options] - Provider/timeout overrides
   * @returns {Promise<{ explanation: string, model: string, usage?: object }>}
   */
  async explainRepository(analysisData, options = {}) {
    if (!analysisData || typeof analysisData !== "object" || Object.keys(analysisData).length === 0) {
      throw new AiServiceError(
        "Invalid or empty repository analysis data provided for AI explanation.",
        "INVALID_AI_CONTEXT",
        400,
      );
    }

    const { systemPrompt, userPrompt } = buildRepositoryPrompt(analysisData);
    const result = await sendCompletion(systemPrompt, userPrompt, options);
    return {
      explanation: result.text,
      model: result.model,
      usage: result.usage,
    };
  }

  /**
   * Generates a grounded technical explanation for a specific AST symbol or file node.
   *
   * @param {object} nodeData - Structured node metadata, location, and relationships
   * @param {object} [options] - Provider/timeout overrides
   * @returns {Promise<{ explanation: string, model: string, usage?: object }>}
   */
  async explainNode(nodeData, options = {}) {
    if (!nodeData || typeof nodeData !== "object" || (!nodeData.id && !nodeData.label && !nodeData.name)) {
      throw new AiServiceError(
        "Invalid or empty node entity data provided for AI explanation.",
        "INVALID_AI_CONTEXT",
        400,
      );
    }

    const { systemPrompt, userPrompt } = buildNodePrompt(nodeData);
    const result = await sendCompletion(systemPrompt, userPrompt, options);
    return {
      explanation: result.text,
      model: result.model,
      usage: result.usage,
    };
  }

  /**
   * Generates a grounded technical explanation for an execution / dependency flow trace.
   *
   * @param {object} flowData - Structured flow trace steps and relationship transitions
   * @param {object} [options] - Provider/timeout overrides
   * @returns {Promise<{ explanation: string, model: string, usage?: object }>}
   */
  async explainFlow(flowData, options = {}) {
    if (!flowData || typeof flowData !== "object" || !Array.isArray(flowData.steps) || flowData.steps.length === 0) {
      throw new AiServiceError(
        "Invalid or empty flow data provided for AI explanation.",
        "INVALID_AI_CONTEXT",
        400,
      );
    }

    const { systemPrompt, userPrompt } = buildFlowPrompt(flowData);
    const result = await sendCompletion(systemPrompt, userPrompt, options);
    return {
      explanation: result.text,
      model: result.model,
      usage: result.usage,
    };
  }
}

export const aiService = new AiService();
export default aiService;
