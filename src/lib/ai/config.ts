/**
 * AI Configuration
 * Centralized configuration for Anthropic Claude models
 */

export const AI_CONFIG = {
  /**
   * Model used for all AI operations
   * Using Claude Sonnet 4.5 (latest stable model)
   */
  MODEL: "claude-sonnet-4-20250514",

  /**
   * Default token limits for different operations
   */
  MAX_TOKENS: {
    CARD_GENERATION: 16000,
    NOTE_TEMPLATE: 512,
    WELCOME_MESSAGE: 800,
  },

  /**
   * Temperature settings
   */
  TEMPERATURE: {
    CREATIVE: 0.9, // For personal notes, welcome messages
    BALANCED: 0.7, // For card generation
  },
} as const;
