import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, NotificationItem } from '../types/index.ts';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (role: UserRole) => Promise<void>;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  refreshNotifications: () => void;
  showDevEmailModal: boolean;
  setShowDevEmailModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [showDevEmailModal, setShowDevEmailModal] = useState<boolean>(false);

  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
      } else {
        removeAuthToken();
        setUser(null);
      }
    } catch {
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!getAuthToken()) return;
    try {
      const data = await api.getNotifications();
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadNotificationsCount(data.unreadCount || 0);
      }
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    if (res.token) {
      setAuthToken(res.token);
      setUser(res.user);
      setActiveView('dashboard');
      fetchNotifications();
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setActiveView('login');
  };

  const quickSwitchRole = async (targetRole: UserRole) => {
    const roleCredentials: Record<UserRole, { email: string; pass: string }> = {
      admin: { email: 'admin@itlabsolutions.com', pass: 'Admin@123456' },
      hr: { email: 'hr@itlabsolutions.com', pass: 'Hr@123456' },
      receptionist: { email: 'reception@itlabsolutions.com', pass: 'Reception@123456' },
      technician: { email: 'technician@itlabsolutions.com', pass: 'Tech@123456' },
    };

    const creds = roleCredentials[targetRole];
    if (creds) {
      await login(creds.email, creds.pass);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeView,
        setActiveView,
        selectedEntityId,
        setSelectedEntityId,
        login,
        logout,
        quickSwitchRole,
        notifications,
        unreadNotificationsCount,
        refreshNotifications: fetchNotifications,
        showDevEmailModal,
        setShowDevEmailModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
