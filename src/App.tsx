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
import { Interview } from './types';

function MainLayout() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [exportInterviewId, setExportInterviewId] = useState<string | null>(null);

  const { role, isAdmin } = useAuth();

  const handleOpenInterview = (interviewId: string) => {
    setActiveInterviewId(interviewId);
  };

  const handleBackToDashboard = () => {
    setActiveInterviewId(null);
  };

  const handleInterviewCreated = (newInterview: Interview) => {
    setActiveInterviewId(newInterview.id);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Top Ministry & Programme Header */}
      <Header onNavigate={(tab) => {
        setActiveInterviewId(null);
        setActiveTab(tab);
      }} />

      {/* Main Workspace with Navy Sidebar & Body Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navy Dark Left Sidebar */}
        <Sidebar
          activeTab={activeInterviewId ? 'interviews' : activeTab}
          onSelectTab={(tab) => {
            setActiveInterviewId(null);
            setActiveTab(tab);
          }}
          onOpenNewInterview={() => setShowNewModal(true)}
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

export default function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <MainLayout />
      </InterviewProvider>
    </AuthProvider>
  );
}
