
export enum Category {
  SERMON = 'Sermon',
  WORSHIP = 'Worship',
  BIBLE_STUDY = 'Bible Study',
  CONFERENCE = 'Conference',
  YOUTH = 'Youth'
}

export enum AdminRole {
  FULL_ACCESS = 'Full Access',
  EDITOR = 'Editor',
  VIEWER = 'Viewer'
}

export interface Media {
  id: string;
  title: string;
  preacher: string;
  category: Category;
  description?: string;
  datePreached: string;
  fileUrl: string;
  thumbnailUrl: string;
  duration: string;
  playCount: number;
  downloadCount: number;
  createdAt: string;
}

export interface Admin {
  id: string;
  email: string;
  role: AdminRole;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  date: string;
  priority: 'High' | 'Normal';
  imageUrl?: string;
  active: boolean;
}

export interface AuthState {
  isAdmin: boolean;
  user: Admin | null;
}
