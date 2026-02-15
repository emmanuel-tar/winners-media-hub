
import React from 'react';
import { Plus, Trash2, Edit3, BarChart3, Upload, Loader2, Sparkles, CheckCircle, X, ImagePlus, FileImage, Play, Headphones, CloudUpload, User, Calendar, Download, Users, ShieldCheck, Mail, AlertCircle, Save, ShieldAlert, Eye, Lock } from 'lucide-react';
import { db } from '../services/db';
import { geminiService } from '../services/gemini';
import { Media, Category, Admin, AdminRole } from '../types';

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
}

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onPlay, currentUser }) => {
  const [activeTab, setActiveTab] = React.useState<'library' | 'users'>('library');
  const [mediaList, setMediaList] = React.useState<Media[]>([]);
  const [adminList, setAdminList] = React.useState<Admin[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  // Audio Upload States
  const [isUploadingFile, setIsUploadingFile] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [showSuccess, setShowSuccess] = React.useState(false);
  
  // Thumbnail Upload States
  const [isUploadingThumb, setIsUploadingThumb] = React.useState(false);
  const [showThumbSuccess, setShowThumbSuccess] = React.useState(false);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingAdminId, setEditingAdminId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  
  const [adminEmailForm, setAdminEmailForm] = React.useState('');
  const [adminRoleForm, setAdminRoleForm] = React.useState<AdminRole>(AdminRole.EDITOR);

  // Role Permissions
  const canEditMedia = currentUser.role === AdminRole.FULL_ACCESS || currentUser.role === AdminRole.EDITOR;
  const canManageAdmins = currentUser.role === AdminRole.FULL_ACCESS;

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
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setUploadProgress(0);
    setIsUploadingFile(false);
    setIsUploadingThumb(false);
    setShowSuccess(false);
    setShowThumbSuccess(false);
    setErrors({});
  };

  const closeAdminModal = () => {
    setIsAdminModalOpen(false);
    setEditingAdminId(null);
    setAdminEmailForm('');
    setAdminRoleForm(AdminRole.EDITOR);
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

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this media from the library?')) {
      db.deleteMedia(id);
      setMediaList(db.getMedia());
    }
  };

  const handleEdit = (media: Media) => {
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
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setUploadProgress(0);
    setShowSuccess(false);
    setShowThumbSuccess(false);
    setIsModalOpen(true);
    setErrors({});
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailForm) return;

    if (editingAdminId) {
      db.updateAdmin(editingAdminId, adminEmailForm, adminRoleForm);
    } else {
      db.addAdmin(adminEmailForm, adminRoleForm);
    }
    
    setAdminList(db.getAdmins());
    closeAdminModal();
  };

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdminId(admin.id);
    setAdminEmailForm(admin.email);
    setAdminRoleForm(admin.role);
    setIsAdminModalOpen(true);
  };

  const handleRemoveAdmin = (id: string) => {
    if (confirm('Are you sure you want to revoke this user\'s admin privileges?')) {
      db.removeAdmin(id);
      setAdminList(db.getAdmins());
    }
  };

  const handleGenerateAI = async () => {
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

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      setTimeout(() => {
        const objectUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, thumbnailUrl: objectUrl }));
        setIsUploadingThumb(false);
        setShowThumbSuccess(true);
      }, 1200);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      if (file.size > MAX_AUDIO_SIZE) {
        setErrors(prev => ({ ...prev, fileUrl: "File too large. Maximum allowed size is 100MB." }));
        e.target.value = '';
        return;
      }

      setIsUploadingFile(true);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          const objectUrl = URL.createObjectURL(file);
          setFormData(prev => ({
            ...prev,
            fileUrl: objectUrl
          }));
          setIsUploadingFile(false);
          setUploadProgress(100);
          setShowSuccess(true);
        } else {
          setUploadProgress(Math.floor(progress));
        }
      }, 150);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingId) {
      db.updateMedia(editingId, formData);
    } else {
      db.addMedia(formData);
    }
    
    setMediaList(db.getMedia());
    closeModal();
  };

  const totalPlays = mediaList.reduce((acc, m) => acc + m.playCount, 0);
  const totalDownloads = mediaList.reduce((acc, m) => acc + m.downloadCount, 0);

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case AdminRole.FULL_ACCESS:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-widest shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Full Access
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
          {canManageAdmins && (
            <button
              onClick={() => { setEditingAdminId(null); setAdminEmailForm(''); setAdminRoleForm(AdminRole.EDITOR); setIsAdminModalOpen(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <Users className="h-4 w-4 text-red-700" />
              <span>Add Admin</span>
            </button>
          )}
          {canEditMedia && (
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
        {canManageAdmins && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'users' ? 'bg-white text-red-700 shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Team Management
          </button>
        )}
      </div>

      {activeTab === 'library' || !canManageAdmins ? (
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
            <div className="px-6 py-4 border-b border-slate-100 bg-red-50/30">
              <h2 className="font-bold text-red-900 uppercase tracking-widest text-sm">Media Content Database</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-5">Message Details</th>
                    <th className="px-6 py-5">Preacher</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Engagement</th>
                    <th className="px-6 py-5 text-right">Modification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {mediaList.map((media) => (
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
                          <div className="flex items-center text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                            <Headphones className="h-3.5 w-3.5 mr-2 text-red-700/30 group-hover:text-red-700" />
                            {media.playCount.toLocaleString()} <span className="ml-1 opacity-50">PLAYS</span>
                          </div>
                          <div className="flex items-center text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                            <Download className="h-3.5 w-3.5 mr-2 text-amber-600/30 group-hover:text-amber-600" />
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
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
                    value={adminEmailForm}
                    onChange={(e) => setAdminEmailForm(e.target.value)}
                    placeholder="name@winnerschurch.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-700 outline-none transition-all text-slate-900 font-bold placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Access Control Level</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { role: AdminRole.FULL_ACCESS, icon: ShieldAlert, desc: 'Complete system management rights.' },
                    { role: AdminRole.EDITOR, icon: Edit3, desc: 'Manage media content only.' },
                    { role: AdminRole.VIEWER, icon: Eye, desc: 'Read-only access to library & stats.' },
                  ].map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setAdminRoleForm(item.role)}
                      className={`flex items-start p-3 border-2 rounded-2xl transition-all text-left group ${
                        adminRoleForm === item.role 
                          ? 'border-red-600 bg-red-50' 
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mr-3 ${adminRoleForm === item.role ? 'bg-red-700 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-red-700'}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${adminRoleForm === item.role ? 'text-red-900' : 'text-slate-700'}`}>{item.role}</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{item.desc}</p>
                      </div>
                      {adminRoleForm === item.role && (
                        <div className="ml-auto">
                          <CheckCircle className="h-5 w-5 text-red-600" />
                        </div>
                      )}
                    </button>
                  ))}
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
                      <div className={`relative border-2 border-dashed rounded-2xl p-4 transition-all ${showSuccess ? 'border-green-200 bg-green-50 shadow-inner' : 'border-red-100 hover:border-red-300 bg-red-50/20'}`}>
                        {isUploadingFile ? (
                          <div className="space-y-3 py-2 animate-pulse">
                            <div className="flex justify-between items-center text-[10px] font-bold text-red-700 uppercase">
                              <span>Uploading audio...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-red-700 transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                            </div>
                          </div>
                        ) : showSuccess ? (
                          <div className="flex items-center justify-between py-2 text-green-700 font-bold text-xs uppercase animate-in zoom-in duration-300">
                            <div className="flex items-center">
                              <CheckCircle className="h-5 w-5 mr-2" />
                              <span>Audio File Verified</span>
                            </div>
                            <label className="text-[10px] text-green-600 underline cursor-pointer hover:text-green-800">
                              Replace
                              <input type="file" accept="audio/mpeg" className="hidden" onChange={handleFileChange} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-4 group">
                            <CloudUpload className="h-6 w-6 text-red-700/60 group-hover:text-red-700 group-hover:scale-110 transition-all" />
                            <span className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Select MP3 Audio</span>
                            <input type="file" accept="audio/mpeg" className="hidden" onChange={handleFileChange} />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail Image */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Display Image <span className="text-red-500">*</span></label>
                      <div className={`relative border-2 border-dashed rounded-2xl p-4 transition-all ${formData.thumbnailUrl ? 'border-amber-200 bg-amber-50/30' : 'border-red-100 hover:border-red-300 bg-red-50/20'}`}>
                        {isUploadingThumb ? (
                          <div className="flex flex-col items-center justify-center py-4 space-y-2">
                            <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                            <span className="text-[10px] font-bold text-amber-700 uppercase">Processing...</span>
                          </div>
                        ) : formData.thumbnailUrl ? (
                          <div className="relative group animate-in fade-in duration-500">
                            <img src={formData.thumbnailUrl} className="w-full h-12 object-cover rounded-lg shadow-sm" alt="" />
                            {showThumbSuccess && (
                               <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-md">
                                 <CheckCircle className="h-3 w-3" />
                               </div>
                            )}
                            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg cursor-pointer transition-opacity">
                              <ImagePlus className="h-4 w-4 text-white" />
                              <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-4 group">
                            <FileImage className="h-6 w-6 text-red-700/60 group-hover:text-red-700 group-hover:scale-110 transition-all" />
                            <span className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Upload Cover</span>
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
                  className="flex-grow py-4 bg-red-700 text-white font-bold rounded-2xl hover:bg-red-800 transition-all shadow-xl shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
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
