import React, { useState, useEffect } from 'react';
import { Mail, X, Check, Copy, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../../services/api.ts';

interface DevEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess?: () => void;
}

export const DevEmailModal: React.FC<DevEmailModalProps> = ({ isOpen, onClose, onVerifySuccess }) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [verifyingToken, setVerifyingToken] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const res = await api.getDevDispatches();
      if (res && res.queue) {
        setQueue(res.queue);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDispatches();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleSimulateVerification = async (token: string) => {
    setVerifyingToken(token);
    try {
      const res = await api.verifyEmail(token);
      setVerifyMessage(res.message || 'Email successfully verified!');
      if (onVerifySuccess) onVerifySuccess();
      setTimeout(() => {
        fetchDispatches();
        setVerifyMessage(null);
      }, 2500);
    } catch (err: any) {
      setVerifyMessage(`Error: ${err.message}`);
    } finally {
      setVerifyingToken(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-semibold text-sm">Transactional Email & Token Dispatcher</h3>
              <p className="text-xs text-slate-400">Development Environment Verification Hub</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDispatches}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900">
            <span className="font-semibold">SMTP Note:</span> In production, configure environment variables{' '}
            <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono">SMTP_HOST</code>,{' '}
            <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono">SMTP_PORT</code>,{' '}
            <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono">SMTP_USER</code>,{' '}
            <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono">SMTP_PASS</code>.
            In development, all expiring verification tokens and password reset links are automatically captured below so you can test complete authentication flows.
          </div>

          {verifyMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{verifyMessage}</span>
            </div>
          )}

          {queue.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Mail className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p>No verification or password reset emails dispatched yet.</p>
              <p className="text-xs text-slate-400 mt-1">Register a new user or request a password reset to generate tokens.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-800">
                      To: <span className="text-blue-700">{item.to}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-medium text-[10px] uppercase">
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 font-mono text-[11px] text-slate-700 mb-3 break-all flex items-center justify-between">
                    <span className="truncate mr-2">{item.token}</span>
                    <button
                      onClick={() => copyToClipboard(item.token)}
                      className="text-slate-500 hover:text-slate-800 shrink-0 p-1"
                      title="Copy token"
                    >
                      {copiedToken === item.token ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Dispatched: {new Date(item.sent_at).toLocaleTimeString()}
                    </span>

                    {item.type === 'verification' ? (
                      <button
                        onClick={() => handleSimulateVerification(item.token)}
                        disabled={verifyingToken === item.token}
                        className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs shadow-sm transition disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{verifyingToken === item.token ? 'Verifying...' : 'Verify Now (1-Click)'}</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Use on password reset page</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
