import { Outlet } from 'react-router-dom';
import DashboardSidebar from '@/components/DashboardSidebar';

const DashboardPage = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardPage;
