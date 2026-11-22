/** Bound startup reads, retaining the caller's cancellation signal. */
export async function readWithDeadline<T>(
  action: (signal: AbortSignal) => Promise<T>,
  parent?: AbortSignal | null,
): Promise<T> {
  const controller = new AbortController()
  const cancel = () => controller.abort(parent?.reason)
  if (parent?.aborted) cancel()
  else parent?.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(() => controller.abort(new Error('Network read timed out')), 12000)
  try { return await action(controller.signal) }
  finally { clearTimeout(timer); parent?.removeEventListener('abort', cancel) }
}
