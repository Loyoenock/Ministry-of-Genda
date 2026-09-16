/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, signUp, demoLogin, isSupabaseConfigured } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Labour Directorate');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your ministry email address.');
      return;
    }

    if (isSupabaseConfigured && !password.trim()) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await login(email, password);
        if (error) {
          setErrorMessage(error.message || 'Failed to authenticate. Please check your credentials.');
        }
      } else {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full official name.');
          setIsSubmitting(false);
          return;
        }

        const { error } = await signUp(email, password, fullName, department);
        if (error) {
          setErrorMessage(error.message || 'Failed to register account.');
        } else {
          setSuccessMessage(
            'Account registered successfully! If email confirmation is enabled in your Supabase project, please check your inbox.'
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected connection error occurred.');
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
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-slate-900/60 backdrop-blur-xs">
          {isSupabaseConfigured ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300">Supabase Connected</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-300">Demo Prototype Mode</span>
            </>
          )}
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
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition ${
                  mode === 'signin'
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="login-tab-signup"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition ${
                  mode === 'signup'
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Alert message */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div
                id="login-success-alert"
                className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start space-x-2.5 animate-in fade-in"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="login-fullname" className="block text-xs font-bold text-slate-700">
                      Official Full Name
                    </label>
                    <input
                      id="login-fullname"
                      type="text"
                      required
                      placeholder="e.g. John Okello"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none min-h-[42px] transition bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-department" className="block text-xs font-bold text-slate-700">
                      Department / Unit
                    </label>
                    <input
                      id="login-department"
                      type="text"
                      placeholder="e.g. Labour Inspectorate"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none min-h-[42px] transition bg-slate-50 focus:bg-white"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-bold text-slate-700">
                  Ministry Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="officer@mglsd.go.ug"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none min-h-[42px] transition bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  {!isSupabaseConfigured && (
                    <span className="text-[10px] text-slate-400">Optional in demo mode</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required={isSupabaseConfigured}
                    placeholder={isSupabaseConfigured ? '••••••••' : 'Enter password or leave blank'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none min-h-[42px] transition bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md hover:shadow-lg disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Register New Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Access Section (Pure demo mode only) */}
            {!isSupabaseConfigured && (
              <div className="pt-5 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Quick Demo Access
                  </span>
                  <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-semibold">
                    Instant Test Personas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    id="login-demo-interviewer-btn"
                    onClick={() => demoLogin('interviewer')}
                    className="p-3 text-left border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 rounded-xl transition group flex items-start space-x-2.5 min-h-[58px]"
                  >
                    <UserCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5 group-hover:scale-110 transition" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">John Okello</p>
                      <p className="text-[11px] text-slate-500">Interviewer Role (RLS)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="login-demo-admin-btn"
                    onClick={() => demoLogin('admin')}
                    className="p-3 text-left border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 rounded-xl transition group flex items-start space-x-2.5 min-h-[58px]"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5 group-hover:scale-110 transition" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">Florence Nsubuga</p>
                      <p className="text-[11px] text-slate-500">Directorate Admin</p>
                    </div>
                  </button>
                </div>

                <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2">
                  <Database className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Local Prototype Mode:</strong> Supabase environment variables (<code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code>) are not set. You can test all features with mock users above, or configure credentials in <code className="bg-amber-100 px-1 rounded">.env</code>.
                  </p>
                </div>
              </div>
            )}
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
