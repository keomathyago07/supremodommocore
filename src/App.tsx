import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DashboardHome from "./pages/DashboardHome";
import NeuralEvolutionPage from "./pages/NeuralEvolutionPage";
import AnalysisPage from "./pages/AnalysisPage";
import BetsPage from "./pages/BetsPage";
import GateHistoryPage from "./pages/GateHistoryPage";
import ResultsPage from "./pages/ResultsPage";
import AISpecialistsPage from "./pages/AISpecialistsPage";
import AIAdvancedConfigPage from "./pages/AIAdvancedConfigPage";
import GateConfigPage from "./pages/GateConfigPage";
import ApiConfigPage from "./pages/ApiConfigPage";
import SettingsPage from "./pages/SettingsPage";
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="evolution" element={<NeuralEvolutionPage />} />
              <Route path="analysis" element={<AnalysisPage />} />
              <Route path="bets" element={<BetsPage />} />
              <Route path="history" element={<GateHistoryPage />} />
              <Route path="results" element={<ResultsPage />} />
              <Route path="ai" element={<AISpecialistsPage />} />
              <Route path="aiconfig" element={<AIAdvancedConfigPage />} />
              <Route path="gates" element={<GateConfigPage />} />
              <Route path="api" element={<ApiConfigPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
