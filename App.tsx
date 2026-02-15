
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Library from './pages/Library';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { AuthState, Media, Admin } from './types';

const App: React.FC = () => {
  const [auth, setAuth] = React.useState<AuthState>(() => {
    const savedUser = localStorage.getItem('faithstream_user');
    return {
      isAdmin: !!savedUser,
      user: savedUser ? JSON.parse(savedUser) : null
    };
  });
  const [currentMedia, setCurrentMedia] = React.useState<Media | null>(null);

  const handleLogin = (admin: Admin) => {
    setAuth({ isAdmin: true, user: admin });
    localStorage.setItem('faithstream_user', JSON.stringify(admin));
  };

  const handleLogout = () => {
    setAuth({ isAdmin: false, user: null });
    localStorage.removeItem('faithstream_user');
  };

  const handlePlayMedia = (media: Media) => {
    setCurrentMedia(media);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50/50 pb-32 md:pb-24">
        <Navbar isAdmin={auth.isAdmin} onLogout={handleLogout} />
        
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home onPlay={handlePlayMedia} />} />
            <Route path="/library" element={<Library onPlay={handlePlayMedia} />} />
            <Route 
              path="/admin/login" 
              element={auth.isAdmin ? <Navigate to="/admin" /> : <AdminLogin onLogin={handleLogin} />} 
            />
            <Route 
              path="/admin" 
              element={auth.isAdmin && auth.user ? <AdminDashboard onPlay={handlePlayMedia} currentUser={auth.user} /> : <Navigate to="/admin/login" />} 
            />
          </Routes>
        </main>

        <footer className="bg-white border-t border-red-100 py-16 px-4 text-center">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center justify-center space-x-3 text-red-700 font-bold uppercase tracking-tight text-[11px] sm:text-xs lg:text-sm text-center max-w-3xl leading-relaxed">
                <div className="hidden md:block h-px w-12 bg-red-200"></div>
                <span>Living Faith Church WorldWide, AKA Winners Chapel International, Agric Ikorodu</span>
                <div className="hidden md:block h-px w-12 bg-red-200"></div>
              </div>
              
              <div className="relative inline-block px-8 py-2">
                <div className="absolute inset-0 bg-red-50 rounded-full scale-110 opacity-50"></div>
                <p className="relative text-red-900 font-black text-lg sm:text-xl lg:text-2xl uppercase tracking-[0.3em] font-serif italic">
                  LFC AGRIC, GREATER GLORY
                </p>
              </div>
            </div>
            
            <div className="pt-8 border-t border-slate-50 space-y-4">
              <p className="text-slate-500 text-[11px] font-medium max-w-lg mx-auto leading-loose">
                © {new Date().getFullYear()} Living Faith Church Worldwide. <br className="sm:hidden" />
                All Rights Reserved. Empowered for Exploits.
              </p>
              
              <div className="flex flex-col items-center">
                <div className="h-px w-20 bg-slate-100 mb-4"></div>
                <p className="text-red-700/60 text-[10px] sm:text-[11px] uppercase tracking-[0.4em] font-black">
                  designed by CodedFingers
                </p>
              </div>
            </div>
          </div>
        </footer>

        <AudioPlayer 
          media={currentMedia} 
          onClose={() => setCurrentMedia(null)} 
        />
      </div>
    </Router>
  );
};

export default App;
