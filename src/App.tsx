/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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

function MainLayout() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [exportInterviewId, setExportInterviewId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
          {/* Stylized Uganda Crest with gentle pulse */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 via-red-600 to-black p-1 shadow-2xl flex items-center justify-center animate-pulse">
            <div className="w-full h-full bg-[#0b132b] rounded-full flex items-center justify-center p-2">
              <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 10 L80 30 L80 65 L50 90 L20 65 L20 30 Z" fill="#D97706" stroke="#FEF3C7" strokeWidth="3" />
                <path d="M50 20 L70 35 L70 60 L50 78 L30 60 L30 35 Z" fill="#DC2626" />
                <circle cx="50" cy="48" r="10" fill="#1E293B" stroke="#FDE047" strokeWidth="2" />
                <path d="M47 43 L53 43 L50 53 Z" fill="#FDE047" />
              </svg>
            </div>
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
  return (
    <AuthProvider>
      <InterviewProvider>
        <RootContent />
      </InterviewProvider>
    </AuthProvider>
  );
}

