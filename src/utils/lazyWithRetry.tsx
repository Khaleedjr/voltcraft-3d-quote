import { ComponentType, lazy } from 'react'

const RELOAD_FLAG = 'vc-chunk-reloaded'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * Drop-in replacement for React.lazy that survives failed dynamic imports.
 *
 * Why this exists: every page is code-split, so navigating loads a hashed
 * chunk over the network. Two things routinely break that import() and, with
 * plain React.lazy + Suspense, leave the app stuck on the "Loading..."
 * fallback forever:
 *   1. A new deploy changes the chunk hashes, so a still-open tab requests a
 *      filename that no longer exists on the server (404).
 *   2. A flaky mobile connection drops the request.
 *
 * Strategy: retry the import a couple of times for transient blips; if it
 * still fails, do a single hard reload to pull the fresh index.html + chunks.
 * A sessionStorage guard prevents an infinite reload loop.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await factory()
      window.sessionStorage.removeItem(RELOAD_FLAG)
      return mod
    } catch (firstError) {
      // Transient network hiccup: try again a couple of times in place.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await delay(350 * (attempt + 1))
          const mod = await factory()
          window.sessionStorage.removeItem(RELOAD_FLAG)
          return mod
        } catch {
          // keep trying
        }
      }

      // Still failing. If we have not already reloaded for this, the chunk is
      // most likely stale from a deploy: reload once to fetch current assets.
      const alreadyReloaded = window.sessionStorage.getItem(RELOAD_FLAG) === '1'
      if (!alreadyReloaded) {
        window.sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // Never resolve, so Suspense keeps showing the fallback during reload
        // instead of surfacing the error.
        return new Promise<{ default: T }>(() => {})
      }

      // Already reloaded and it still fails: let the ErrorBoundary show a
      // recoverable message instead of a silent stuck spinner.
      throw firstError
    }
  })
}
