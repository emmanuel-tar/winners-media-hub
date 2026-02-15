
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, X } from 'lucide-react';
import { Media } from '../types';
import { db } from '../services/db';

interface AudioPlayerProps {
  media: Media | null;
  onClose: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ media, onClose }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [volume, setVolume] = React.useState(80);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (media) {
      setIsPlaying(true);
      db.incrementPlay(media.id);
      if (audioRef.current) {
        audioRef.current.play();
      }
    }
  }, [media]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const handleDownload = () => {
    if (media) {
      db.incrementDownload(media.id);
      const link = document.createElement('a');
      link.href = media.fileUrl;
      link.download = `${media.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!media) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[100] transform transition-transform duration-300">
      <audio
        ref={audioRef}
        src={media.fileUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Media Info */}
        <div className="flex items-center space-x-4 w-full md:w-1/4">
          <img
            src={media.thumbnailUrl}
            alt={media.title}
            className="w-14 h-14 rounded-xl object-cover shadow-md border-2 border-red-50"
          />
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-slate-900 truncate font-serif">{media.title}</h4>
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{media.preacher}</p>
          </div>
          <button onClick={onClose} className="md:hidden ml-auto p-1 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-full md:w-1/2 gap-2">
          <div className="flex items-center space-x-8">
            <button className="text-slate-400 hover:text-red-700 transition-colors">
              <SkipBack className="h-6 w-6" />
            </button>
            <button
              onClick={togglePlay}
              className="bg-red-700 text-white p-4 rounded-full hover:bg-red-800 transition-all shadow-xl shadow-red-200"
            >
              {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
            </button>
            <button className="text-slate-400 hover:text-red-700 transition-colors">
              <SkipForward className="h-6 w-6" />
            </button>
          </div>
          <div className="w-full flex items-center space-x-4">
            <span className="text-[10px] font-bold text-slate-400 w-10 text-right">
              {audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-700"
            />
            <span className="text-[10px] font-bold text-slate-400 w-10">
              {media.duration}
            </span>
          </div>
        </div>

        {/* Tools */}
        <div className="hidden md:flex items-center justify-end space-x-6 w-1/4">
          <div className="flex items-center space-x-3">
            <Volume2 className="h-4 w-4 text-slate-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v / 100;
              }}
              className="w-24 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-700"
            />
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-700 px-4 py-2 rounded-xl border border-red-100 transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>MP3</span>
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-red-700 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default AudioPlayer;
