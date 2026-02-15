
import React from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, Music, Heart, Mic2, Bell, CalendarClock, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { Media, Notice } from '../types';

interface HomeProps {
  onPlay: (media: Media) => void;
}

const Home: React.FC<HomeProps> = ({ onPlay }) => {
  const [recentMedia, setRecentMedia] = React.useState<Media[]>([]);
  const [notices, setNotices] = React.useState<Notice[]>([]);

  React.useEffect(() => {
    setRecentMedia(db.getMedia().slice(0, 3));
    setNotices(db.getNotices().filter(n => n.active).slice(0, 4));
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section - Winners Themed */}
      <section className="relative overflow-hidden bg-red-900 rounded-3xl mx-4 sm:mx-8 px-6 py-16 sm:px-12 sm:py-24 text-center shadow-2xl">
        <div className="absolute inset-0 z-0 opacity-15">
          <img
            src="https://picsum.photos/seed/church-winners/1920/1080"
            alt="Hero background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/90 via-red-800/80 to-amber-900/40 z-0"></div>
        
        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-[0.2em] border border-amber-500/30">
            LFC Agric, Greater Glory
          </div>
          <h1 className="text-4xl sm:text-6xl text-white font-bold leading-tight font-serif italic">
            Experiencing the <span className="text-amber-400">Greater Glory</span> at Agric Ikorodu.
          </h1>
          <p className="text-lg text-red-50/90 max-w-2xl mx-auto leading-relaxed">
            Welcome to the spiritual hub of Living Faith Church, Agric Ikorodu. Access life-transforming sermons and worship sessions curated for your spiritual growth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/library"
              className="w-full sm:w-auto px-10 py-4 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 transition-all shadow-xl"
            >
              Explore Media
            </Link>
            <button className="w-full sm:w-auto px-10 py-4 bg-red-700/40 text-white font-bold rounded-xl hover:bg-red-700/60 border border-white/20 transition-all backdrop-blur-md">
              Join Live Service
            </button>
          </div>
        </div>
      </section>

      {/* Notice Board Section */}
      {notices.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100 shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Bell className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-amber-900 font-serif">Church Notice Board</h2>
                <p className="text-sm text-amber-700/70 font-medium">Important announcements and upcoming activities.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map((notice) => (
                <div key={notice.id} className={`bg-white p-5 rounded-2xl border ${notice.priority === 'High' ? 'border-l-4 border-l-red-500 border-t-slate-100 border-r-slate-100 border-b-slate-100' : 'border-slate-100'} shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>{new Date(notice.date).toLocaleDateString()}</span>
                    </div>
                    {notice.priority === 'High' && (
                      <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Important
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif">{notice.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{notice.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured/Recent Messages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 font-serif">Latest Releases</h2>
            <p className="text-slate-500">Stay updated with messages from our pulpit.</p>
          </div>
          <Link to="/library" className="flex items-center text-red-700 font-semibold hover:underline group">
            See all <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recentMedia.map((media) => (
            <div key={media.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={media.thumbnailUrl}
                  alt={media.title}
                  className="w-full h-full object-cover transform transition-transform group-hover:scale-105"
                />
                <button
                  onClick={() => onPlay(media)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="bg-white p-4 rounded-full text-red-700 shadow-lg">
                    <Play className="h-6 w-6 fill-current" />
                  </div>
                </button>
                <div className="absolute bottom-2 right-2 bg-red-700/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-bold">
                  {media.duration}
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-2 text-xs font-semibold text-red-700 mb-2 uppercase tracking-wider">
                  <span>{media.category}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400">{new Date(media.datePreached).toLocaleDateString()}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-red-700 transition-colors truncate font-serif">
                  {media.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                  {media.description}
                </p>
                <div className="flex items-center text-slate-400 text-xs font-bold">
                  <Mic2 className="h-3.5 w-3.5 mr-1 text-red-600/60" />
                  {media.preacher.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Fast Links - Red/Gold Themed */}
      <section className="bg-red-50/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 font-serif">Digital Channels</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Sermons', icon: Mic2, color: 'bg-red-100 text-red-700' },
              { name: 'Worship', icon: Music, color: 'bg-amber-100 text-amber-700' },
              { name: 'Bible Study', icon: Heart, color: 'bg-red-50 text-red-800' },
              { name: 'Youth', icon: Play, color: 'bg-amber-50 text-amber-900' },
            ].map((cat) => (
              <Link
                key={cat.name}
                to={`/library?category=${cat.name}`}
                className="flex flex-col items-center p-8 bg-white rounded-2xl border border-slate-100 hover:border-red-200 hover:shadow-xl transition-all group"
              >
                <div className={`${cat.color} p-5 rounded-3xl mb-4 shadow-sm transition-transform group-hover:scale-110`}>
                  <cat.icon className="h-8 w-8" />
                </div>
                <span className="font-bold text-slate-900 uppercase tracking-wide text-sm">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
