import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Barcode, 
  User as UserIcon, 
  LogOut, 
  Mail, 
  Shield, 
  CheckCircle,
  Menu,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenService: (serviceId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenService }) => {
  const { 
    user, 
    logout, 
    quickSwitchRole, 
    notifications, 
    unreadNotificationsCount, 
    refreshNotifications,
    setShowDevEmailModal
  } = useAuth();

  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeError, setBarcodeError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const handleBarcodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setBarcodeError('');
    try {
      const res = await api.lookupBarcode(barcodeInput.trim());
      if (res && res.id) {
        onOpenService(res.id);
        setBarcodeInput('');
      } else {
        setBarcodeError('No match found');
        setTimeout(() => setBarcodeError(''), 3000);
      }
    } catch {
      setBarcodeError('Barcode not found');
      setTimeout(() => setBarcodeError(''), 3000);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      refreshNotifications();
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      refreshNotifications();
    } catch {
      // ignore
    }
  };

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    admin: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    hr: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    receptionist: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    technician: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  };

  const currentRoleStyle = user?.role ? roleColors[user.role] : roleColors.admin;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-xs print:hidden">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white font-black text-sm tracking-tighter shadow-sm">
            ITL
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-900 leading-tight">IT Lab Solutions Limited</h1>
            <p className="text-[10px] text-slate-500 font-medium">Enterprise IT Operations & Service Panel</p>
          </div>
        </div>
      </div>

      {/* Middle: Barcode Scanner / Service Lookup */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <form onSubmit={handleBarcodeSearch} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Barcode className="w-4 h-4 text-blue-600" />
          </div>
          <input
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Scan barcode or enter Service ID (e.g. SRV-2026-0001)..."
            className="w-full pl-9 pr-20 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition flex items-center space-x-1"
          >
            <Search className="w-3 h-3" />
            <span>Search</span>
          </button>
          {barcodeError && (
            <span className="absolute -bottom-5 left-3 text-[10px] text-rose-600 font-medium animate-pulse">
              {barcodeError}
            </span>
          )}
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Quick Role Tester Selector */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wider transition ${currentRoleStyle.bg} ${currentRoleStyle.text} ${currentRoleStyle.border}`}
            title="Switch demo role to test role-specific dashboards"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role: {user?.role}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Role Dashboard
              </div>
              {(['admin', 'hr', 'receptionist', 'technician'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    quickSwitchRole(r);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition capitalize ${
                    user?.role === r ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{r === 'admin' ? 'Admin Panel' : r === 'hr' ? 'HR Panel' : r === 'receptionist' ? 'Receptionist Panel' : 'Technician Panel'}</span>
                  {user?.role === r && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Email Dispatches Hub */}
        <button
          onClick={() => setShowDevEmailModal(true)}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
          title="View transactional verification emails & tokens"
        >
          <Mail className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-40 text-xs">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white">
                <span className="font-semibold text-xs">Notifications</span>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-300 hover:text-white"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No new notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className={`p-3 hover:bg-slate-50 cursor-pointer transition ${
                        n.is_read ? 'opacity-60 bg-white' : 'bg-blue-50/40'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 flex items-center justify-between">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
            {user?.name ? user.name.slice(0, 2) : 'IT'}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px]">{user?.name}</div>
            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
