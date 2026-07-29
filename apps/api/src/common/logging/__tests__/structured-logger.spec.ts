import { StructuredLogger } from "../structured-logger";

describe("StructuredLogger", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    consoleSpy.mockRestore();
  });

  it("emits a single-line JSON object in production with timestamp, level, context, and message", () => {
    process.env.NODE_ENV = "production";
    const logger = new StructuredLogger();

    logger.log("Server started", "Bootstrap");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed).toMatchObject({ level: "log", context: "Bootstrap", message: "Server started" });
    expect(parsed.timestamp).toBeDefined();
  });

  it("includes the stack trace field for error logs when provided", () => {
    process.env.NODE_ENV = "production";
    const logger = new StructuredLogger();

    logger.error("Something broke", "at line 42", "PaymentsService");

    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.level).toBe("error");
    expect(parsed.trace).toBe("at line 42");
  });

  it("omits the trace field entirely when none is given, rather than including a null", () => {
    process.env.NODE_ENV = "production";
    const logger = new StructuredLogger();

    logger.error("Something broke");

    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect("trace" in parsed).toBe(false);
  });

  it("does not emit JSON in development — falls back to Nest's normal console output", () => {
    process.env.NODE_ENV = "development";
    const logger = new StructuredLogger();

    logger.log("Server started", "Bootstrap");

    // Nest's ConsoleLogger writes via process.stdout, not console.log, so
    // our JSON-emitting console.log path being untouched confirms the
    // structured branch was correctly skipped.
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
