
import React from 'react';
import { Search, Filter, Play, Download, Calendar, User, SlidersHorizontal, History, X, Trash2 } from 'lucide-react';
import { db } from '../services/db';
import { Media, Category } from '../types';

interface LibraryProps {
  onPlay: (media: Media) => void;
}

const SEARCH_HISTORY_KEY = 'faithstream_recent_searches';
const MAX_HISTORY = 6;

const Library: React.FC<LibraryProps> = ({ onPlay }) => {
  const [allMedia, setAllMedia] = React.useState<Media[]>([]);
  const [filteredMedia, setFilteredMedia] = React.useState<Media[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  // Load initial data
  React.useEffect(() => {
    const data = db.getMedia();
    setAllMedia(data);
    setFilteredMedia(data);

    const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (savedHistory) {
      try {
        setRecentSearches(JSON.parse(savedHistory));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Filter and history update logic
  React.useEffect(() => {
    let result = allMedia;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.preacher.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'All') {
      result = result.filter(m => m.category === selectedCategory);
    }

    setFilteredMedia(result);

    // Debounced history update
    const timeoutId = setTimeout(() => {
      const trimmed = searchQuery.trim();
      if (trimmed.length >= 3) {
        updateHistory(trimmed);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, allMedia]);

  const updateHistory = (query: string) => {
    setRecentSearches(prev => {
      // Don't add if already at the top
      if (prev[0] === query) return prev;
      
      const filtered = prev.filter(s => s.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== itemToRemove);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const handleDownload = (e: React.MouseEvent, media: Media) => {
    e.stopPropagation();
    db.incrementDownload(media.id);
    const link = document.createElement('a');
    link.href = media.fileUrl;
    link.download = `${media.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 font-serif">Message Library</h1>
          <p className="text-slate-500 text-lg">Browse our spiritual archives for your edification.</p>
        </div>

        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, preacher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none text-slate-900 font-bold shadow-sm placeholder:font-normal placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-700 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none w-full sm:w-48 pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none text-slate-900 font-bold"
              >
                <option value="All">All Categories</option>
                {Object.values(Category).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center text-slate-400 mr-1">
                <History className="h-3.5 w-3.5 mr-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Recent:</span>
              </div>
              {recentSearches.map((term, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSearchQuery(term)}
                  className="group flex items-center bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-full border border-red-100 transition-all shadow-sm cursor-pointer pl-3 pr-1.5 py-1"
                >
                  <span className="mr-2">{term}</span>
                  <button
                    onClick={(e) => removeHistoryItem(e, term)}
                    className="p-0.5 rounded-full hover:bg-red-200 text-red-400 hover:text-red-700 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <button 
                onClick={clearHistory} 
                className="flex items-center space-x-1 px-2 py-1 text-slate-300 hover:text-red-600 transition-colors text-[10px] font-bold uppercase tracking-tighter"
                title="Clear all"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredMedia.map((media) => (
            <div 
              key={media.id} 
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
              onClick={() => onPlay(media)}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={media.thumbnailUrl}
                  alt={media.title}
                  className="w-full h-full object-cover transform transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white p-4 rounded-full text-red-700 shadow-xl transform scale-90 group-hover:scale-100 transition-all">
                    <Play className="h-6 w-6 fill-current" />
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-red-800/90 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-bold">
                  {media.duration}
                </div>
                <div className="absolute bottom-3 left-3 bg-red-700 text-white text-[10px] uppercase tracking-widest px-2.5 py-1 rounded shadow-lg font-bold">
                  {media.category}
                </div>
              </div>

              <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-red-700 transition-colors line-clamp-1 font-serif">
                    {media.title}
                  </h3>
                  <div className="flex flex-col space-y-1 text-xs text-slate-500 font-bold">
                    <div className="flex items-center uppercase tracking-tight">
                      <User className="h-3 w-3 mr-2 text-red-600" />
                      {media.preacher}
                    </div>
                    <div className="flex items-center uppercase tracking-tight">
                      <Calendar className="h-3 w-3 mr-2 text-red-600" />
                      {new Date(media.datePreached).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div className="flex items-center space-x-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{media.playCount.toLocaleString()} Plays</span>
                    <span>•</span>
                    <span>{media.downloadCount.toLocaleString()} DLs</span>
                  </div>
                  <button
                    onClick={(e) => handleDownload(e, media)}
                    className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-3xl border border-dashed border-red-200">
          <div className="max-w-xs mx-auto space-y-4">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Search className="h-10 w-10 text-red-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-serif">No matches found</h3>
            <p className="text-slate-500">We couldn't find any media matching your search. Try different keywords.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="text-red-700 font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
