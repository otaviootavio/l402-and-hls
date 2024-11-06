import type { L402Logger, LogEntry, LogLevel } from "../types/logger";

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type ConsoleLogMethod = (message?: any, ...optionalParams: any[]) => void;

export class ConsoleL402Logger implements L402Logger {
  private readonly levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  private readonly minLevel: LogLevel;
  
  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] <= this.levels[this.minLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, code, message } = entry;
    return `[${timestamp}] ${level.toUpperCase()} [${code}] ${message}`;
  }

  private createLogEntry(
    level: LogLevel,
    code: string,
    message: string,
    meta?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      code,
      message,
      meta: this.sanitizeMeta(meta),
    };
  }

  private sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!meta) return undefined;

    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(meta)) {
      // Handle Error objects specially
      if (value instanceof Error) {
        sanitized[key] = {
          message: value.message,
          name: value.name,
          stack: value.stack,
        };
        continue;
      }

      // Handle circular references and functions
      try {
        JSON.stringify(value);
        sanitized[key] = value;
      } catch {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  private getConsoleMethod(level: LogLevel): ConsoleLogMethod {
    switch (level) {
      case 'error':
        return console.error.bind(console);
      case 'warn':
        return console.warn.bind(console);
      case 'debug':
        return console.debug.bind(console);
      default:
        return console.info.bind(console);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const formattedMessage = this.formatMessage(entry);
    const logFn = this.getConsoleMethod(entry.level);

    if (entry.meta) {
      logFn(formattedMessage, entry.meta);
    } else {
      logFn(formattedMessage);
    }
  }

  error(code: string, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    this.logToConsole(this.createLogEntry('error', code, message, meta));
  }

  warn(code: string, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    this.logToConsole(this.createLogEntry('warn', code, message, meta));
  }

  info(code: string, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    this.logToConsole(this.createLogEntry('info', code, message, meta));
  }

  debug(code: string, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    this.logToConsole(this.createLogEntry('debug', code, message, meta));
  }
}

