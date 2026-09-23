/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import { validateEmail, validatePassword, validateFullName } from '../lib/validation';
import { AuthErrorCode } from '../lib/authErrorMapper';
import { supabase } from '../lib/supabase';

export const LoginView: React.FC = () => {
  const { login, signUp } = useAuth();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Labour Directorate');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authentication feedback banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  const handleResendConfirmation = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address above to resend confirmation.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
      });
      if (error) {
        setErrorMessage(error.message || 'Failed to resend confirmation email.');
      } else {
        setSuccessMessage('Confirmation email re-sent successfully. Please check your inbox.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend confirmation email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field validation and touched states
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
    fullName?: boolean;
  }>({});
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
  }>({});

  // Validate email on change or blur
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setErrorMessage(null);
    setErrorCode(null);

    if (touched.email) {
      const result = validateEmail(val);
      if (!result.isValid) {
        setFieldErrors((prev) => ({ ...prev, email: result.errorMessage }));
        setEmailWarning(null);
      } else {
        setFieldErrors((prev) => ({ ...prev, email: undefined }));
        setEmailWarning(result.warningMessage || null);
      }
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const result = validateEmail(email);
    if (!result.isValid) {
      setFieldErrors((prev) => ({ ...prev, email: result.errorMessage }));
      setEmailWarning(null);
    } else {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
      setEmailWarning(result.warningMessage || null);
    }
  };

  // Validate password on change or blur
  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setErrorMessage(null);
    setErrorCode(null);

    if (touched.password) {
      const result = validatePassword(val, mode === 'signup');
      if (!result.isValid) {
        setFieldErrors((prev) => ({ ...prev, password: result.errorMessage }));
      } else {
        setFieldErrors((prev) => ({ ...prev, password: undefined }));
      }
    }
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    const result = validatePassword(password, mode === 'signup');
    if (!result.isValid) {
      setFieldErrors((prev) => ({ ...prev, password: result.errorMessage }));
    } else {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  // Validate full name on change or blur
  const handleFullNameChange = (val: string) => {
    setFullName(val);
    setErrorMessage(null);
    setErrorCode(null);

    if (touched.fullName) {
      const result = validateFullName(val);
      if (!result.isValid) {
        setFieldErrors((prev) => ({ ...prev, fullName: result.errorMessage }));
      } else {
        setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
      }
    }
  };

  const handleFullNameBlur = () => {
    setTouched((prev) => ({ ...prev, fullName: true }));
    const result = validateFullName(fullName);
    if (!result.isValid) {
      setFieldErrors((prev) => ({ ...prev, fullName: result.errorMessage }));
    } else {
      setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
    }
  };

  // Switch between tabs while preserving the email field
  const handleSwitchTab = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    setErrorCode(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setTouched({});

    // Keep email validation status accurate if email is populated
    if (email.trim()) {
      const result = validateEmail(email);
      setEmailWarning(result.isValid ? result.warningMessage || null : null);
    } else {
      setEmailWarning(null);
    }
  };

  // Quick action from duplicate email banner: switch directly to sign-in
  const handleSwitchToSignInWithEmail = () => {
    setMode('signin');
    setErrorMessage(null);
    setErrorCode(null);
    setFieldErrors({});
    setTouched({});
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setSuccessMessage(null);

    // Mark fields as touched
    setTouched({
      email: true,
      password: true,
      fullName: mode === 'signup',
    });

    // 1. Client-side email validation
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      setFieldErrors((prev) => ({ ...prev, email: emailResult.errorMessage }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, email: undefined }));
    setEmailWarning(emailResult.warningMessage || null);

    // 2. Client-side password validation
    const passwordResult = validatePassword(password, mode === 'signup');
    if (!passwordResult.isValid) {
      setFieldErrors((prev) => ({ ...prev, password: passwordResult.errorMessage }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, password: undefined }));

    // 3. Client-side full name validation (sign-up only)
    if (mode === 'signup') {
      const nameResult = validateFullName(fullName);
      if (!nameResult.isValid) {
        setFieldErrors((prev) => ({ ...prev, fullName: nameResult.errorMessage }));
        return;
      }
      setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error, code } = await login(email, password);
        if (error) {
          setErrorMessage(error.message || 'Incorrect email or password.');
          setErrorCode(code || null);
        }
      } else {
        const { error, needsConfirmation, code } = await signUp(
          email,
          password,
          fullName,
          department
        );
        if (error) {
          setErrorMessage(
            error.message || 'Registration could not be completed. Please try again.'
          );
          setErrorCode(code || null);
        } else if (needsConfirmation) {
          setSuccessMessage(
            'Account created successfully. Please check your inbox to confirm your email before signing in.'
          );
        } else {
          setSuccessMessage(
            'Account registered successfully! Welcome to the MGLSD Diagnostic workspace.'
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to connect to the authentication server. Please check your network connection and try again.'
      );
      setErrorCode('NETWORK_ERROR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1f] text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-[128px]" />
      </div>

      {/* Top Ministry Ribbon */}
      <header className="relative z-10 border-b border-slate-800 bg-[#0b132b]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Official Coat of Arms of Uganda */}
          <img
            src="/Coat_of_arms_of_Uganda.svg"
            alt="Coat of Arms of Uganda"
            className="w-10 h-10 object-contain drop-shadow select-none shrink-0"
          />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              The Republic of Uganda
            </p>
            <h1 className="text-xs sm:text-sm font-bold text-white leading-tight">
              Ministry of Gender, Labour and Social Development
            </h1>
          </div>
        </div>

        {/* Backend Connection Status Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-slate-900/60 backdrop-blur-xs border-slate-700/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300">Supabase Connected</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Welcome Card & Title with National Coat of Arms */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <img
                src="/Coat_of_arms_of_Uganda.svg"
                alt="National Coat of Arms of Uganda"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl select-none"
              />
            </div>
            <div className="inline-flex items-center space-x-2 bg-teal-950/70 border border-teal-500/30 text-teal-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>TRANSFORMATIVE Programme</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Labour Directorate Diagnostic
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              Current-state institutional assessment, structured stakeholder interviews & evidence verification.
            </p>
          </div>

          {/* Authentication Form Card */}
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-100 pb-3 gap-2">
              <button
                type="button"
                id="login-tab-signin"
                data-testid="login-tab-signin"
                onClick={() => handleSwitchTab('signin')}
                disabled={isSubmitting}
                className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition ${
                  mode === 'signin'
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                } disabled:opacity-50`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="login-tab-signup"
                data-testid="login-tab-signup"
                onClick={() => handleSwitchTab('signup')}
                disabled={isSubmitting}
                className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition ${
                  mode === 'signup'
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                } disabled:opacity-50`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Alert banner */}
            {errorMessage && (
              <div
                id="login-error-alert"
                data-testid="login-error-alert"
                role="alert"
                className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs space-y-2 animate-in fade-in"
              >
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="leading-relaxed font-semibold">{errorMessage}</p>
                    {errorCode === 'USER_ALREADY_EXISTS' && mode === 'signup' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          data-testid="switch-to-signin-btn"
                          onClick={handleSwitchToSignInWithEmail}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                        >
                          <span>Sign in with this email</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {errorCode === 'EMAIL_NOT_CONFIRMED' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          data-testid="resend-confirmation-btn"
                          onClick={handleResendConfirmation}
                          disabled={isSubmitting}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-[11px] transition shadow-xs disabled:opacity-50"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Resend confirmation email</span>
                        </button>
                      </div>
                    )}
                    {errorCode === 'NETWORK_ERROR' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                        >
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success message banner */}
            {successMessage && (
              <div
                id="login-success-alert"
                data-testid="login-success-alert"
                role="status"
                className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-2 animate-in fade-in"
              >
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="leading-relaxed font-semibold">{successMessage}</p>
                    {mode === 'signup' && (
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('signin')}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-[11px] transition"
                      >
                        <span>Proceed to Sign In</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="login-fullname" className="block text-xs font-bold text-slate-700">
                      Official Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="login-fullname"
                      data-testid="login-fullname"
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. John Okello"
                      value={fullName}
                      onChange={(e) => handleFullNameChange(e.target.value)}
                      onBlur={handleFullNameBlur}
                      aria-invalid={!!fieldErrors.fullName}
                      aria-describedby={fieldErrors.fullName ? 'fullname-error' : undefined}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs outline-none min-h-[42px] transition ${
                        fieldErrors.fullName
                          ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400'
                          : 'border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:border-transparent'
                      } disabled:opacity-50`}
                    />
                    {fieldErrors.fullName && (
                      <p
                        id="fullname-error"
                        data-testid="fullname-error"
                        className="text-[11px] text-red-600 flex items-center space-x-1 mt-1 font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.fullName}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-department" className="block text-xs font-bold text-slate-700">
                      Department / Unit
                    </label>
                    <input
                      id="login-department"
                      data-testid="login-department"
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. Labour Inspectorate"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none min-h-[42px] transition bg-slate-50 focus:bg-white disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-bold text-slate-700">
                  Ministry Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    data-testid="login-email"
                    type="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    placeholder="officer@mglsd.go.ug"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    className={`w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-xs outline-none min-h-[42px] transition ${
                      fieldErrors.email
                        ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400'
                        : 'border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:border-transparent'
                    } disabled:opacity-50`}
                  />
                </div>
                {/* Inline Field Error */}
                {fieldErrors.email && (
                  <p
                    id="email-error"
                    data-testid="email-error"
                    className="text-[11px] text-red-600 flex items-center space-x-1 mt-1 font-semibold"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
                {/* Soft Domain Guidance Warning */}
                {!fieldErrors.email && emailWarning && (
                  <div
                    data-testid="email-warning"
                    className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2 mt-1.5"
                  >
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{emailWarning}</span>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  {mode === 'signup' && (
                    <span className="text-[10px] text-slate-400">Min 6 characters</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={passwordInputRef}
                    id="login-password"
                    data-testid="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    disabled={isSubmitting}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={handlePasswordBlur}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-xs outline-none min-h-[42px] transition ${
                      fieldErrors.password
                        ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400'
                        : 'border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:border-transparent'
                    } disabled:opacity-50`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isSubmitting}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Inline Field Error */}
                {fieldErrors.password && (
                  <p
                    id="password-error"
                    data-testid="password-error"
                    className="text-[11px] text-red-600 flex items-center space-x-1 mt-1 font-semibold"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="login-submit-btn"
                data-testid="login-submit-btn"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{mode === 'signin' ? 'Signing in…' : 'Creating account…'}</span>
                  </div>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Statutory Security Disclaimer */}
          <div className="text-center text-[11px] text-slate-500 space-y-1">
            <p className="flex items-center justify-center space-x-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Ministry of Gender, Labour and Social Development</span>
            </p>
            <p>Republic of Uganda • Authorised Government Personnel Only</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[10px] text-slate-500 border-t border-slate-800/80 bg-[#0b132b]/40">
        TRANSFORMATIVE Institutional Diagnostic Application • Phase 1 Supabase Integration
      </footer>
    </div>
  );
};
