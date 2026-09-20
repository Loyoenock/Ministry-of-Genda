/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InterviewProvider, useInterviews } from './context/InterviewContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DynamicInterviewForm } from './components/DynamicInterviewForm';
import { NewInterviewModal } from './components/NewInterviewModal';
import { AdminAnalyticsDashboard } from './components/AdminAnalyticsDashboard';
import { UserManagementView } from './components/UserManagementView';
import { DocumentsView } from './components/DocumentsView';
import { ProfileView } from './components/ProfileView';
import { SupportView } from './components/SupportView';
import { DiagnosticExportModal } from './components/DiagnosticExportModal';
import { LoginView } from './components/LoginView';
import { Interview } from './types';
import { fetchQuestionsFromSupabase } from './lib/questionsService';
import { isSupabaseConfigured } from './lib/supabase';

function MainLayout() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [exportInterviewId, setExportInterviewId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // On app start, attempt fetchQuestionsFromSupabase to warm in-memory & local cache
  useEffect(() => {
    fetchQuestionsFromSupabase().catch((err) => {
      console.warn('App start questions sync notice:', err);
    });
  }, []);

  const { role, isAdmin } = useAuth();

  const handleOpenInterview = (interviewId: string) => {
    setActiveInterviewId(interviewId);
    setMobileNavOpen(false);
  };

  const handleBackToDashboard = () => {
    setActiveInterviewId(null);
  };

  const handleInterviewCreated = (newInterview: Interview) => {
    setActiveInterviewId(newInterview.id);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Top Ministry & Programme Header */}
      <Header
        onNavigate={(tab) => {
          setActiveInterviewId(null);
          setActiveTab(tab);
          setMobileNavOpen(false);
        }}
        onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
        isMobileNavOpen={mobileNavOpen}
      />

      {/* Main Workspace with Navy Sidebar & Body Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navy Dark Left Sidebar (Persistent on Desktop, Drawer on Mobile) */}
        <Sidebar
          activeTab={activeInterviewId ? 'interviews' : activeTab}
          onSelectTab={(tab) => {
            setActiveInterviewId(null);
            setActiveTab(tab);
            setMobileNavOpen(false);
          }}
          onOpenNewInterview={() => {
            setShowNewModal(true);
            setMobileNavOpen(false);
          }}
          isMobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        {/* Dynamic Content Surface */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-[#f8fafc]">
          {activeInterviewId ? (
            <DynamicInterviewForm
              interviewId={activeInterviewId}
              onBack={handleBackToDashboard}
              onOpenExport={() => setExportInterviewId(activeInterviewId)}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  onOpenInterview={handleOpenInterview}
                  onOpenNewInterview={() => setShowNewModal(true)}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'interviews' && (
                <DashboardView
                  onOpenInterview={handleOpenInterview}
                  onOpenNewInterview={() => setShowNewModal(true)}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'documents' && (
                <DocumentsView onOpenInterview={handleOpenInterview} />
              )}

              {activeTab === 'notes' && (
                <DashboardView
                  onOpenInterview={handleOpenInterview}
                  onOpenNewInterview={() => setShowNewModal(true)}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'admin-analytics' && (
                <AdminAnalyticsDashboard onOpenInterview={handleOpenInterview} />
              )}

              {activeTab === 'admin-users' && (
                <UserManagementView />
              )}

              {activeTab === 'profile' && (
                <ProfileView />
              )}

              {activeTab === 'support' && (
                <SupportView />
              )}
            </>
          )}
        </main>
      </div>

      {/* New Interview Wizard Modal */}
      <NewInterviewModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onInterviewCreated={handleInterviewCreated}
      />

      {/* Diagnostic Brief Export Modal */}
      {exportInterviewId && (
        <DiagnosticExportModal
          interviewId={exportInterviewId}
          onClose={() => setExportInterviewId(null)}
        />
      )}
    </div>
  );
}

function RootContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d1f] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-teal-500 selection:text-white">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          {/* Official Uganda Coat of Arms */}
          <div className="w-20 h-20 flex items-center justify-center animate-pulse">
            <img
              src="/Coat_of_arms_of_Uganda.svg"
              alt="Coat of Arms of Uganda"
              className="w-full h-full object-contain drop-shadow-2xl select-none"
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-wide">
              MGLSD Labour Directorate
            </h2>
            <p className="text-xs text-slate-400">
              Loading diagnostic interview workspace...
            </p>
          </div>
          <div className="w-40 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return <MainLayout />;
}

export default function App() {
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
  if (!isSupabaseConfigured && !isTestEnv) {
    return (
      <div className="min-h-screen bg-[#070d1f] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-teal-500 selection:text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-tight">Supabase Configuration Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The MGLSD Labour Directorate Diagnostic Interview Application requires a live Supabase backend. Please configure <code className="text-teal-400 font-mono">VITE_SUPABASE_URL</code> and <code className="text-teal-400 font-mono">VITE_SUPABASE_ANON_KEY</code> in your environment or <code className="text-teal-400 font-mono">.env</code> file.
            </p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl text-left text-[11px] text-slate-300 space-y-1 font-mono">
            <p className="text-amber-300 font-bold"># .env example</p>
            <p>VITE_SUPABASE_URL=https://your-project.supabase.co</p>
            <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <InterviewProvider>
        <RootContent />
      </InterviewProvider>
    </AuthProvider>
  );
}

