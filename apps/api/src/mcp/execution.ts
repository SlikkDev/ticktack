export const MCP_EXECUTION_TIMEOUT_MS = 30_000;

/** Own a slot until the response and every started tool have settled. */
export class McpExecution {
  private controller = new AbortController();
  private tools = 0;
  private responseFinished = false;
  private released = false;
  private timeout: ReturnType<typeof setTimeout>;
  readonly signal = this.controller.signal;

  constructor(
    private requestSignal: AbortSignal,
    private release: () => void,
  ) {
    this.timeout = setTimeout(
      () =>
        this.abort(new DOMException("MCP request timed out", "TimeoutError")),
      MCP_EXECUTION_TIMEOUT_MS,
    );
    requestSignal.addEventListener("abort", this.onDisconnect, { once: true });
    if (requestSignal.aborted) this.onDisconnect();
  }

  private onDisconnect = () => this.abort(this.requestSignal.reason);

  abort(reason?: unknown) {
    this.controller.abort(reason);
  }

  async run<T>(tool: () => Promise<T>): Promise<T> {
    this.signal.throwIfAborted();
    if (this.released) throw new Error("MCP request is already closed");
    this.tools++;
    try {
      return await tool();
    } finally {
      this.tools--;
      this.maybeRelease();
    }
  }

  finish() {
    this.responseFinished = true;
    this.maybeRelease();
  }

  private maybeRelease() {
    if (this.released || !this.responseFinished || this.tools !== 0) return;
    this.released = true;
    clearTimeout(this.timeout);
    this.requestSignal.removeEventListener("abort", this.onDisconnect);
    this.release();
  }

  wrapResponse(response: Response): Response {
    if (
      !response.body ||
      !response.headers.get("content-type")?.includes("text/event-stream")
    ) {
      this.finish();
      return response;
    }
    const reader = response.body.getReader();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.signal.removeEventListener("abort", cancel);
      this.finish();
    };
    const cancel = () => {
      void reader.cancel(this.signal.reason).catch(() => {});
      finish();
    };
    this.signal.addEventListener("abort", cancel, { once: true });
    if (this.signal.aborted) cancel();
    const body = new ReadableStream<Uint8Array>(
      {
        pull: async (controller) => {
          try {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              finish();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            this.abort(error);
            controller.error(error);
            finish();
          }
        },
        cancel: (reason) => {
          this.abort(reason);
          finish();
        },
      },
      { highWaterMark: 0 },
    );
    return new Response(body, response);
  }
}
