/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mail, RefreshCw, ArrowRight } from 'lucide-react';

interface ConfirmationPanelProps {
  email: string;
  isSubmitting: boolean;
  onResend: () => void;
  onDismiss: () => void;
}

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({
  email,
  isSubmitting,
  onResend,
  onDismiss,
}) => {
  return (
    <div
      id="login-confirmation-panel"
      data-testid="login-confirmation-panel"
      className="p-5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl space-y-3.5 animate-in fade-in shadow-md"
    >
      <div className="flex items-start space-x-3">
        <Mail className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-2 flex-1">
          <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
            Check your email to sign in
          </h3>
          <p className="text-xs leading-relaxed text-amber-900">
            An account has been created for <strong className="font-semibold">{email || 'your email'}</strong>. Supabase requires email verification before signing in. If you just registered and cannot log in, your email may still need confirmation. Contact your system administrator or use the Support page.
          </p>
          <div className="pt-1 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="resend-confirmation-btn"
              onClick={onResend}
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>Resend confirmation email</span>
            </button>
            <button
              type="button"
              data-testid="try-signin-after-confirm-btn"
              onClick={onDismiss}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs transition shadow-xs"
            >
              <span>I have confirmed – Try signing in</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
