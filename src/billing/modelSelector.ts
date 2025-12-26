/**
 * Model Selector - Selects optimal AI model based on task
 */

import type { ModelProvider } from "../shared/types/common.ts";

export interface ModelRecommendation {
  model: string;
  provider: ModelProvider;
  reason: string;
}

export interface SelectionOptions {
  preferLocal?: boolean;
  maxCostUSD?: number;
  requireReasoning?: boolean;
}

/**
 * Select optimal model for a task
 */
export function selectModel(
  message: string,
  options: SelectionOptions = {}
): ModelRecommendation {
  const { preferLocal = false, maxCostUSD, requireReasoning = false } = options;

  // Estimate complexity
  const isComplex = isComplexTask(message);
  const isLongText = message.length > 1000;

  // Prefer local if requested
  if (preferLocal) {
    return {
      model: "llama3",
      provider: "ollama",
      reason: "Local model preferred",
    };
  }

  // Require reasoning (Claude Opus, GPT-4)
  if (requireReasoning || isComplex) {
    if (!maxCostUSD || maxCostUSD >= 0.05) {
      return {
        model: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        reason: "Complex task requires advanced reasoning",
      };
    }
  }

  // Budget-conscious selection
  if (maxCostUSD && maxCostUSD < 0.01) {
    return {
      model: "gemini-pro",
      provider: "gemini",
      reason: "Cost-optimized selection",
    };
  }

  // Long text processing
  if (isLongText) {
    return {
      model: "claude-3-haiku-20240307",
      provider: "anthropic",
      reason: "Optimized for long text processing",
    };
  }

  // Default: Claude Sonnet (best balance)
  return {
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    reason: "Best balance of performance and cost",
  };
}

/**
 * Detect if task is complex based on keywords
 */
function isComplexTask(message: string): boolean {
  const complexKeywords = [
    "analyze",
    "debug",
    "refactor",
    "architecture",
    "design",
    "implement",
    "optimize",
    "security",
    "performance",
    "algorithm",
  ];

  const lowerMessage = message.toLowerCase();

  return complexKeywords.some((keyword) => lowerMessage.includes(keyword));
}
