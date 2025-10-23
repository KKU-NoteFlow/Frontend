export default function installFetchLogger() {
  try {
    const globalAny: any = globalThis
    const origFetch = globalAny.fetch
    if (typeof origFetch === 'function') {
      globalAny.fetch = async (...args: any[]) => {
        try {
          const res = await origFetch(...args)
          if (!res || !res.ok) {
            try {
              const txt = await (res && res.clone ? res.clone().text() : Promise.resolve(''))
              // Log non-ok responses for debugging
              // eslint-disable-next-line no-console
              console.error('[fetch] non-ok response', { url: args[0], status: res ? res.status : 'no-res', body: txt })
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('[fetch] non-ok response (failed to read body)', args[0], e)
            }
          }
          return res
        } catch (err) {
          // network error (connection refused, DNS, CORS preflight failures etc.)
          // eslint-disable-next-line no-console
          console.error('[fetch] network error', { url: args[0], error: err })
          throw err
        }
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('installFetchLogger failed', e)
  }

  // Global error handlers
  try {
    window.addEventListener('error', (ev) => {
      // eslint-disable-next-line no-console
      console.error('[window error]', ev.error || ev.message, ev)
    })
    window.addEventListener('unhandledrejection', (ev) => {
      // eslint-disable-next-line no-console
      console.error('[unhandledrejection]', ev.reason)
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('installFetchLogger: addEventListener failed', e)
  }
}
/**
 * installFetchLogger
 * Purpose: Wraps global fetch to log requests/responses for easier debugging during development.
 * Behavior: Non-intrusive; if wrapping fails it logs an error and leaves fetch untouched.
 * Usage: Called once from `main.tsx` at startup.
 */
