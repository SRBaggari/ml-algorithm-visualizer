import { Component } from 'react';
import Icon from './Icon.jsx';
import { friendlyError } from '../utils/errors.js';

/** Catches unexpected render errors so one broken view never blanks the whole app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the technical details in the developer console only.
    console.error('View crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty-state empty-state--page" role="alert">
        <span className="empty-state__icon" aria-hidden="true">
          <Icon name="alert" size={26} />
        </span>
        <strong>This view ran into a problem.</strong>
        <p>{friendlyError(this.state.error, 'Something unexpected happened while drawing this page. Your saved progress is safe - try again or go back to the dashboard.')}</p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <a href="#/" className="btn btn--secondary">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }
}
