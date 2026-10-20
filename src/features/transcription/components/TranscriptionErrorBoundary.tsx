/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class TranscriptionErrorBoundary extends Component<Props, State> {
  props: Readonly<Props>;
  state: State;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setState: any;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Sanitize error message to ensure no tokens or sensitive audio data are displayed
    const msg = error?.message || 'Transcription component failed';
    const sanitized = msg.includes('token') || msg.includes('secret')
      ? 'Transcription service encountered an authentication or network error'
      : msg;
    return { hasError: true, errorMessage: sanitized };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Non-blocking catch: Never crash parent interview forms or interrupt autosave.
    // Guardrail: Never log audio, transcript text, or sensitive tokens to console.
    console.error('Transcription feature error caught safely:', {
      name: error.name,
      componentStack: errorInfo.componentStack?.slice(0, 200),
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          data-testid="transcription-error-boundary"
          className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">Live Transcription Notice</p>
              <p className="text-[11px] text-slate-600">{this.state.errorMessage}</p>
            </div>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-medium text-amber-800 transition flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
