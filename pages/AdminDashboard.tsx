
import React from 'react';
import { Plus, Trash2, Edit3, BarChart3, Upload, Loader2, Sparkles, CheckCircle, X, ImagePlus, FileImage, Play, Headphones, CloudUpload, User, Calendar, Download, Users, ShieldCheck, Mail, AlertCircle, Save, ShieldAlert, Eye, EyeOff, Lock, ArrowUp, ArrowDown, ArrowUpDown, Search, Bell, Megaphone, KeyRound } from 'lucide-react';
import { db } from '../services/db';
import { saveFile, deleteFile } from '../services/storage';
import { geminiService } from '../services/gemini';
import { Media, Category, Admin, AdminRole, Notice } from '../types';

interface AdminDashboardProps {
  onPlay?: (media: Media) => void;
  currentUser: Admin;
}

interface FormErrors {
  title?: string;
  preacher?: string;
  category?: string;
  datePreached?: string;
  description?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  noticeImage?: string;
}

type SortField = 'date' | 'title' | 'preacher' | 'plays' | 'downloads';
type SortOrder = 'asc' | 'desc';

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onPlay, currentUser }) => {
  const [activeTab, setActiveTab] = React.useState<'library' | 'users' | 'notices'>('library');
  const [mediaList, setMediaList] = React.useState<Media[]>([]);
  const [adminList, setAdminList] = React.useState<Admin[]>([]);
  const [noticeList, setNoticeList] = React.useState<Notice[]>([]);
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = React.useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = React.useState(false);
  
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  // Sorting State
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Audio Upload States
  const [isUploadingFile, setIsUploadingFile] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = React.useState<string | null>(null);
  const [uploadedThumbUrl, setUploadedThumbUrl] = React.useState<string | null>(null);
  
  // Thumbnail Upload States
  const [isUploadingThumb, setIsUploadingThumb] = React.useState(false);
  const [showThumbSuccess, setShowThumbSuccess] = React.useState(false);

  // Notice Image State
  const [isUploadingNoticeThumb, setIsUploadingNoticeThumb] = React.useState(false);

  const [uploadedNoticeImageUrl, setUploadedNoticeImageUrl] = React.useState<string | null>(null);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingAdminId, setEditingAdminId] = React.useState<string | null>(null);
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});
  
  const [adminFormData, setAdminFormData] = React.useState<{
    email: string;
    password?: string;
    role: AdminRole;
  }>({
    email: '',
    password: '',
    role: AdminRole.EDITOR
  });

  // Notice Form State
  const [noticeForm, setNoticeForm] = React.useState<{
    id?: string;
    title: string;
    message: string;
    date: string;
    priority: 'High' | 'Normal';
    active: boolean;
    imageUrl?: string;
  }>({
    title: '',
    message: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'Normal',
    active: true,
    imageUrl: ''
  });

  // Role Permissions
  const canEditMedia = currentUser.role === AdminRole.ADMIN || currentUser.role === AdminRole.EDITOR;
  const canManageAdmins = currentUser.role === AdminRole.ADMIN;
  const canManageNotices = currentUser.role === AdminRole.ADMIN || currentUser.role === AdminRole.EDITOR;

  const initialFormState = {
    title: '',
    preacher: '',
    category: Category.SERMON,
    description: '',
    datePreached: new Date().toISOString().split('T')[0],
    fileUrl: '', 
    thumbnailUrl: '',
    duration: '40:00'
  };

  const [formData, setFormData] = React.useState(initialFormState);

  React.useEffect(() => {
    setMediaList(db.getMedia());
    setAdminList(db.getAdmins());
    setNoticeList(db.getNotices());
  }, []);

  const closeModal = (skipCleanup: boolean = false) => {
    if (skipCleanup !== true) {
      if (uploadedFileUrl && uploadedFileUrl.startsWith('indexeddb://')) {
        const fileId = uploadedFileUrl.replace('indexeddb://', '');
        deleteFile(fileId).catch(e => console.error("Failed to cleanup orphaned file:", e));
      }
      if (uploadedThumbUrl && uploadedThumbUrl.startsWith('indexeddb://')) {
        const thumbId = uploadedThumbUrl.replace('indexeddb://', '');
        deleteFile(thumbId).catch(e => console.error("Failed to cleanup orphaned thumbnail:", e));
      }
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setUploadProgress(0);
    setIsUploadingFile(false);
    setIsUploadingThumb(false);
    setShowSuccess(false);
    setShowThumbSuccess(false);
    setErrors({});
    setUploadedFileUrl(null);
    setUploadedThumbUrl(null);
  };

  const closeAdminModal = () => {
    setIsAdminModalOpen(false);
    setEditingAdminId(null);
    setAdminFormData({ email: '', password: '', role: AdminRole.EDITOR });
  };

  const closeNoticeModal = (skipCleanup: boolean = false) => {
    if (skipCleanup !== true && uploadedNoticeImageUrl && uploadedNoticeImageUrl.startsWith('indexeddb://')) {
      const fileId = uploadedNoticeImageUrl.replace('indexeddb://', '');
      deleteFile(fileId).catch(e => console.error("Failed to cleanup orphaned notice image:", e));
    }
    setIsNoticeModalOpen(false);
    setNoticeForm({
        title: '',
        message: '',
        date: new Date().toISOString().split('T')[0],
        priority: 'Normal',
        active: true,
        imageUrl: ''
    });
    setIsUploadingNoticeThumb(false);
    setErrors({});
    setUploadedNoticeImageUrl(null);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) newErrors.title = "A message title is required";
    if (!formData.preacher.trim()) newErrors.preacher = "The preacher/speaker name is required";
    if (!formData.datePreached) newErrors.datePreached = "A valid preaching date is required";
    if (!formData.description.trim()) newErrors.description = "A brief description helps members find content";
    if (!formData.fileUrl) newErrors.fileUrl = "Please upload an MP3 audio file";
    if (!formData.thumbnailUrl) newErrors.thumbnailUrl = "A thumbnail image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sorting Logic
  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default sort directions:
      // Text/Date -> Asc (A-Z, Oldest) usually, but for Date 'desc' (Newest) is better default.
      // Numbers -> Desc (Highest)
      if (field === 'date' || field === 'plays' || field === 'downloads') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  const sortedMediaList = React.useMemo(() => {
    let processed = [...mediaList];
    
    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      processed = processed.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.preacher.toLowerCase().includes(q)
      );
    }

    // Sort
    return processed.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'preacher':
          comparison = a.preacher.localeCompare(b.preacher);
          break;
        case 'date':
          comparison = new Date(a.datePreached).getTime() - new Date(b.datePreached).getTime();
          break;
        case 'plays':
          comparison = a.playCount - b.playCount;
          break;
        case 'downloads':
          comparison = a.downloadCount - b.downloadCount;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [mediaList, sortField, sortOrder, searchQuery]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-300 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-red-600 ml-1.5" />
      : <ArrowDown className="h-3 w-3 text-red-600 ml-1.5" />;
  };

  const handleDelete = async (id: string) => {
    if (!canEditMedia) return;
    if (confirm('Are you sure you want to permanently delete this media from the library?')) {
      const media = mediaList.find(m => m.id === id);
      if (media) {
        if (media.fileUrl.startsWith('indexeddb://')) {
          const fileId = media.fileUrl.replace('indexeddb://', '');
          try {
            await deleteFile(fileId);
          } catch (e) {
            console.error("Failed to delete file from IndexedDB:", e);
          }
        }
        if (media.thumbnailUrl.startsWith('indexeddb://')) {
          const thumbId = media.thumbnailUrl.replace('indexeddb://', '');
          try {
            await deleteFile(thumbId);
          } catch (e) {
            console.error("Failed to delete thumbnail from IndexedDB:", e);
          }
        }
      }
      db.deleteMedia(id);
      setMediaList(db.getMedia());
    }
  };

  const handleEdit = (media: Media) => {
    if (!canEditMedia) return;
    setEditingId(media.id);
    setFormData({
      title: media.title,
      preacher: media.preacher,
      category: media.category,
      description: media.description || '',
      datePreached: media.datePreached,
      fileUrl: media.fileUrl,
      thumbnailUrl: media.thumbnailUrl,
      duration: media.duration
    });
    setUploadProgress(100); 
    setShowSuccess(true);
    setShowThumbSuccess(true);
    setIsModalOpen(true);
    setErrors({});
    setUploadedFileUrl(null);
    setUploadedThumbUrl(null);
  };

  const handleAddNew = () => {
    if (!canEditMedia) return;
    setEditingId(null);
    setFormData(initialFormState);
    setUploadProgress(0);
    setShowSuccess(false);
    setShowThumbSuccess(false);
    setIsModalOpen(true);
    setErrors({});
    setUploadedFileUrl(null);
    setUploadedThumbUrl(null);
  };

  const handleAddNewNotice = () => {
    if (!canManageNotices) return;
    setNoticeForm({
        title: '',
        message: '',
        date: new Date().toISOString().split('T')[0],
        priority: 'Normal',
        active: true,
        imageUrl: ''
    });
    setUploadedNoticeImageUrl(null);
    setIsNoticeModalOpen(true);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAdmins) return;
    if (!adminFormData.email) return;

    if (!editingAdminId && !adminFormData.password) {
      alert("A password is required when creating a new admin.");
      return;
    }

    if (editingAdminId) {
      db.updateAdmin(editingAdminId, adminFormData);
    } else {
      db.addAdmin(adminFormData);
    }
    
    setAdminList(db.getAdmins());
    closeAdminModal();
  };

  const handleEditAdmin = (admin: Admin) => {
    if (!canManageAdmins) return;
    setEditingAdminId(admin.id);
    setAdminFormData({
      email: admin.email,
      role: admin.role,
      password: '' // Don't show existing password
    });
    setIsAdminModalOpen(true);
  };

  const handleRemoveAdmin = (id: string) => {
    if (!canManageAdmins) return;
    if (confirm('Are you sure you want to revoke this user\'s admin privileges?')) {
      db.removeAdmin(id);
      setAdminList(db.getAdmins());
    }
  };

  const handleNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageNotices) return;
    if (!noticeForm.title || !noticeForm.message) return;
    
    if (noticeForm.id) {
      const originalNotice = noticeList.find(n => n.id === noticeForm.id);
      if (originalNotice && originalNotice.imageUrl !== noticeForm.imageUrl && originalNotice.imageUrl?.startsWith('indexeddb://')) {
        const oldFileId = originalNotice.imageUrl.replace('indexeddb://', '');
        deleteFile(oldFileId).catch(error => console.error("Failed to delete old notice image:", error));
      }
      db.updateNotice(noticeForm.id, noticeForm);
    } else {
      db.addNotice(noticeForm);
    }
    setNoticeList(db.getNotices());
    closeNoticeModal(true);
  };

  const handleDeleteNotice = (id: string) => {
    if (!canManageNotices) return;
    if (confirm('Delete this announcement?')) {
      const notice = noticeList.find(n => n.id === id);
      if (notice && notice.imageUrl?.startsWith('indexeddb://')) {
        const fileId = notice.imageUrl.replace('indexeddb://', '');
        deleteFile(fileId).catch(e => console.error("Failed to delete notice image:", e));
      }
      db.deleteNotice(id);
      setNoticeList(db.getNotices());
    }
  };

  const handleGenerateAI = async () => {
    if (!canEditMedia) return;
    if (!formData.description) {
      setErrors(prev => ({ ...prev, description: "Enter a description first so AI can analyze it" }));
      return;
    }
    setIsGenerating(true);
    const result = await geminiService.generateMediaMetadata(formData.description);
    if (result) {
      setFormData(prev => ({
        ...prev,
        title: result.suggestedTitle
      }));
      setErrors(prev => ({ ...prev, title: undefined }));
    }
    setIsGenerating(false);
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditMedia) return;
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, thumbnailUrl: "Please select a valid image file (PNG/JPG)." }));
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setErrors(prev => ({ ...prev, thumbnailUrl: "Thumbnail exceeds 5MB limit." }));
        return;
      }

      setErrors(prev => ({ ...prev, thumbnailUrl: undefined }));
      setIsUploadingThumb(true);
      setShowThumbSuccess(false);
      
      try {
        // Cleanup previous uploaded thumbnail if user changes mind
        if (uploadedThumbUrl && uploadedThumbUrl.startsWith('indexeddb://')) {
          const oldFileId = uploadedThumbUrl.replace('indexeddb://', '');
          deleteFile(oldFileId).catch(e => console.error("Failed to cleanup previous thumbnail:", e));
        }

        const fileId = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const storageUrl = await saveFile(fileId, file);
        
        setUploadedThumbUrl(storageUrl);
        setFormData(prev => ({ ...prev, thumbnailUrl: storageUrl }));
        setIsUploadingThumb(false);
        setShowThumbSuccess(true);
      } catch (error) {
        console.error("Error saving thumbnail:", error);
        setErrors(prev => ({ ...prev, thumbnailUrl: "Failed to save thumbnail. Please try again." }));
        setIsUploadingThumb(false);
      }
    }
  };

  const handleNoticeImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!canManageNotices) return;
     const file = e.target.files?.[0];
     if (file) {
       setErrors(prev => ({ ...prev, noticeImage: undefined }));
       
       const isImage = file.type.startsWith('image/');
       if (!isImage) {
         setErrors(prev => ({ ...prev, noticeImage: 'Please select a valid image file (JPG, PNG, etc).' }));
         return;
       }

       if (file.size > MAX_IMAGE_SIZE) {
         setErrors(prev => ({ ...prev, noticeImage: 'Image exceeds the 5MB size limit.' }));
         return;
       }
       setIsUploadingNoticeThumb(true);
       
       try {
         if (uploadedNoticeImageUrl && uploadedNoticeImageUrl.startsWith('indexeddb://')) {
           const oldFileId = uploadedNoticeImageUrl.replace('indexeddb://', '');
           deleteFile(oldFileId).catch(e => console.error("Failed to cleanup previous notice image:", e));
         }

         const fileId = `notice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
         const storageUrl = await saveFile(fileId, file);
         
         setUploadedNoticeImageUrl(storageUrl);
         setNoticeForm(prev => ({ ...prev, imageUrl: storageUrl }));
         setIsUploadingNoticeThumb(false);
       } catch (error) {
         console.error("Error saving notice image:", error);
         setErrors(prev => ({ ...prev, noticeImage: "Failed to save image. Please try again." }));
         setIsUploadingNoticeThumb(false);
       }
     }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditMedia) return;
    const file = e.target.files?.[0];
    if (file) {
      setErrors(prev => ({ ...prev, fileUrl: undefined }));
      setShowSuccess(false);
      setUploadProgress(0);

      const isMp3 = file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3');
      if (!isMp3) {
        setErrors(prev => ({ ...prev, fileUrl: "Unsupported format. Only MP3 files are accepted." }));
        e.target.value = '';
        return;
      }

      const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_AUDIO_SIZE) {
        setErrors(prev => ({ ...prev, fileUrl: "File too large. Maximum allowed size is 100MB." }));
        e.target.value = '';
        return;
      }

      setIsUploadingFile(true);
      
      try {
        // Cleanup previous uploaded file if user changes mind
        if (uploadedFileUrl && uploadedFileUrl.startsWith('indexeddb://')) {
          const oldFileId = uploadedFileUrl.replace('indexeddb://', '');
          deleteFile(oldFileId).catch(e => console.error("Failed to cleanup previous file:", e));
        }

        // Simulate upload progress
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            const next = prev + Math.random() * 20;
            return next >= 90 ? 90 : next;
          });
        }, 150);

        const fileId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const storageUrl = await saveFile(fileId, file);
        
        // Extract duration
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio(objectUrl);
        audio.onloadedmetadata = () => {
          const totalSeconds = Math.floor(audio.duration);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          setFormData(prev => ({ ...prev, duration: formattedDuration }));
          URL.revokeObjectURL(objectUrl);
        };
        
        clearInterval(interval);
        setUploadProgress(100);
        
        setUploadedFileUrl(storageUrl);
        setFormData(prev => ({
          ...prev,
          fileUrl: storageUrl
        }));
        
        setIsUploadingFile(false);
        setShowSuccess(true);
      } catch (error) {
        console.error("Error saving file:", error);
        setErrors(prev => ({ ...prev, fileUrl: "Failed to save file. Please try again." }));
        setIsUploadingFile(false);
        setUploadProgress(0);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditMedia) return;
    if (!validate()) return;

    if (editingId) {
      const originalMedia = mediaList.find(m => m.id === editingId);
      if (originalMedia) {
        if (originalMedia.fileUrl !== formData.fileUrl && originalMedia.fileUrl.startsWith('indexeddb://')) {
          const oldFileId = originalMedia.fileUrl.replace('indexeddb://', '');
          deleteFile(oldFileId).catch(error => console.error("Failed to delete old file from IndexedDB:", error));
        }
        if (originalMedia.thumbnailUrl !== formData.thumbnailUrl && originalMedia.thumbnailUrl.startsWith('indexeddb://')) {
          const oldThumbId = originalMedia.thumbnailUrl.replace('indexeddb://', '');
          deleteFile(oldThumbId).catch(error => console.error("Failed to delete old thumbnail from IndexedDB:", error));
        }
      }
      db.updateMedia(editingId, formData);
    } else {
      db.addMedia(formData);
    }
    
    setMediaList(db.getMedia());
    closeModal(true); // skip cleanup since we saved it
  };

  const totalPlays = mediaList.reduce((acc, m) => acc + m.playCount, 0);
  const totalDownloads = mediaList.reduce((acc, m) => acc + m.downloadCount, 0);

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case AdminRole.ADMIN:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-widest shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Admin
          </span>
        );
      case AdminRole.EDITOR:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-widest shadow-sm">
            <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Editor
          </span>
        );
      case AdminRole.VIEWER:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-slate-50 text-slate-800 border border-slate-200 uppercase tracking-widest shadow-sm">
            <Eye className="h-3.5 w-3.5 mr-1.5" /> Viewer
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 font-serif">Admin Dashboard</h1>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-slate-500 uppercase text-xs font-bold tracking-widest">Winners Media Management Portal</p>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1.5 bg-slate-100 px-2 py-0.5 rounded-md">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Role:</span>
              {getRoleBadge(currentUser.role)}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
           {activeTab === 'notices' && canManageNotices && (
            <button
              onClick={handleAddNewNotice}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-100"
            >
              <Megaphone className="h-4 w-4" />
              <span>Add Notice</span>
            </button>
          )}
          {activeTab === 'users' && canManageAdmins && (
            <button
              onClick={() => { setEditingAdminId(null); setAdminFormData({ email: '', password: '', role: AdminRole.EDITOR }); setIsAdminModalOpen(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <Users className="h-4 w-4 text-red-700" />
              <span>Add Admin</span>
            </button>
          )}
          {activeTab === 'library' && canEditMedia && (
            <button
              onClick={handleAddNew}
              className="flex items-center space-x-2 px-6 py-2 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 transition-all shadow-lg shadow-red-100"
            >
              <Plus className="h-5 w-5" />
              <span>New Message</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('library')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'library' ? 'bg-white text-red-700 shadow-md' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Message Library
        </button>
         <button
          onClick={() => setActiveTab('notices')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'notices' ? 'bg-white text-red-700 shadow-md' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Announcements
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'users' ? 'bg-white text-red-700 shadow-md' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Team Management
        </button>
      </div>

      {activeTab === 'library' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Published Messages', value: mediaList.length, icon: Upload, color: 'bg-red-50 text-red-700' },
              { label: 'Spiritual Impact (Plays)', value: totalPlays.toLocaleString(), icon: BarChart3, color: 'bg-amber-50 text-amber-700' },
              { label: 'Resources Shared (DLs)', value: totalDownloads.toLocaleString(), icon: CheckCircle, color: 'bg-red-50 text-red-800' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-8 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-2xl shadow-inner`}>
                  <stat.icon className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-bold text-red-900 uppercase tracking-widest text-sm py-2">Media Content Database</h2>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by title or preacher..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-red-700 outline-none w-full sm:w-64"
                  />
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg px-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap pl-1">Sort By:</span>
                  <select 
                    value={`${sortField}-${sortOrder}`} 
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortField(field as SortField);
                      setSortOrder(order as SortOrder);
                    }}
                    className="bg-transparent text-slate-700 text-xs font-bold py-2 outline-none cursor-pointer"
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="title-asc">Title (A-Z)</option>
                    <option value="title-desc">Title (Z-A)</option>
                    <option value="preacher-asc">Preacher (A-Z)</option>
                    <option value="plays-desc">Most Played</option>
                    <option value="downloads-desc">Most Downloaded</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                    <th 
                      onClick={() => handleHeaderClick('title')}
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100/50 hover:text-red-700 transition-colors group"
                    >
                      <div className="flex items-center">
                        Message Details
                        <SortIcon field="title" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleHeaderClick('preacher')}
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100/50 hover:text-red-700 transition-colors group"
                    >
                      <div className="flex items-center">
                        Preacher
                        <SortIcon field="preacher" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleHeaderClick('date')}
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100/50 hover:text-red-700 transition-colors group"
                    >
                      <div className="flex items-center">
                        Date
                        <SortIcon field="date" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleHeaderClick('plays')}
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100/50 hover:text-red-700 transition-colors group"
                    >
                      <div className="flex items-center">
                        Engagement
                        <SortIcon field="plays" />
                      </div>
                    </th>
                    <th className="px-6 py-5 text-right">Modification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {sortedMediaList.length > 0 ? (
                    sortedMediaList.map((media) => (
                      <tr 
                        key={media.id} 
                        className="transition-all group even:bg-slate-50/40 hover:bg-red-50/40"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-4">
                            <div className="relative w-14 h-14 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                              <img src={media.thumbnailUrl} className="w-full h-full object-cover rounded-xl shadow-sm border border-slate-100" alt="" />
                              <button 
                                onClick={() => onPlay?.(media)}
                                className="absolute inset-0 bg-red-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-all duration-300"
                              >
                                <Play className="h-5 w-5 text-white fill-current transform scale-90 group-hover:scale-100" />
                              </button>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900 line-clamp-1 font-serif group-hover:text-red-700 transition-colors">{media.title}</div>
                              <div className="text-[10px] font-extrabold text-red-600/80 uppercase tracking-[0.15em] mt-0.5">{media.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center text-sm font-bold text-slate-700">
                            <User className="h-4 w-4 mr-2.5 text-red-700/40 group-hover:text-red-700/60" />
                            {media.preacher}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center text-sm text-slate-500 font-medium">
                            <Calendar className="h-4 w-4 mr-2.5 text-red-700/40 group-hover:text-red-700/60" />
                            {new Date(media.datePreached).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col space-y-1.5">
                            <div className={`flex items-center text-[10px] font-bold transition-colors ${sortField === 'plays' ? 'text-red-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                              <Headphones className={`h-3.5 w-3.5 mr-2 ${sortField === 'plays' ? 'text-red-700' : 'text-red-700/30 group-hover:text-red-700'}`} />
                              {media.playCount.toLocaleString()} <span className="ml-1 opacity-50">PLAYS</span>
                            </div>
                            <div className={`flex items-center text-[10px] font-bold transition-colors ${sortField === 'downloads' ? 'text-amber-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                              <Download className={`h-3.5 w-3.5 mr-2 ${sortField === 'downloads' ? 'text-amber-700' : 'text-amber-600/30 group-hover:text-amber-600'}`} />
                              {media.downloadCount.toLocaleString()} <span className="ml-1 opacity-50">DLS</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {canEditMedia ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => handleEdit(media)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-red-700 transition-all shadow-sm"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Modify</span>
                              </button>
                              <button 
                                onClick={() => handleDelete(media.id)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 text-white bg-red-700/80 rounded-lg text-xs font-bold hover:bg-red-800 transition-all shadow-sm"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end">
                              <div className="p-2 bg-slate-50 rounded-lg text-slate-300">
                                <Lock className="h-4 w-4" />
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                        <div className="flex flex-col items-center space-y-2">
                          <Search className="h-8 w-8 text-slate-200" />
                          <p>No messages found matching your criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'notices' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/30 flex items-center justify-between">
            <h2 className="font-bold text-amber-900 uppercase tracking-widest text-sm">Church Announcements</h2>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">{noticeList.length} Total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-5">Announcement Details</th>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Priority</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {noticeList.length > 0 ? (
                  noticeList.map((notice) => (
                    <tr 
                      key={notice.id} 
                      className="transition-all even:bg-slate-50/40 hover:bg-amber-50/40"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-4">
                          {notice.imageUrl ? (
                            <img src={notice.imageUrl} alt={notice.title} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                              <Megaphone className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{notice.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-xs mt-0.5">{notice.message}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center text-sm font-bold text-slate-700">
                          <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                          {new Date(notice.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          notice.priority === 'High' 
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {notice.priority}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          notice.active 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {notice.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {canManageNotices ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => {
                                setNoticeForm(notice);
                                setUploadedNoticeImageUrl(null);
                                setIsNoticeModalOpen(true);
                              }}
                              className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-amber-700 transition-all shadow-sm"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteNotice(notice.id)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 text-white bg-red-700/80 rounded-lg text-xs font-bold hover:bg-red-800 transition-all shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <Lock className="h-4 w-4 text-slate-300" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      <div className="flex flex-col items-center space-y-2">
                        <Megaphone className="h-8 w-8 text-slate-200" />
                        <p>No active announcements found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-4xl">
          <div className="px-6 py-4 border-b border-slate-100 bg-red-50/30 flex items-center justify-between">
            <h2 className="font-bold text-red-900 uppercase tracking-widest text-sm">Authorized Administrators</h2>
            <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">{adminList.length} Total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-5">Admin Email Address</th>
                  <th className="px-6 py-5">Access Level</th>
                  <th className="px-6 py-5 text-right">Modification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {adminList.map((admin) => (
                  <tr 
                    key={admin.id} 
                    className="transition-all even:bg-slate-50/40 hover:bg-red-50/40"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center text-sm font-bold text-slate-900 group">
                        <Mail className="h-4.5 w-4.5 mr-4 text-red-700/40 group-hover:text-red-700" />
                        {admin.email}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {getRoleBadge(admin.role)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {canManageAdmins ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleEditAdmin(admin)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-red-700 transition-all shadow-sm"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Modify</span>
                          </button>
                          {adminList.length > 1 && (
                            <button 
                              onClick={() => handleRemoveAdmin(admin.id)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 text-white bg-red-700/80 rounded-lg text-xs font-bold hover:bg-red-800 transition-all shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <Lock className="h-4 w-4 text-slate-300" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Modification Modal with Access Control */}
      {isAdminModalOpen && canManageAdmins && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/60 backdrop-blur-sm" onClick={closeAdminModal} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-red-50">
              <h3 className="text-xl font-bold text-red-900 font-serif">
                {editingAdminId ? 'Modify Access Rights' : 'Register New Personnel'}
              </h3>
              <button onClick={closeAdminModal} className="text-slate-400 hover:text-red-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAdminSubmit} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Personnel Email</label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                   <input
                    type="email"
                    required
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    placeholder="name@winnerschurch.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-700 outline-none transition-all text-slate-900 font-bold placeholder-slate-400"
                  />
                </div>
              </div>

               <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                   {editingAdminId ? 'New Password (Optional)' : 'Set Password'}
                </label>
                <div className="relative">
                   <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                   <input
                    type={showAdminPassword ? "text" : "password"}
                    required={!editingAdminId}
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                    placeholder={editingAdminId ? "Leave blank to keep current" : "Create a strong password"}
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-700 outline-none transition-all text-slate-900 font-bold placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-700 transition-colors"
                  >
                    {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Access Control Level</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={adminFormData.role}
                    onChange={(e) => setAdminFormData({ ...adminFormData, role: e.target.value as AdminRole })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-700 outline-none transition-all text-slate-900 font-bold appearance-none"
                  >
                    <option value={AdminRole.ADMIN}>Admin - Complete system management rights</option>
                    <option value={AdminRole.EDITOR}>Editor - Manage media content only</option>
                    <option value={AdminRole.VIEWER}>Viewer - Read-only access to library & stats</option>
                  </select>
                  <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-grow py-4 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingAdminId ? 'Update Permission' : 'Commit Registry'}</span>
                </button>
                <button
                  type="button"
                  onClick={closeAdminModal}
                  className="px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notice Board Modal */}
      {isNoticeModalOpen && canManageNotices && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-amber-950/60 backdrop-blur-sm" onClick={closeNoticeModal} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <h3 className="text-xl font-bold text-amber-900 font-serif">
                Create Announcement
              </h3>
              <button onClick={closeNoticeModal} className="text-slate-400 hover:text-amber-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleNoticeSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Title</label>
                <input
                  type="text"
                  required
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({...noticeForm, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-slate-900 font-bold"
                  placeholder="e.g. Communion Service"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Message Detail</label>
                <textarea
                  required
                  rows={3}
                  value={noticeForm.message}
                  onChange={(e) => setNoticeForm({...noticeForm, message: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-slate-900 font-medium resize-none"
                  placeholder="Enter the full announcement details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Date</label>
                  <input
                    type="date"
                    required
                    value={noticeForm.date}
                    onChange={(e) => setNoticeForm({...noticeForm, date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-slate-900 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Priority</label>
                  <select
                    value={noticeForm.priority}
                    onChange={(e) => setNoticeForm({...noticeForm, priority: e.target.value as 'High' | 'Normal'})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-slate-900 font-bold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setNoticeForm({...noticeForm, active: !noticeForm.active})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 ${
                    noticeForm.active ? 'bg-amber-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      noticeForm.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-bold text-slate-700">
                  {noticeForm.active ? 'Active (Visible to users)' : 'Inactive (Hidden from users)'}
                </span>
              </div>

               <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Announcement Image (Optional)</label>
                <div className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-all ${noticeForm.imageUrl ? 'border-none' : errors.noticeImage ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-amber-400 bg-slate-50'}`}>
                   {isUploadingNoticeThumb ? (
                      <div className="h-32 flex flex-col items-center justify-center bg-slate-50">
                          <Loader2 className="h-6 w-6 text-amber-600 animate-spin mb-2" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Processing Image...</span>
                      </div>
                   ) : noticeForm.imageUrl ? (
                      <div className="relative group h-32 w-full">
                         <img src={noticeForm.imageUrl} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                         <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-xl backdrop-blur-sm gap-3">
                            <label className="cursor-pointer">
                                <div className="bg-white/20 text-white px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center space-x-2 border border-white/30 hover:bg-white/30 transition-all">
                                   <ImagePlus className="h-4 w-4" />
                                   <span className="text-[10px] font-bold uppercase tracking-wide">Change</span>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleNoticeImageChange} />
                            </label>
                            <button
                               type="button"
                               onClick={() => setNoticeForm(prev => ({ ...prev, imageUrl: undefined }))}
                               className="bg-red-500/80 text-white px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center space-x-2 border border-red-500/30 hover:bg-red-500 transition-all"
                            >
                               <Trash2 className="h-4 w-4" />
                               <span className="text-[10px] font-bold uppercase tracking-wide">Remove</span>
                            </button>
                         </div>
                      </div>
                   ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer py-6 group">
                         <ImagePlus className={`h-8 w-8 ${errors.noticeImage ? 'text-red-400' : 'text-slate-300 group-hover:text-amber-600'} transition-colors mb-2`} />
                         <span className={`text-[10px] font-bold ${errors.noticeImage ? 'text-red-500' : 'text-slate-400 group-hover:text-amber-700'} uppercase tracking-widest`}>Upload Banner</span>
                         <input type="file" accept="image/*" className="hidden" onChange={handleNoticeImageChange} />
                      </label>
                   )}
                </div>
                {errors.noticeImage && (
                  <div className="flex items-center space-x-1 mt-1.5 text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">{errors.noticeImage}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isUploadingNoticeThumb}
                  className="flex-grow py-4 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploadingNoticeThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                  <span>Post Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Upload/Modification Modal */}
      {isModalOpen && canEditMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-red-50">
              <h3 className="text-xl font-bold text-red-900 font-serif flex items-center">
                {editingId ? 'Modify Message Data' : 'Publish New Grace'}
              </h3>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-700 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="space-y-6">
                {/* Description & AI Generator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className="flex items-center space-x-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-all"
                    >
                      {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      <span>{isGenerating ? 'ANALYZING...' : 'AI SUGGEST TITLE'}</span>
                    </button>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      if (errors.description) setErrors({ ...errors, description: undefined });
                    }}
                    rows={3}
                    placeholder="Briefly describe the message..."
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-red-700 outline-none transition-all resize-none text-sm font-bold text-slate-900 placeholder-slate-400 ${
                      errors.description ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                    }`}
                  />
                  {errors.description && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.description}</p>}
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Understanding Faith"
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-red-700 outline-none text-sm font-bold text-slate-900 placeholder-slate-400 ${
                        errors.title ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preacher <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.preacher}
                      onChange={(e) => setFormData({ ...formData, preacher: e.target.value })}
                      placeholder="e.g., Bishop David Oyedepo"
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-red-700 outline-none text-sm font-bold text-slate-900 placeholder-slate-400 ${
                        errors.preacher ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Category & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message Category (Channel)</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                      className="w-full px-4 py-3 bg-red-50 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-700 outline-none text-sm font-bold text-red-900 shadow-sm"
                    >
                      {Object.values(Category).map((cat) => (
                        <option key={cat} value={cat} className="text-slate-900 font-medium">{cat.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date Published <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={formData.datePreached}
                      onChange={(e) => setFormData({ ...formData, datePreached: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-700 outline-none text-sm font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Media Uploads */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Audio File */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Audio Content (MP3) <span className="text-red-500">*</span></label>
                      
                      {!formData.fileUrl && !isUploadingFile ? (
                        <div className="border-2 border-dashed border-slate-200 hover:border-red-200 rounded-2xl p-6 transition-all bg-slate-50 hover:bg-red-50/10 group">
                           <label className="flex flex-col items-center justify-center cursor-pointer space-y-3">
                            <div className="bg-white p-3 rounded-full shadow-sm group-hover:shadow-md transition-all group-hover:scale-110">
                              <CloudUpload className="h-6 w-6 text-red-700/60 group-hover:text-red-700" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-700 uppercase tracking-widest transition-colors">Select MP3 File</span>
                            <input type="file" accept="audio/mpeg" className="hidden" onChange={handleFileChange} />
                          </label>
                        </div>
                      ) : isUploadingFile ? (
                        <div className="relative border-2 border-red-200 rounded-2xl p-6 bg-red-50/30 shadow-md overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-shimmer" />
                          <div className="relative z-10">
                            <div className="flex justify-between items-center mb-3">
                               <span className="text-xs font-bold text-red-700 uppercase tracking-widest flex items-center">
                                 <Loader2 className="h-4 w-4 mr-2 animate-spin text-red-600" />
                                 Uploading Media...
                               </span>
                               <span className="text-sm font-black text-red-700">{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                               <div 
                                  className="h-full bg-red-600 transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)] relative overflow-hidden" 
                                  style={{ width: `${uploadProgress}%` }} 
                               >
                                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-progress-stripe" />
                               </div>
                            </div>
                            <p className="text-[10px] text-red-500/80 font-medium mt-2 text-center">Please do not close this window</p>
                          </div>
                        </div>
                      ) : showSuccess ? (
                        <div className="w-full bg-green-50 border-2 border-green-200 rounded-2xl p-5 flex items-center justify-between animate-in fade-in zoom-in duration-300 shadow-sm">
                          <div className="flex items-center space-x-4 text-green-800">
                            <div className="bg-green-100 p-2 rounded-full border-2 border-green-200 shadow-sm">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                               <p className="text-sm font-black uppercase tracking-wide text-green-700">Upload Successful</p>
                               <p className="text-xs text-green-600/80 font-bold mt-0.5">MP3 file is ready for publishing</p>
                            </div>
                          </div>
                          <label className="cursor-pointer px-4 py-2 bg-white border-2 border-green-100 rounded-xl text-[10px] font-bold text-green-700 hover:bg-green-50 hover:border-green-300 uppercase tracking-widest transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                            Change File
                            <input type="file" accept="audio/mpeg" className="hidden" onChange={handleFileChange} />
                          </label>
                        </div>
                      ) : (
                        <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between animate-in fade-in zoom-in duration-300">
                          <div className="flex items-center space-x-3 text-green-800">
                            <div className="bg-green-100 p-1.5 rounded-full border border-green-200">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                            <div>
                               <p className="text-xs font-bold uppercase tracking-wide">Upload Complete</p>
                               <p className="text-[10px] text-green-600 font-medium">MP3 ready for publishing</p>
                            </div>
                          </div>
                          <label className="cursor-pointer px-3 py-1.5 bg-white border border-green-100 rounded-lg text-[10px] font-bold text-slate-500 hover:text-red-700 uppercase tracking-widest transition-all shadow-sm hover:shadow">
                            Change
                            <input type="file" accept="audio/mpeg" className="hidden" onChange={handleFileChange} />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Image */}
                     <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Display Image <span className="text-red-500">*</span></label>
                      
                       <div className={`relative border-2 border-dashed rounded-2xl transition-all overflow-hidden ${formData.thumbnailUrl ? 'border-none' : 'border-slate-200 hover:border-red-200 bg-slate-50'}`}>
                         {isUploadingThumb ? (
                            <div className="h-32 flex flex-col items-center justify-center bg-red-50/30 border-2 border-red-200 rounded-2xl relative overflow-hidden">
                               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-shimmer" />
                               <div className="relative z-10 flex flex-col items-center">
                                 <Loader2 className="h-8 w-8 text-red-600 animate-spin mb-2" />
                                 <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Optimizing Image...</span>
                               </div>
                            </div>
                         ) : formData.thumbnailUrl ? (
                            <div className="relative group h-32 sm:h-40 w-full animate-in fade-in">
                               <img src={formData.thumbnailUrl} className="w-full h-full object-cover rounded-2xl shadow-sm" alt="Thumbnail preview" />
                               <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                                  <label className="cursor-pointer transform scale-90 group-hover:scale-100 transition-all duration-300">
                                      <div className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-xl backdrop-blur-md flex items-center space-x-2">
                                         <ImagePlus className="h-4 w-4" />
                                         <span className="text-xs font-bold uppercase tracking-wide">Replace Cover</span>
                                      </div>
                                      <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                                  </label>
                               </div>
                               
                               {showThumbSuccess && (
                                 <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5 animate-in slide-in-from-top-2 fade-in duration-500">
                                   <CheckCircle className="h-3.5 w-3.5" />
                                   <span className="text-[10px] font-bold uppercase tracking-wide">Verified</span>
                                 </div>
                               )}
                            </div>
                         ) : (
                            <label className="flex flex-col items-center justify-center cursor-pointer py-8 group">
                               <div className="bg-white p-3 rounded-full shadow-sm group-hover:shadow-md transition-all group-hover:scale-110 mb-3">
                                  <FileImage className="h-6 w-6 text-red-700/60 group-hover:text-red-700" />
                               </div>
                               <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-700 uppercase tracking-widest transition-colors">Upload Cover Image</span>
                               <span className="text-[9px] text-slate-400 mt-1">Recommended: 16:9 or 1:1 JPG/PNG</span>
                               <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                            </label>
                         )}
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="mt-10 flex items-center space-x-4">
                <button
                  type="submit"
                  disabled={isUploadingFile || isUploadingThumb}
                  className="flex-grow py-4 bg-red-700 text-white font-bold rounded-2xl hover:bg-red-800 transition-all shadow-xl shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploadingFile || isUploadingThumb ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  <span>{editingId ? 'Save Updates to Library' : 'Publish to Library'}</span>
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
