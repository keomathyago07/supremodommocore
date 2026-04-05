import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import DashboardSidebar from '@/components/DashboardSidebar';
import { AutoAnalysisProvider, useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import { useAgendadorIA } from '@/hooks/useGerarJogo';

const DashboardLayout = () => {
  const auto = useAutoAnalysis();
  const navigate = useNavigate();
  useAgendadorIA('19:30');

  useEffect(() => {
    auto.onGateFound.current = () => {
      navigate('/dashboard/history');
    };

    return () => {
      auto.onGateFound.current = null;
    };
  }, [auto.onGateFound, navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

const DashboardPage = () => {
  return (
    <AutoAnalysisProvider>
      <DashboardLayout />
    </AutoAnalysisProvider>
  );
};

export default DashboardPage;
