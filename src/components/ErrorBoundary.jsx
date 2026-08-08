import { Component } from 'react'

// React only supports error boundaries as classes — no hook equivalent.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Uncaught error in page:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="placeholder-note">
          Something went wrong loading this page. Try refreshing.
        </p>
      )
    }

    return this.props.children
  }
}
