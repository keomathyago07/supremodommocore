import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeSystem";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DashboardHome from "./pages/DashboardHome";
import NeuralEvolutionPage from "./pages/NeuralEvolutionPage";
import AILiveDashboardPage from "./pages/AILiveDashboardPage";
import AnalysisPage from "./pages/AnalysisPage";
import BetsPage from "./pages/BetsPage";
import GateHistoryPage from "./pages/GateHistoryPage";
import ResultsPage from "./pages/ResultsPage";
import AISpecialistsPage from "./pages/AISpecialistsPage";
import AIAdvancedConfigPage from "./pages/AIAdvancedConfigPage";
import GateConfigPage from "./pages/GateConfigPage";
import ApiConfigPage from "./pages/ApiConfigPage";
import SettingsPage from "./pages/SettingsPage";
import AIChatPage from "./pages/AIChatPage";
import FinancialPage from "./pages/FinancialPage";
import AnalyticalEnginePage from "./pages/AnalyticalEnginePage";
import MotorAnaliticoPage from "./pages/MotorAnaliticoPage";
import InstallPage from "./pages/InstallPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}>
                <Route index element={<DashboardHome />} />
                <Route path="evolution" element={<NeuralEvolutionPage />} />
                <Route path="livepanel" element={<AILiveDashboardPage />} />
                <Route path="analysis" element={<AnalysisPage />} />
                <Route path="bets" element={<BetsPage />} />
                <Route path="history" element={<GateHistoryPage />} />
                <Route path="results" element={<ResultsPage />} />
                <Route path="financial" element={<FinancialPage />} />
                <Route path="engine" element={<AnalyticalEnginePage />} />
                <Route path="motor" element={<MotorAnaliticoPage />} />
                <Route path="ai" element={<AISpecialistsPage />} />
                <Route path="aiconfig" element={<AIAdvancedConfigPage />} />
                <Route path="chat" element={<AIChatPage />} />
                <Route path="gates" element={<GateConfigPage />} />
                <Route path="api" element={<ApiConfigPage />} />
                <Route path="install" element={<InstallPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
