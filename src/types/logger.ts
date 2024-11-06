export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface L402Logger {
  error(code: string, message: string, meta?: Record<string, unknown>): void;
  warn(code: string, message: string, meta?: Record<string, unknown>): void;
  info(code: string, message: string, meta?: Record<string, unknown>): void;
  debug(code: string, message: string, meta?: Record<string, unknown>): void;
}
