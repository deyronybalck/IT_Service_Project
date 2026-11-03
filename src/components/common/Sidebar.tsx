import React from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  CalendarClock, 
  FileText, 
  School, 
  Users, 
  FileSpreadsheet, 
  Package, 
  BookOpen, 
  Receipt, 
  PhoneCall, 
  BarChart3, 
  UserCog, 
  History, 
  Settings, 
  PlusCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, activeView, setActiveView } = useAuth();
  const currentRole = user?.role || 'admin';

  const navItems: NavItem[] = [
    // Core
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'hr', 'receptionist', 'technician'] },
    
    // Services
    { id: 'services', label: 'Service Management', icon: Wrench, roles: ['admin', 'hr', 'receptionist', 'technician'] },
    { id: 'schedules', label: currentRole === 'technician' ? 'My Field Schedules' : 'Field Service Schedules', icon: CalendarClock, roles: ['admin', 'hr', 'receptionist', 'technician'] },
    { id: 'technician-reports', label: 'Technician Daily Reports', icon: FileText, roles: ['admin', 'hr', 'receptionist', 'technician'] },
    { id: 'technician-requests', label: currentRole === 'technician' ? 'New Field Calls' : 'Field Requests Approval', icon: PlusCircle, roles: ['admin', 'technician'] },
    { id: 'free-lab', label: 'Free Computer Lab Service', icon: School, roles: ['admin', 'technician'] },
    
    // Sales & Commercial
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet, roles: ['admin', 'hr', 'receptionist'] },
    { id: 'customers', label: 'Customer Management', icon: Users, roles: ['admin', 'hr', 'receptionist'] },
    { id: 'products', label: 'Product Inventory', icon: Package, roles: ['admin', 'receptionist'] },
    
    // Financials
    { id: 'ledger', label: 'Customer Ledger & Collections', icon: BookOpen, roles: ['admin'] },
    { id: 'tada', label: currentRole === 'technician' ? 'My TA/DA Claims' : 'TA/DA Expense Claims', icon: Receipt, roles: ['admin', 'hr', 'technician'] },
    
    // Communication & Follow-up
    { id: 'followups', label: 'Customer Follow-ups', icon: PhoneCall, roles: ['admin', 'hr', 'receptionist'] },
    
    // Analytics & Admin
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['admin', 'hr'] },
    { id: 'users', label: 'User Management', icon: UserCog, roles: ['admin'] },
    { id: 'activity', label: 'Activity Logs', icon: History, roles: ['admin', 'hr'] },
    { id: 'settings', label: 'System & WhatsApp', icon: Settings, roles: ['admin'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(currentRole));

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-20
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-xs tracking-tighter">
              ITL
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide uppercase">IT LAB SOLUTIONS</div>
              <div className="text-[10px] text-blue-400 capitalize font-medium">{currentRole} Panel</div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {currentRole === 'admin' ? 'Admin Navigation' : currentRole === 'hr' ? 'HR Operations' : currentRole === 'receptionist' ? 'Front Desk Operations' : 'Technician Workspace'}
          </div>

          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' 
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-600 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          <div>IT Lab Solutions Limited</div>
          <div className="text-[9px] text-slate-600 mt-0.5">Version 2.4 Production Suite</div>
        </div>
      </aside>
    </>
  );
};
