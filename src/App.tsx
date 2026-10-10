import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentDetailsFormPage } from './pages/StudentDetailsFormPage';
import { HomePage } from './pages/HomePage';
import { AiAgentPage } from './pages/AiAgentPage';
import { ChatPage } from './pages/ChatPage';
import { RoleDashboardPage } from './pages/RoleDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { CompetencyPage } from './pages/CompetencyPage';
import { SubmitDoubtPage } from './pages/SubmitDoubtPage';
import { PeerMatchingPage } from './pages/PeerMatchingPage';
import { LearningRequestsPage } from './pages/LearningRequestsPage';
import { VideoSessionPage } from './pages/VideoSessionPage';
import { SessionSummariesPage } from './pages/SessionSummariesPage';
import { AssessmentCatalogPage } from './pages/AssessmentCatalogPage';
import { AssessmentTakingPage } from './pages/AssessmentTakingPage';
import { AssessmentResultsPage } from './pages/AssessmentResultsPage';
import { AssessmentReviewsPage } from './pages/AssessmentReviewsPage';
import { AssessmentProgressPage } from './pages/AssessmentProgressPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboardingStep === 'details') {
    return <Navigate to="/onboarding/details" replace />;
  }
  return <Navigate to="/home" replace />;
}

function ProtectedWorkspaceRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600">
            Loading PeerConnect AI...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Step 2: Post-Registration Student Academic & Skills Details Form */}
          <Route
            path="/onboarding/details"
            element={
              <ProtectedWorkspaceRoute>
                <StudentDetailsFormPage />
              </ProtectedWorkspaceRoute>
            }
          />

          {/* Main Application Views */}
          <Route
            path="/home"
            element={
              <ProtectedWorkspaceRoute>
                <HomePage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedWorkspaceRoute>
                <HomePage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/ai-agent"
            element={
              <ProtectedWorkspaceRoute>
                <AiAgentPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedWorkspaceRoute>
                <ChatPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedWorkspaceRoute>
                <ChatPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/role-dashboard"
            element={
              <ProtectedWorkspaceRoute>
                <RoleDashboardPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedWorkspaceRoute>
                <ProfilePage />
              </ProtectedWorkspaceRoute>
            }
          />

          {/* Additional Supporting Routes */}
          <Route
            path="/competencies"
            element={
              <ProtectedWorkspaceRoute>
                <CompetencyPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/submit-doubt"
            element={
              <ProtectedWorkspaceRoute>
                <SubmitDoubtPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/peer-matches"
            element={
              <ProtectedWorkspaceRoute>
                <PeerMatchingPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/learning-requests"
            element={
              <ProtectedWorkspaceRoute>
                <LearningRequestsPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/video-session"
            element={
              <ProtectedWorkspaceRoute>
                <VideoSessionPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/session-summaries"
            element={
              <ProtectedWorkspaceRoute>
                <SessionSummariesPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/assessments"
            element={
              <ProtectedWorkspaceRoute>
                <AssessmentCatalogPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/assessments/:id/take"
            element={
              <ProtectedWorkspaceRoute>
                <AssessmentTakingPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/assessment-results/:attemptId"
            element={
              <ProtectedWorkspaceRoute>
                <AssessmentResultsPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/assessment-reviews"
            element={
              <ProtectedWorkspaceRoute>
                <AssessmentReviewsPage />
              </ProtectedWorkspaceRoute>
            }
          />
          <Route
            path="/assessment-progress"
            element={
              <ProtectedWorkspaceRoute>
                <AssessmentProgressPage />
              </ProtectedWorkspaceRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
