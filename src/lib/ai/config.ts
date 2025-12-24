/**
 * AI Configuration
 * Centralized configuration for Anthropic Claude models
 */

export const AI_CONFIG = {
  /**
   * Model used for all AI operations
   * Using Claude Sonnet 4.5 (latest stable model)
   */
  MODEL: "claude-sonnet-4-5",

  /**
   * Default token limits for different operations
   */
  MAX_TOKENS: {
    CARD_GENERATION: 64000,
    NOTE_TEMPLATE: 5120,
    WELCOME_MESSAGE: 8000,
  },

  /**
   * Temperature settings
   */
  TEMPERATURE: {
    CREATIVE: 0.9, // For personal notes, welcome messages
    BALANCED: 0.3, // For card generation
  },
} as const;
