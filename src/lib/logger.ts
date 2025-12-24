/**
 * Centralized logging utility for the application.
 * Provides consistent formatting and log levels.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

// Only enable debug logs in development
const isDev = process.env.NODE_ENV === "development";

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level (can be configured via env)
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || (isDev ? "debug" : "info");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatMessage(prefix: string, level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  return `[${timestamp}] ${levelStr} [${prefix}] ${message}`;
}

function createLogger(options: LoggerOptions = {}) {
  const prefix = options.prefix || "APP";
  const enabled = options.enabled ?? true;

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (enabled && shouldLog("debug")) {
        console.debug(formatMessage(prefix, "debug", message), ...args);
      }
    },

    info: (message: string, ...args: unknown[]) => {
      if (enabled && shouldLog("info")) {
        console.info(formatMessage(prefix, "info", message), ...args);
      }
    },

    warn: (message: string, ...args: unknown[]) => {
      if (enabled && shouldLog("warn")) {
        console.warn(formatMessage(prefix, "warn", message), ...args);
      }
    },

    error: (message: string, ...args: unknown[]) => {
      if (enabled && shouldLog("error")) {
        console.error(formatMessage(prefix, "error", message), ...args);
      }
    },
  };
}

// Pre-configured loggers for different modules
export const logger = createLogger();
export const aiLogger = createLogger({ prefix: "AI" });
export const amadeusLogger = createLogger({ prefix: "AMADEUS" });
export const googleLogger = createLogger({ prefix: "GOOGLE" });
export const authLogger = createLogger({ prefix: "AUTH" });
export const apiLogger = createLogger({ prefix: "API" });
export const quotaLogger = createLogger({ prefix: "QUOTA" });
export const resetLogger = createLogger({ prefix: "RESET" });
export const treatsLogger = createLogger({ prefix: "TREATS" });
export const mapLogger = createLogger({ prefix: "MAP" });
export const currencyLogger = createLogger({ prefix: "CURRENCY" });

// Export createLogger for custom loggers
export { createLogger };
