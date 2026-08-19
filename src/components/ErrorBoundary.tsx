import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches render/lazy-load errors so a failed page never leaves the user
 * staring at a silent "Loading..." forever. Offers a one-tap recovery.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error boundary caught:', error, info)
  }

  handleReload = () => {
    try {
      window.sessionStorage.removeItem('vc-chunk-reloaded')
    } catch {
      // ignore storage errors
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6 gap-4">
          <p className="text-gray-900 dark:text-white font-semibold text-lg">
            Something went wrong loading this page.
          </p>
          <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm max-w-sm">
            This can happen right after we push an update. Reloading almost always fixes it.
          </p>
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 rounded-lg bg-voltcraft-primary text-white font-medium hover:opacity-90 transition-opacity"
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
