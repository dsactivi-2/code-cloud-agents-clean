/**
 * Cost Tracker - Tracks AI API usage and costs
 */

import type { ModelProvider } from "../shared/types/common.ts";

export interface CostLogEntry {
  userId: string;
  taskId: string;
  model: string;
  provider: ModelProvider;
  inputTokens: number;
  outputTokens: number;
  timestamp?: string;
}

export interface CostSummary {
  totalUSD: number;
  totalEUR: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

/**
 * Simple in-memory cost tracker
 */
class CostTracker {
  private logs: CostLogEntry[] = [];

  /**
   * Log a cost entry
   */
  log(entry: CostLogEntry): void {
    this.logs.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get cost summary for a user
   */
  getUserCosts(userId: string): CostSummary {
    const userLogs = this.logs.filter((log) => log.userId === userId);

    return this.calculateSummary(userLogs);
  }

  /**
   * Get cost summary for a task
   */
  getTaskCosts(taskId: string): CostSummary {
    const taskLogs = this.logs.filter((log) => log.taskId === taskId);

    return this.calculateSummary(taskLogs);
  }

  /**
   * Get all logs for a user
   */
  getUserLogs(userId: string): CostLogEntry[] {
    return this.logs.filter((log) => log.userId === userId);
  }

  /**
   * Calculate cost summary from logs
   */
  private calculateSummary(logs: CostLogEntry[]): CostSummary {
    let totalUSD = 0;
    let totalEUR = 0;
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    for (const log of logs) {
      const cost = this.calculateCost(
        log.provider,
        log.model,
        log.inputTokens,
        log.outputTokens
      );

      totalUSD += cost.usd;
      totalEUR += cost.eur;
      inputTokens += log.inputTokens;
      outputTokens += log.outputTokens;
      totalTokens += log.inputTokens + log.outputTokens;
    }

    return {
      totalUSD,
      totalEUR,
      totalTokens,
      inputTokens,
      outputTokens,
      requestCount: logs.length,
    };
  }

  /**
   * Calculate cost for a single request
   */
  private calculateCost(
    provider: ModelProvider,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): { usd: number; eur: number } {
    let inputCostUSD = 0;
    let outputCostUSD = 0;

    // Pricing per 1M tokens
    switch (provider) {
      case "anthropic":
        if (model.includes("opus")) {
          inputCostUSD = (inputTokens / 1_000_000) * 15;
          outputCostUSD = (outputTokens / 1_000_000) * 75;
        } else if (model.includes("sonnet")) {
          inputCostUSD = (inputTokens / 1_000_000) * 3;
          outputCostUSD = (outputTokens / 1_000_000) * 15;
        } else if (model.includes("haiku")) {
          inputCostUSD = (inputTokens / 1_000_000) * 0.25;
          outputCostUSD = (outputTokens / 1_000_000) * 1.25;
        } else {
          // Default Sonnet pricing
          inputCostUSD = (inputTokens / 1_000_000) * 3;
          outputCostUSD = (outputTokens / 1_000_000) * 15;
        }
        break;

      case "openai":
        if (model.includes("gpt-4")) {
          inputCostUSD = (inputTokens / 1_000_000) * 30;
          outputCostUSD = (outputTokens / 1_000_000) * 60;
        } else if (model.includes("gpt-3.5")) {
          inputCostUSD = (inputTokens / 1_000_000) * 0.5;
          outputCostUSD = (outputTokens / 1_000_000) * 1.5;
        } else {
          // Default GPT-4 pricing
          inputCostUSD = (inputTokens / 1_000_000) * 30;
          outputCostUSD = (outputTokens / 1_000_000) * 60;
        }
        break;

      case "gemini":
        inputCostUSD = (inputTokens / 1_000_000) * 0.5;
        outputCostUSD = (outputTokens / 1_000_000) * 1.5;
        break;

      case "xai":
        // Grok pricing
        inputCostUSD = (inputTokens / 1_000_000) * 5;
        outputCostUSD = (outputTokens / 1_000_000) * 15;
        break;

      case "ollama":
        // Local - no cost
        inputCostUSD = 0;
        outputCostUSD = 0;
        break;
    }

    const totalCostUSD = inputCostUSD + outputCostUSD;

    return {
      usd: totalCostUSD,
      eur: totalCostUSD * 0.92, // Approximate conversion
    };
  }

  /**
   * Clear all logs (for testing)
   */
  clear(): void {
    this.logs = [];
  }
}

// Singleton instance
export const costTracker = new CostTracker();
