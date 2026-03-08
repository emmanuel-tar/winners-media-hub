
import React from 'react';
import { Music, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { Admin } from '../types';

interface AdminLoginProps {
  onLogin: (admin: Admin) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSocialLogin = async (provider: 'google' | 'microsoft') => {
    try {
      const response = await fetch(`/api/auth/${provider}/url`);
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        url,
        'oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        setError('Please allow popups for this site to connect your account.');
      }
    } catch (err) {
      console.error('OAuth error:', err);
      setError('Failed to initiate login. Please try again.');
    }
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from our app
      const origin = event.origin;
      if (origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { user } = event.data;
        // Check if user exists in our admin list
        const admins = db.getAdmins();
        const adminUser = admins.find(a => a.email.toLowerCase() === user.email.toLowerCase());

        if (adminUser) {
          onLogin(adminUser);
        } else {
          setError(`Access Denied. The email ${user.email} is not authorized.`);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError('Authentication failed. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const admins = db.getAdmins();
    const adminUser = admins.find(a => a.email.toLowerCase() === email.toLowerCase());

    if (adminUser) {
      if (adminUser.password === password) {
        onLogin(adminUser);
      } else {
        setError('Incorrect password. Please try again.');
      }
    } else {
      setError('Access Denied. This email is not authorized.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-red-50/20">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl border border-slate-200 shadow-[0_20px_60px_rgba(185,28,28,0.1)] space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <div className="bg-red-700 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-red-200 transform rotate-3">
            <Music className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-serif italic">Winners Admin</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Secure Dominion Portal</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-900 leading-normal">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-700/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@winnerschurch.com"
                  className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-700 outline-none transition-all shadow-inner text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-700/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-700 outline-none transition-all shadow-inner text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 transition-all shadow-xl shadow-red-100 flex items-center justify-center space-x-2 group"
          >
            <span className="uppercase tracking-widest">Enter Portal</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-bold tracking-widest">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm group"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('microsoft')}
              className="flex items-center justify-center px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm group"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Microsoft</span>
            </button>
          </div>

          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Authorized Personnel Only
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
