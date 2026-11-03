import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { Sidebar } from './components/common/Sidebar.tsx';
import { DevEmailModal } from './components/common/DevEmailModal.tsx';

// Views
import { AuthViews } from './components/modules/AuthViews.tsx';
import { DashboardView } from './components/modules/DashboardView.tsx';
import { ServicesView } from './components/modules/ServicesView.tsx';
import { SchedulesView } from './components/modules/SchedulesView.tsx';
import { TechnicianRequestsView } from './components/modules/TechnicianRequestsView.tsx';
import { FreeLabView } from './components/modules/FreeLabView.tsx';
import { QuotationsView } from './components/modules/QuotationsView.tsx';
import { CustomersView } from './components/modules/CustomersView.tsx';
import { ProductsView } from './components/modules/ProductsView.tsx';
import { TadaView } from './components/modules/TadaView.tsx';
import { FollowupsView } from './components/modules/FollowupsView.tsx';
import { ReportsView } from './components/modules/ReportsView.tsx';
import { UsersView } from './components/modules/UsersView.tsx';
import { ActivityLogsView } from './components/modules/ActivityLogsView.tsx';
import { SettingsView } from './components/modules/SettingsView.tsx';

function MainApp() {
  const { 
    user, 
    loading, 
    activeView, 
    setActiveView, 
    selectedEntityId, 
    setSelectedEntityId,
    showDevEmailModal,
    setShowDevEmailModal
  } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-white">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="font-semibold text-sm tracking-wide">IT Lab Solutions Limited</div>
          <p className="text-xs text-slate-400">Loading operations panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthViews />;
  }

  const handleOpenService = (serviceId: string) => {
    setSelectedEntityId(serviceId);
    setActiveView('services');
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onOpenService={handleOpenService} />;
      case 'services':
        return (
          <ServicesView
            initialServiceId={selectedEntityId}
            onClearInitialId={() => setSelectedEntityId(null)}
          />
        );
      case 'schedules':
      case 'technician-reports':
        return <SchedulesView />;
      case 'technician-requests':
        return <TechnicianRequestsView />;
      case 'free-lab':
        return <FreeLabView />;
      case 'quotations':
        return <QuotationsView />;
      case 'customers':
      case 'ledger':
        return <CustomersView />;
      case 'products':
        return <ProductsView />;
      case 'tada':
        return <TadaView />;
      case 'followups':
        return <FollowupsView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersView />;
      case 'activity':
        return <ActivityLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onOpenService={handleOpenService} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenService={handleOpenService}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActiveView()}
        </main>
      </div>

      {/* Transactional Email & Token Dispatcher Modal */}
      <DevEmailModal
        isOpen={showDevEmailModal}
        onClose={() => setShowDevEmailModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
