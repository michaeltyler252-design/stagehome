import { ConsoleLogger, LogLevel } from "@nestjs/common";

/**
 * Part D: "structured logs". In production, every log line is a single JSON
 * object (timestamp, level, context, message) — the format every log
 * aggregator (Cloudflare Logpush, Datadog, CloudWatch, etc.) expects. In
 * development, falls back to Nest's normal colourised console output, which
 * is far more readable while actively coding.
 */
export class StructuredLogger extends ConsoleLogger {
  private isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  private writeStructured(level: LogLevel, message: unknown, context?: string, trace?: string) {
    const line = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? this.context,
      message,
      ...(trace ? { trace } : {}),
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(line));
  }

  log(message: unknown, context?: string) {
    if (this.isProduction()) return this.writeStructured("log", message, context);
    super.log(message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    if (this.isProduction()) return this.writeStructured("error", message, context, trace);
    super.error(message, trace, context);
  }

  warn(message: unknown, context?: string) {
    if (this.isProduction()) return this.writeStructured("warn", message, context);
    super.warn(message, context);
  }

  debug(message: unknown, context?: string) {
    if (this.isProduction()) return this.writeStructured("debug", message, context);
    super.debug(message, context);
  }

  verbose(message: unknown, context?: string) {
    if (this.isProduction()) return this.writeStructured("verbose", message, context);
    super.verbose(message, context);
  }
}
