/**
 * Keep a streamed response alive through idle periods.
 *
 * A local model processing a long prompt, or a slow tool call, can leave the
 * stream silent for minutes. Reverse proxies drop such connections (nginx:
 * `proxy_read_timeout`, 60 s by default) and the browser sees a normal end of
 * stream. An SSE comment line keeps bytes flowing; SSE parsers skip it.
 */

const HEARTBEAT_MS = 15_000;
const PING = new TextEncoder().encode(": ping\n\n");

export function withHeartbeat(response: Response, onCancel?: () => void): Response {
  if (!response.body) return response;
  const reader = response.body.getReader();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => clearInterval(timer);

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Upstream chunks are whole SSE events, so a ping never lands inside one.
      timer = setInterval(() => controller.enqueue(PING), HEARTBEAT_MS);
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          stop();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (err) {
        stop();
        controller.error(err);
      }
    },
    cancel(reason) {
      stop();
      onCancel?.();
      return reader.cancel(reason);
    },
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
