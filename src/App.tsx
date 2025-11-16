import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { NotificationBanner } from './components/NotificationBanner';
import { DashboardPage } from './pages/DashboardPage';
import { ArticleFormPage } from './pages/ArticleFormPage';
import { PreviewPage } from './pages/PreviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SalesPage } from './pages/SalesPage';
import { PlannerPage } from './pages/PlannerPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';   // ⬅️ nouveau

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <NotificationBanner />
                <AppLayout>
                  <Routes>
                    {/* Nouvelle page d’accueil */}
                    <Route path="/" element={<HomePage />} />

                    {/* Mon stock déplacé sur /stock */}
                    <Route path="/stock" element={<DashboardPage />} />

                    <Route path="/articles/new" element={<ArticleFormPage />} />
                    <Route path="/articles/:id/edit" element={<ArticleFormPage />} />
                    <Route path="/articles/:id/preview" element={<PreviewPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/sales" element={<SalesPage />} />
                    <Route path="/planner" element={<PlannerPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
