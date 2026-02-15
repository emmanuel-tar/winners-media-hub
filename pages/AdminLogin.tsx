
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const admins = db.getAdmins();
    const adminUser = admins.find(a => a.email.toLowerCase() === email.toLowerCase());

    if (adminUser && password.length >= 6) {
      onLogin(adminUser);
    } else if (!adminUser) {
      setError('Access Denied. This email is not authorized.');
    } else {
      setError('Invalid password. Minimum 6 characters required.');
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

          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Authorized Personnel Only
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
