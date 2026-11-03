import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle, Key, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';

type AuthScreen = 'login' | 'register' | 'forgot' | 'reset';

export const AuthViews: React.FC = () => {
  const { login, quickSwitchRole, setShowDevEmailModal } = useAuth();
  const [screen, setScreen] = useState<AuthScreen>('login');

  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  // Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('technician');
  const [regPhone, setRegPhone] = useState('');

  // Forgot / Reset
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setRequiresVerification(false);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      if (err.data?.requiresVerification) {
        setRequiresVerification(true);
        setUnverifiedEmail(err.data.email || email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const res = await api.register({
        name: regName,
        email: regEmail,
        password: regPass,
        role: regRole,
        phone: regPhone,
      });

      setNotice(res.message);
      if (res.verificationToken) {
        setShowDevEmailModal(true);
      }
      setScreen('login');
      setEmail(regEmail);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const res = await api.forgotPassword(email);
      setNotice(res.message);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setScreen('reset');
      }
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const res = await api.resetPassword({ token: resetToken, newPassword });
      setNotice(res.message);
      setScreen('login');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.resendVerification(unverifiedEmail);
      setNotice(res.message);
      setShowDevEmailModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (role: 'admin' | 'hr' | 'receptionist' | 'technician') => {
    quickSwitchRole(role);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-950 px-8 pt-8 pb-6 text-white text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-lg tracking-tighter shadow-md mb-3">
            ITL
          </div>
          <h2 className="text-xl font-bold tracking-tight">IT Lab Solutions Limited</h2>
          <p className="text-xs text-blue-300 mt-1">Enterprise IT Service Management Web Panel</p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{error}</p>
                {requiresVerification && (
                  <button
                    onClick={handleResendVerification}
                    className="mt-1 text-xs text-blue-700 underline font-semibold hover:text-blue-900"
                  >
                    Resend Verification Email / Token
                  </button>
                )}
              </div>
            </div>
          )}

          {notice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* SCREEN: LOGIN */}
          {screen === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Work Email</label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@itlabsolutions.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Password</label>
                  <button
                    type="button"
                    onClick={() => setScreen('forgot')}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Panel'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* 1-Click Test Role Buttons */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block text-center mb-2">
                  1-Click Role Login for Evaluation
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => quickFill('admin')}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-semibold text-center transition"
                  >
                    Admin Panel
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('hr')}
                    className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-semibold text-center transition"
                  >
                    HR Panel
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('receptionist')}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-semibold text-center transition"
                  >
                    Receptionist
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('technician')}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-semibold text-center transition"
                  >
                    Technician
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setScreen('register')}
                  className="text-xs text-slate-600 hover:text-blue-600 font-medium"
                >
                  New staff member? Register here
                </button>
              </div>
            </form>
          )}

          {/* SCREEN: REGISTER */}
          {screen === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Shakil Ahmed"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Corporate Email *</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="shakil@itlabsolutions.com"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Password (Min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Role *</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="technician">Technician</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="hr">HR</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Mobile Phone</label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+8801..."
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Creating account...' : 'Register Account'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* SCREEN: FORGOT PASSWORD */}
          {screen === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Enter your registered email address. We will generate a secure password reset token for your account.
              </p>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Your Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@itlabsolutions.com"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                <span>{loading ? 'Sending link...' : 'Generate Reset Link'}</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="text-xs text-slate-600 hover:underline font-semibold"
                >
                  Return to Login
                </button>
              </div>
            </form>
          )}

          {/* SCREEN: RESET PASSWORD */}
          {screen === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-700">Reset Security Token *</label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste reset token..."
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">New Password (Min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Updating password...' : 'Confirm New Password'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="text-xs text-slate-600 hover:underline font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
