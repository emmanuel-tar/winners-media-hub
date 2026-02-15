
import { Media, Category, Admin, AdminRole, Notice } from '../types';

const MEDIA_KEY = 'faithstream_media';
const ADMIN_KEY = 'faithstream_admins';
const NOTICE_KEY = 'faithstream_notices';

const DEFAULT_MEDIA: Media[] = [
  {
    id: '1',
    title: 'The Power of Grace',
    preacher: 'Pastor John Doe',
    category: Category.SERMON,
    description: 'An inspiring message about the transformative power of grace in our daily lives.',
    datePreached: '2023-10-15',
    fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    thumbnailUrl: 'https://picsum.photos/seed/sermon1/800/600',
    duration: '45:20',
    playCount: 1250,
    downloadCount: 450,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Morning Worship Session',
    preacher: 'Faith Choir',
    category: Category.WORSHIP,
    description: 'A soul-stirring worship session to start your week with praise.',
    datePreached: '2023-11-01',
    fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    thumbnailUrl: 'https://picsum.photos/seed/worship1/800/600',
    duration: '15:10',
    playCount: 3400,
    downloadCount: 890,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_ADMINS: Admin[] = [
  { id: 'admin-1', email: 'admin@church.com', role: AdminRole.FULL_ACCESS }
];

const DEFAULT_NOTICES: Notice[] = [
  {
    id: 'n1',
    title: 'Mid-Week Communion Service',
    message: 'Join us this Wednesday for a special communion service as we partake in the table of the Lord. Time: 6:00 PM.',
    date: new Date().toISOString(),
    priority: 'High',
    active: true,
    imageUrl: 'https://picsum.photos/seed/communion/800/400'
  },
  {
    id: 'n2',
    title: 'Youth Aflame Summit',
    message: 'Calling all youths! The annual Youth Aflame Summit is here. Theme: "Dominion". Don\'t miss out!',
    date: new Date().toISOString(),
    priority: 'Normal',
    active: true,
    imageUrl: 'https://picsum.photos/seed/youth/800/400'
  }
];

export const db = {
  // Media Methods
  getMedia: (): Media[] => {
    const data = localStorage.getItem(MEDIA_KEY);
    if (!data) {
      localStorage.setItem(MEDIA_KEY, JSON.stringify(DEFAULT_MEDIA));
      return DEFAULT_MEDIA;
    }
    return JSON.parse(data);
  },

  saveMedia: (media: Media[]) => {
    localStorage.setItem(MEDIA_KEY, JSON.stringify(media));
  },

  addMedia: (item: Omit<Media, 'id' | 'playCount' | 'downloadCount' | 'createdAt'>) => {
    const current = db.getMedia();
    const newItem: Media = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      playCount: 0,
      downloadCount: 0,
      createdAt: new Date().toISOString()
    };
    db.saveMedia([newItem, ...current]);
    return newItem;
  },

  updateMedia: (id: string, updates: Partial<Media>) => {
    const current = db.getMedia();
    const updated = current.map(m => m.id === id ? { ...m, ...updates } : m);
    db.saveMedia(updated);
  },

  deleteMedia: (id: string) => {
    const current = db.getMedia();
    db.saveMedia(current.filter(m => m.id !== id));
  },

  incrementPlay: (id: string) => {
    const current = db.getMedia();
    const updated = current.map(m => m.id === id ? { ...m, playCount: m.playCount + 1 } : m);
    db.saveMedia(updated);
  },

  incrementDownload: (id: string) => {
    const current = db.getMedia();
    const updated = current.map(m => m.id === id ? { ...m, downloadCount: m.downloadCount + 1 } : m);
    db.saveMedia(updated);
  },

  // Admin Methods
  getAdmins: (): Admin[] => {
    const data = localStorage.getItem(ADMIN_KEY);
    if (!data) {
      localStorage.setItem(ADMIN_KEY, JSON.stringify(DEFAULT_ADMINS));
      return DEFAULT_ADMINS;
    }
    return JSON.parse(data);
  },

  addAdmin: (email: string, role: AdminRole) => {
    const admins = db.getAdmins();
    if (admins.find(a => a.email === email)) return;
    const newAdmin: Admin = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      role
    };
    localStorage.setItem(ADMIN_KEY, JSON.stringify([...admins, newAdmin]));
  },

  updateAdmin: (id: string, email: string, role: AdminRole) => {
    const admins = db.getAdmins();
    const updated = admins.map(a => a.id === id ? { ...a, email, role } : a);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(updated));
  },

  removeAdmin: (id: string) => {
    const admins = db.getAdmins();
    if (admins.length <= 1) return; // Prevent deleting the last admin
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admins.filter(a => a.id !== id)));
  },

  // Notice Board Methods
  getNotices: (): Notice[] => {
    const data = localStorage.getItem(NOTICE_KEY);
    if (!data) {
      localStorage.setItem(NOTICE_KEY, JSON.stringify(DEFAULT_NOTICES));
      return DEFAULT_NOTICES;
    }
    return JSON.parse(data);
  },

  addNotice: (notice: Omit<Notice, 'id'>) => {
    const notices = db.getNotices();
    const newNotice: Notice = {
      ...notice,
      id: Math.random().toString(36).substr(2, 9)
    };
    localStorage.setItem(NOTICE_KEY, JSON.stringify([newNotice, ...notices]));
    return newNotice;
  },

  deleteNotice: (id: string) => {
    const notices = db.getNotices();
    localStorage.setItem(NOTICE_KEY, JSON.stringify(notices.filter(n => n.id !== id)));
  }
};
