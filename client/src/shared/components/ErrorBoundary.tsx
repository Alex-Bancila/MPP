import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
}

/**
 * App-wide error boundary. Without one, any render-time throw (e.g. a component
 * reading a now-null user mid-logout) blanks the whole app. This catches it and
 * shows a recoverable fallback instead.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected error',
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[Music Core] Render error caught by ErrorBoundary:', error, info)
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: undefined })
    window.location.assign('/listings')
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mc-error-boundary" role="alert">
          <h1 className="mc-error-boundary__title">Something went wrong</h1>
          <p className="mc-error-boundary__message">
            {this.state.message ?? 'The app hit an unexpected error.'}
          </p>
          <button
            type="button"
            className="mc-button mc-button--primary"
            onClick={this.handleReset}
          >
            Back to listings
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
