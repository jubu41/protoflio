"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { uploadImage, deleteImage, addVideo, deleteVideo, updateHeroImage, addFolder, deleteFolder, updateSocialLinks, setAdminPassword, updateAboutText, updateStats, updateAiBoxes, updateFooter } from "@/actions";
import type { DataStore } from "@/lib/data";
import { Camera, Trash2, X, Plus, Upload, FolderPlus, FolderOpen, Video, Edit2, Check, Lock, Unlock, Key, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper, { Point, Area } from "react-easy-crop";

interface Props {
  data: DataStore;
}

// Utility to crop image on client side
const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob | null> => {
    const image = new window.Image();
    image.src = imageSrc;
    await new Promise(resolve => image.onload = resolve);
  
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
  
    if (!ctx) return null;
  
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );
  
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg');
    });
};

export default function ClientPage({ data }: Props) {
  const [activeTab, setActiveTab] = useState('links');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const [activeImageFolderId, setActiveImageFolderId] = useState<string>("default");
  const [activeVideoFolderId, setActiveVideoFolderId] = useState<string>("default");
  
  const heroInputRef = useRef<HTMLInputElement>(null);
  const addImageRef = useRef<HTMLInputElement>(null);

  const [loadingHero, setLoadingHero] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  // Links State
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [ytLink, setYtLink] = useState(data.youtubeLink || "");
  const [igLink, setIgLink] = useState(data.instagramLink || "");
  const [waLink, setWaLink] = useState(data.whatsappLink || "");
  const [liLink, setLiLink] = useState(data.linkedInLink || "");

  // About Text State
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState(data.aboutText || "");

  // Stats State
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [statsData, setStatsData] = useState(() => {
    if (data.statsJson) { try { return JSON.parse(data.statsJson); } catch {} }
    return { views: "1M+", works: (data.images?.length || 0) + (data.videos?.length || 0), subs: "10K+", clients: "50+" };
  });

  // AI Boxes State
  const [isEditingAiBoxes, setIsEditingAiBoxes] = useState(false);
  const [aiBoxesData, setAiBoxesData] = useState(() => {
    if (data.aiBoxesJson) { try { return JSON.parse(data.aiBoxesJson); } catch {} }
    return [
      { title: "Limitless Imagination", desc: "AI video creation breaks all physical boundaries. Instead of relying on expensive camera gear, actors, or locations, artificial intelligence allows us to generate entire worlds from scratch. We can bring surreal concepts to life and visualize ideas that were previously impossible or too costly to produce, pushing the boundaries of creativity." },
      { title: "Cost & Time Efficiency", desc: "Traditional video production requires days of shooting, lighting setup, and intensive post-production editing. AI dramatically reduces both turnaround time and production costs. High-quality visual narratives, marketing content, and promotional videos can be generated in a fraction of the time, providing businesses with a rapid, budget-friendly strategy to scale their online presence." },
      { title: "The Future of Media", desc: "The digital landscape is evolving rapidly, and AI content is at the forefront. AI videos offer hyper-personalization, adaptability, and consistency across platforms. By leveraging cutting-edge algorithms, creators can maintain high engagement rates and stay ahead of the curve, ensuring that their brand message is delivered perfectly tailored to their modern audience." }
    ];
  });
  
  const handleSaveStats = async () => {
    await updateStats(JSON.stringify(statsData));
    setIsEditingStats(false);
  };
  
  const handleSaveAiBoxes = async () => {
    await updateAiBoxes(JSON.stringify(aiBoxesData));
    setIsEditingAiBoxes(false);
  };

  // Footer State
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [footerData, setFooterData] = useState(() => {
    if (data.footerJson) { try { return JSON.parse(data.footerJson); } catch {} }
    return {
      title: "Muhammed Jubair T",
      desc: "Dedicated to creating visually striking, robust, and dynamic artificial intelligence digital experiences.",
      subtitle: "JB Ai Creations",
      address: "Mukkam (Vazhakkad), Kerala",
      location: "Calicut, India"
    };
  });
  
  const handleSaveFooter = async () => {
    await updateFooter(JSON.stringify(footerData));
    setIsEditingFooter(false);
  };

  // Auth State
  const [isAuthed, setIsAuthed] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    setYtLink(data.youtubeLink || "");
    setIgLink(data.instagramLink || "");
    setWaLink(data.whatsappLink || "");
    setLiLink(data.linkedInLink || "");
    setAboutText(data.aboutText || "");
  }, [data.youtubeLink, data.instagramLink, data.whatsappLink, data.linkedInLink, data.aboutText]);

  // Handle Hero Image Selection and Open Crop Modal
  const handleHeroSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && isAuthed) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropModalOpen(true);
      };
      // Reset input so they can select the same file again if aborted
      e.target.value = "";
    }
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    setLoadingHero(true);
    setCropModalOpen(false);

    try {
        const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
        if (croppedBlob) {
            const formData = new FormData();
            formData.append("file", croppedBlob, "profile.jpg");
            await updateHeroImage(formData);
        }
    } catch (e) {
        console.error("Crop save failed", e);
    }
    setLoadingHero(false);
    setCropImageSrc(null);
  };

  const handleCreateFolder = async (e: React.FormEvent, type: "image" | "video") => {
    e.preventDefault();
    if (!isAuthed || !newFolderName.trim()) return;
    const res = await addFolder(newFolderName);
    if (!res.error && res.folder) {
        if (type === "image") setActiveImageFolderId(res.folder.id);
        if (type === "video") setActiveVideoFolderId(res.folder.id);
    }
    setNewFolderName("");
  };

  const handleDeleteFolder = async (folderId: string, type: "image" | "video") => {
    if (!isAuthed || folderId === "default") return;
    if (window.confirm("Are you sure you want to delete this folder? All items inside will be moved to 'All Items'.")) {
      await deleteFolder(folderId);
      if (type === "image" && activeImageFolderId === folderId) setActiveImageFolderId("default");
      if (type === "video" && activeVideoFolderId === folderId) setActiveVideoFolderId("default");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthed) return;
    if (e.target.files && e.target.files.length > 0) {
      setLoadingImages(true);
      for (let i = 0; i < e.target.files.length; i++) {
        const formData = new FormData();
        formData.append("file", e.target.files[i]);
        formData.append("folderId", activeImageFolderId);
        await uploadImage(formData);
      }
      setLoadingImages(false);
      if (addImageRef.current) addImageRef.current.value = "";
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthed || !videoUrl) return;
    await addVideo(videoUrl, activeVideoFolderId);
    setVideoUrl("");
  };

  const handleSaveLinks = async () => {
    await updateSocialLinks(ytLink, igLink, waLink, liLink);
    setIsEditingLinks(false);
  };

  const handleSaveAboutText = async () => {
    await updateAboutText(aboutText);
    setIsEditingAbout(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    if (!data.adminPassword) {
      if (passwordInput.length < 4) {
        setAuthError("Password must be at least 4 characters");
        return;
      }
      await setAdminPassword(passwordInput);
      setIsAuthed(true);
      setShowAuthModal(false);
      setPasswordInput("");
    } else {
      if (passwordInput === data.adminPassword) {
        setIsAuthed(true);
        setShowAuthModal(false);
        setPasswordInput("");
      } else {
        setAuthError("Incorrect password");
      }
    }
  };

  const parseMediaUrl = (url: string) => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('instagram.com')) {
            const path = urlObj.pathname.replace(/\/$/, '');
            return {
                type: 'instagram',
                embedUrl: `https://www.instagram.com${path}/embed`,
                badge: 'INSTAGRAM',
                ratio: 'aspect-[4/5]',
                color: 'bg-pink-500'
            };
        }
        if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/playlist' && urlObj.searchParams.has('list')) {
            return {
                type: 'playlist',
                embedUrl: `https://www.youtube.com/embed/videoseries?list=${urlObj.searchParams.get('list')}`,
                badge: 'PLAYLIST',
                ratio: 'aspect-video',
                color: 'bg-blue-500'
            };
        }
        if (urlObj.pathname.includes('/shorts/')) {
            const id = urlObj.pathname.split('/shorts/')[1].split('/')[0];
            return {
                type: 'shorts',
                embedUrl: `https://www.youtube.com/embed/${id}?rel=0`,
                badge: 'SHORTS',
                ratio: 'aspect-[9/16]',
                color: 'bg-red-500'
            };
        }
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return {
                type: 'youtube',
                embedUrl: `https://www.youtube.com/embed/${match[2]}?rel=0`,
                badge: 'VIDEO',
                ratio: 'aspect-video',
                color: 'bg-purple-500'
            };
        }
    } catch {}
    return null;
  };

  const currentFolderImages = data.images.filter(img => img.folderId === activeImageFolderId || (!img.folderId && activeImageFolderId === "default"));
  const currentFolderVideos = data.videos.filter(vid => vid.folderId === activeVideoFolderId || (!vid.folderId && activeVideoFolderId === "default"));

  const renderFolders = (type: "image" | "video") => {
    const active = type === "image" ? activeImageFolderId : activeVideoFolderId;
    const setActive = type === "image" ? setActiveImageFolderId : setActiveVideoFolderId;

    return (
        <div className="bg-neutral-900/80 p-4 rounded-2xl border border-neutral-700/50 mb-6 w-full shadow-lg">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-white"><FolderOpen size={18} className="text-purple-400"/> Folders</h3>
                {isAuthed && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <form onSubmit={(e) => handleCreateFolder(e, type)} className="flex gap-2 flex-1 md:flex-initial">
                            <input 
                                type="text" 
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New Folder..."
                                className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm flex-1 md:w-32 outline-none focus:border-white text-white"
                            />
                            <button type="submit" className="bg-white text-black p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"><FolderPlus size={16}/></button>
                        </form>
                        {active !== "default" && (
                             <button
                                 onClick={() => handleDeleteFolder(active, type)}
                                 className="bg-red-500/10 text-red-500 p-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-colors border border-red-500/30 ml-2"
                                 title="Delete Selected Folder"
                             >
                                 <Trash2 size={16}/>
                             </button>
                        )}
                    </div>
                )}
            </div>
            <div className="flex flex-wrap gap-2 relative">
                {data.folders?.map(f => (
                    <motion.button 
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        key={f.id}
                        onClick={() => setActive(f.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${active === f.id ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-500 hover:text-white'}`}
                    >
                        {f.name}
                    </motion.button>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="bg-neutral-950 min-h-screen text-slate-100 font-sans selection:bg-purple-500 selection:text-white pb-20 relative">
      
      {/* Admin Lock Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button 
            onClick={() => {
                if (isAuthed) {
                    setIsAuthed(false);
                    setIsEditingLinks(false);
                    setIsEditingAbout(false);
                } else {
                    setShowAuthModal(true);
                }
            }}
            className="flex items-center justify-center p-3 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all shadow-xl"
            title={isAuthed ? "Lock Edit Mode" : "Unlock Edit Mode"}
        >
            {isAuthed ? <Unlock size={20} className="text-green-400"/> : <Lock size={20}/>}
        </button>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative"
                >
                    <button onClick={() => { setShowAuthModal(false); setAuthError(""); setPasswordInput(""); }} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
                        <X size={20} />
                    </button>
                    
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-purple-500/10 rounded-full text-purple-400">
                            <Key size={32} />
                        </div>
                    </div>
                    
                    <h2 className="text-xl font-bold text-center mb-2">
                        {!data.adminPassword ? "Set Edit Password" : "Admin Login"}
                    </h2>
                    <p className="text-neutral-400 text-sm text-center mb-6">
                        {!data.adminPassword 
                            ? "Create a password to protect your front page edits." 
                            : "Enter your password to unlock editing features."}
                    </p>

                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                        <input 
                            type="password" 
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Password..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none text-center tracking-widest text-white"
                            required
                        />
                        {authError && <p className="text-red-400 text-xs text-center">{authError}</p>}
                        <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-neutral-200 transition-colors">
                            {!data.adminPassword ? "Save Password" : "Login"}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Crop Modal */}
      <AnimatePresence>
        {cropModalOpen && cropImageSrc && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center backdrop-blur-md"
            >
                <div className="relative w-full h-[60vh] max-w-2xl bg-neutral-900 mx-4 overflow-hidden rounded-2xl shadow-xl">
                    <Cropper
                        image={cropImageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                
                <div className="flex gap-4 mt-8">
                    <button 
                        onClick={() => { setCropModalOpen(false); setCropImageSrc(null); }}
                        className="px-6 py-3 rounded-full bg-neutral-800 text-white font-semibold hover:bg-neutral-700 transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveCrop}
                        className="px-6 py-3 rounded-full bg-purple-600 text-white font-semibold hover:bg-purple-500 transition shadow-lg shadow-purple-900/40"
                    >
                        Save Crop
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-20">
        
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center mb-10">
            {/* The profile image size (w-40 h-40 md:w-56 md:h-56) */}
            <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden group border-2 border-neutral-800 bg-neutral-900 shadow-2xl mb-6 flex-shrink-0">
                {data.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.heroImage} alt="JB Ai Creations profile" className="object-cover w-full h-full" />
                ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-600">
                    <Camera size={40} />
                </div>
                )}
                
                {isAuthed && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => heroInputRef.current?.click()}>
                    <div className="text-white flex flex-col items-center text-sm font-semibold">
                        <Upload size={24} className="mb-2" />
                        {loadingHero ? "Saving..." : "Change Photo"}
                    </div>
                    </div>
                )}
                <input type="file" ref={heroInputRef} onChange={handleHeroSelect} className="hidden" accept="image/*" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1 text-white">JB Ai Creations</h1>
            <p className="text-lg md:text-xl font-semibold bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent mb-4">Muhammed Jubair T</p>
            
            {/* Inline edit about section if authed */}
            <div className="relative max-w-md w-full">
               {isEditingAbout && isAuthed ? (
                   <div className="flex flex-col gap-2">
                       <textarea 
                           className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm text-neutral-300 outline-none focus:border-purple-500 min-h-[100px] resize-none"
                           value={aboutText}
                           onChange={(e) => setAboutText(e.target.value)}
                       />
                       <button onClick={handleSaveAboutText} className="self-end bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 hover:bg-purple-500 transition-colors">
                           <Save size={14}/> Save
                       </button>
                   </div>
               ) : (
                   <div className={`group relative p-2 rounded-xl transition-colors ${isAuthed ? 'hover:bg-neutral-900/50 cursor-pointer' : ''}`} onClick={() => isAuthed && setIsEditingAbout(true)}>
                       <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                           {data.aboutText || "AI Content Creator developing innovative digital experiences."}
                       </p>
                       {isAuthed && (
                           <div className="absolute top-0 right-0 p-1 bg-neutral-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                               <Edit2 size={12} className="text-white" />
                           </div>
                       )}
                   </div>
               )}
            </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-10 bg-neutral-900 p-1.5 rounded-full border border-neutral-800 mx-auto max-w-md overflow-x-auto">
            <button 
                onClick={() => setActiveTab('links')}
                className={`flex-1 py-3 px-4 rounded-full font-semibold text-sm transition-all text-center whitespace-nowrap ${activeTab === 'links' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
            >
                Socials
            </button>
            <button 
                onClick={() => setActiveTab('images')}
                className={`flex-1 py-3 px-4 rounded-full font-semibold text-sm transition-all text-center whitespace-nowrap ${activeTab === 'images' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
            >
                Images
            </button>
            <button 
                onClick={() => setActiveTab('videos')}
                className={`flex-1 py-3 px-4 rounded-full font-semibold text-sm transition-all text-center whitespace-nowrap ${activeTab === 'videos' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
            >
                Videos
            </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
            
            {/* Links / Socials */}
            {activeTab === 'links' && (
                <motion.div key="links" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">My Links</h2>
                        {isAuthed && (
                            <button 
                                onClick={() => {
                                  if (isEditingLinks) handleSaveLinks();
                                  else setIsEditingLinks(true);
                                }}
                                className="flex items-center gap-2 text-sm bg-neutral-900 hover:bg-neutral-800 px-4 py-2 rounded-lg border border-neutral-800 transition-colors"
                            >
                                {isEditingLinks ? <><Check size={16}/> Save Profile Links</> : <><Edit2 size={16}/> Edit Links</>}
                            </button>
                        )}
                    </div>

                    {isEditingLinks && isAuthed ? (
                        <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 shadow-xl">
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider font-semibold">YouTube Channel URL</label>
                                <input 
                                    type="url" 
                                    value={ytLink} 
                                    onChange={e => setYtLink(e.target.value)} 
                                    placeholder="https://youtube.com/..."
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:border-red-500 outline-none text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider font-semibold">Instagram URL</label>
                                <input 
                                    type="url" 
                                    value={igLink} 
                                    onChange={e => setIgLink(e.target.value)} 
                                    placeholder="https://instagram.com/..."
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:border-pink-500 outline-none text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider font-semibold">WhatsApp Number (with Country Code)</label>
                                <input 
                                    type="text" 
                                    value={waLink} 
                                    onChange={e => setWaLink(e.target.value)} 
                                    placeholder="+911234567890"
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:border-green-500 outline-none text-white"
                                />
                                <p className="text-neutral-500 text-xs mt-1">Example: +919876543210 (do not add spaces or symbols other than +)</p>
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider font-semibold">LinkedIn URL</label>
                                <input 
                                    type="url" 
                                    value={liLink} 
                                    onChange={e => setLiLink(e.target.value)} 
                                    placeholder="https://linkedin.com/in/..."
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none text-white"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(data.youtubeLink || data.instagramLink || data.whatsappLink || data.linkedInLink) ? (
                                <>
                                    {data.instagramLink && (
                                        <motion.a whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} href={data.instagramLink} target="_blank" rel="noreferrer" className="block w-full py-5 px-6 bg-pink-600/10 hover:bg-pink-600/20 text-pink-100 border border-pink-500/30 rounded-2xl text-center font-semibold text-lg transition-all shadow-sm">
                                            Instagram
                                        </motion.a>
                                    )}
                                    {data.youtubeLink && (
                                        <motion.a whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} href={data.youtubeLink} target="_blank" rel="noreferrer" className="block w-full py-5 px-6 bg-red-600/10 hover:bg-red-600/20 text-red-100 border border-red-500/30 rounded-2xl text-center font-semibold text-lg transition-all shadow-sm">
                                            YouTube
                                        </motion.a>
                                    )}
                                    {data.linkedInLink && (
                                        <motion.a whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} href={data.linkedInLink} target="_blank" rel="noreferrer" className="block w-full py-5 px-6 bg-blue-600/10 hover:bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-2xl text-center font-semibold text-lg transition-all shadow-sm">
                                            LinkedIn
                                        </motion.a>
                                    )}
                                    {data.whatsappLink && (
                                        <motion.a whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} href={`https://wa.me/${data.whatsappLink.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="block w-full py-5 px-6 bg-green-600/10 hover:bg-green-600/20 text-green-100 border border-green-500/30 rounded-2xl text-center font-semibold text-lg transition-all shadow-sm">
                                            WhatsApp Me
                                        </motion.a>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-10 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                                    <p className="text-neutral-500 text-sm">No social links configured yet.</p>
                                    {!isAuthed && <p className="text-neutral-600 text-xs mt-1">Unlock Edit Mode at the top right to add them.</p>}
                                </div>
                            )}
                            
                            {/* Contact Me Email button explicitly removed per user request */}
                        </div>
                    )}
                </motion.div>
            )}

            {/* Images */}
            {activeTab === 'images' && (
                <motion.div key="images" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center">
                    
                    {renderFolders("image")}

                    {isAuthed && (
                        <div className="w-full flex justify-between items-center bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 mb-6 backdrop-blur-sm">
                            <div className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                                <Camera size={16} /> Uploading to: <span className="text-white font-bold bg-neutral-800 px-2 py-1 rounded-md">{data.folders?.find(f => f.id === activeImageFolderId)?.name || 'All Images'}</span>
                            </div>
                            <div>
                                <input type="file" ref={addImageRef} onChange={handleImageUpload} className="hidden" accept="image/*" multiple />
                                <button 
                                    onClick={() => addImageRef.current?.click()}
                                    disabled={loadingImages}
                                    className="flex gap-2 items-center bg-white text-black hover:bg-neutral-200 px-4 py-2 rounded-lg font-bold transition-colors text-sm shadow-lg"
                                >
                                    {loadingImages ? "Uploading..." : <><Plus size={16}/> Upload Image</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {currentFolderImages.length === 0 ? (
                        <div className="w-full py-20 border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-600 text-sm">
                            <Camera size={32} className="mb-3 opacity-50"/>
                            <p>No images in this folder.</p>
                        </div>
                    ) : (
                        <div className="w-full columns-2 md:columns-3 gap-4 space-y-4 pb-6">
                            <AnimatePresence>
                                {currentFolderImages.map((img) => (
                                    <motion.div 
                                        layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={img.id} 
                                        whileHover={{ scale: 1.03, y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.8)" }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className="group inline-block w-full relative rounded-2xl overflow-hidden bg-neutral-900 cursor-pointer border border-neutral-800 shadow-lg"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.url} alt="Generation" className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" onClick={() => setLightboxImage(img.url)} />
                                        
                                        {isAuthed && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-500 backdrop-blur-md z-10"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Videos */}
            {activeTab === 'videos' && (
                <motion.div key="videos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center">
                    
                    {renderFolders("video")}

                    {isAuthed && (
                        <div className="w-full bg-neutral-900/50 p-5 rounded-xl border border-neutral-800 mb-6 backdrop-blur-sm">
                            <label className="text-sm font-semibold mb-3 flex items-center justify-between gap-2">
                               <span className="flex items-center gap-2"><Video size={16} className="text-neutral-400"/> Add YouTube Video / Short</span>
                               <span className="text-xs text-neutral-500 bg-neutral-950 px-2 py-1 rounded-md">To: {data.folders?.find(f => f.id === activeVideoFolderId)?.name || 'All Images'}</span>
                            </label>
                            <form onSubmit={handleAddVideo} className="flex gap-2">
                                <input 
                                    type="url" 
                                    placeholder="Paste link (eg. youtube.com/shorts/...)" 
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm w-full outline-none focus:border-neutral-500 text-white"
                                    required
                                />
                                <button type="submit" className="flex gap-2 items-center bg-white text-black hover:bg-neutral-200 px-5 py-2.5 rounded-lg font-bold transition-colors text-sm shadow-lg whitespace-nowrap">
                                    <Plus size={16}/> Embed
                                </button>
                            </form>
                        </div>
                    )}

                    {currentFolderVideos.length === 0 ? (
                        <div className="w-full py-20 border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-600 text-sm">
                            <Video size={32} className="mb-3 opacity-50"/>
                            <p>No videos in this folder.</p>
                        </div>
                    ) : (
                        <div className="w-full columns-1 sm:columns-2 gap-4 space-y-4 pb-6">
                            <AnimatePresence>
                                {currentFolderVideos.map((vid) => {
                                    const parsed = parseMediaUrl(vid.youtubeUrl);
                                    return (
                                        <motion.div 
                                            layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={vid.id} 
                                            whileHover={{ scale: 1.02, y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.8)" }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className={`group inline-block w-full relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl ${parsed?.ratio || 'aspect-video'}`}
                                        >
                                            {/* Badge */}
                                            {parsed && (
                                                <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-black/80 backdrop-blur-md rounded border border-white/10 flex items-center gap-1.5 text-[10px] uppercase font-bold text-white shadow-xl pointer-events-none tracking-widest">
                                                    <div className={`w-2 h-2 rounded-full animate-pulse ${parsed.color}`} />
                                                    {parsed.badge}
                                                </div>
                                            )}

                                            {parsed ? (
                                                <iframe 
                                                    src={parsed.embedUrl} 
                                                    title={`${parsed.badge} embed`} 
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    allowFullScreen={parsed.type !== 'instagram'}
                                                    className="w-full h-full border-0 absolute inset-0 bg-neutral-950"
                                                ></iframe>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center p-4 text-center text-red-400 text-sm">
                                                    Invalid URL
                                                </div>
                                            )}
                                            
                                            {isAuthed && (
                                                <button 
                                                    onClick={() => deleteVideo(vid.id)}
                                                    className="absolute top-3 right-3 p-2 bg-black/80 text-white rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-red-500 z-10 backdrop-blur-md border border-white/10 hover:border-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            )}

        </AnimatePresence>

        {/* Stats Section */}
        <div className="mt-20 pt-10 border-t border-white/10 w-full mb-10 overflow-hidden relative">
            {isAuthed && (
                <button 
                    onClick={() => isEditingStats ? handleSaveStats() : setIsEditingStats(true)}
                    className="absolute top-2 right-2 z-20 flex items-center gap-2 text-sm bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-800 transition-colors"
                >
                    {isEditingStats ? <><Check size={14}/> Save</> : <><Edit2 size={14}/> Edit</>}
                </button>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ type: "spring", stiffness: 300 }} className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-3xl text-center shadow-lg transition-colors cursor-default">
                    {isEditingStats ? (
                        <input className="w-full text-center bg-neutral-950 border border-neutral-700 rounded p-1 text-2xl font-bold text-white mb-2" value={statsData.views} onChange={e => setStatsData({...statsData, views: e.target.value})} />
                    ) : (
                        <h4 className="text-4xl font-extrabold text-white mb-2">{statsData.views}</h4>
                    )}
                    <p className="text-neutral-400 text-sm uppercase tracking-wider font-semibold">Total Views</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ type: "spring", stiffness: 300 }} className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-3xl text-center shadow-lg transition-colors cursor-default">
                    {isEditingStats ? (
                        <input className="w-full text-center bg-neutral-950 border border-neutral-700 rounded p-1 text-2xl font-bold text-white mb-2" value={statsData.works} onChange={e => setStatsData({...statsData, works: e.target.value})} />
                    ) : (
                        <h4 className="text-4xl font-extrabold text-white mb-2">{statsData.works}</h4>
                    )}
                    <p className="text-neutral-400 text-sm uppercase tracking-wider font-semibold">Total Works</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ type: "spring", stiffness: 300 }} className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-3xl text-center shadow-lg transition-colors cursor-default">
                    {isEditingStats ? (
                        <input className="w-full text-center bg-neutral-950 border border-neutral-700 rounded p-1 text-2xl font-bold text-white mb-2" value={statsData.subs} onChange={e => setStatsData({...statsData, subs: e.target.value})} />
                    ) : (
                        <h4 className="text-4xl font-extrabold text-white mb-2">{statsData.subs}</h4>
                    )}
                    <p className="text-neutral-400 text-sm uppercase tracking-wider font-semibold">Subscribers</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ type: "spring", stiffness: 300 }} className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-3xl text-center shadow-lg transition-colors cursor-default">
                    {isEditingStats ? (
                        <input className="w-full text-center bg-neutral-950 border border-neutral-700 rounded p-1 text-2xl font-bold text-white mb-2" value={statsData.clients} onChange={e => setStatsData({...statsData, clients: e.target.value})} />
                    ) : (
                        <h4 className="text-4xl font-extrabold text-white mb-2">{statsData.clients}</h4>
                    )}
                    <p className="text-neutral-400 text-sm uppercase tracking-wider font-semibold">Happy Clients</p>
                </motion.div>
            </div>
        </div>

        {/* Why AI Video Section */}
        <div className="mt-10 mb-20 w-full relative">
            <h3 className="text-2xl font-bold mb-8 flex justify-center text-center"><span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Power of AI Content</span></h3>
            {isAuthed && (
                <button 
                    onClick={() => isEditingAiBoxes ? handleSaveAiBoxes() : setIsEditingAiBoxes(true)}
                    className="absolute top-0 right-2 z-20 flex items-center gap-2 text-sm bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-800 transition-colors"
                >
                    {isEditingAiBoxes ? <><Check size={14}/> Save</> : <><Edit2 size={14}/> Edit</>}
                </button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
                {aiBoxesData.map((box: any, i: number) => (
                    <motion.div whileHover={{ scale: 1.03, y: -5 }} transition={{ type: "spring", stiffness: 300 }} key={i} className="bg-neutral-900/40 border border-neutral-800/50 p-8 rounded-3xl shadow-lg cursor-default">
                        {isEditingAiBoxes ? (
                            <>
                                <input 
                                    className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-lg font-bold text-white mb-3" 
                                    value={box.title} 
                                    onChange={(e) => { const nd = [...aiBoxesData]; nd[i].title = e.target.value; setAiBoxesData(nd); }} 
                                />
                                <textarea 
                                    className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm text-neutral-300 min-h-[120px] resize-none" 
                                    value={box.desc} 
                                    onChange={(e) => { const nd = [...aiBoxesData]; nd[i].desc = e.target.value; setAiBoxesData(nd); }} 
                                />
                            </>
                        ) : (
                            <>
                                <h4 className="text-lg font-bold text-white mb-3">{box.title}</h4>
                                <p className="text-neutral-400 text-sm leading-relaxed whitespace-pre-line">{box.desc}</p>
                            </>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-neutral-950 mt-10 p-8 relative z-10 bottom-0 left-0 right-0">
          <div className="max-w-4xl mx-auto relative">
             {isAuthed && (
                 <button 
                     onClick={() => isEditingFooter ? handleSaveFooter() : setIsEditingFooter(true)}
                     className="absolute -top-4 right-0 z-20 flex items-center gap-2 text-sm bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-800 transition-colors"
                 >
                     {isEditingFooter ? <><Check size={14}/> Save Footer</> : <><Edit2 size={14}/> Edit Footer</>}
                 </button>
             )}
             
             {isEditingFooter ? (
                <div className="flex flex-col md:flex-row justify-between gap-10 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 pt-10">
                    <div className="flex-1 space-y-3">
                        <input className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-xl font-bold text-white outline-none focus:border-purple-500" value={footerData.title} onChange={e => setFooterData({...footerData, title: e.target.value})} placeholder="Title (e.g., Muhammed Jubair T)" />
                        <textarea className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm text-neutral-300 outline-none focus:border-purple-500 h-20 resize-none" value={footerData.desc} onChange={e => setFooterData({...footerData, desc: e.target.value})} placeholder="Description" />
                        <input className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 font-semibold text-white outline-none focus:border-purple-500" value={footerData.subtitle} onChange={e => setFooterData({...footerData, subtitle: e.target.value})} placeholder="Subtitle (e.g., JB Ai Creations)" />
                    </div>
                    <div className="space-y-4 md:w-72 mt-4 md:mt-0">
                        <div>
                            <span className="font-semibold text-neutral-500 uppercase tracking-widest text-[10px] block mb-1">Address</span> 
                            <input className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm text-right text-white outline-none focus:border-purple-500" value={footerData.address} onChange={e => setFooterData({...footerData, address: e.target.value})} placeholder="Address" />
                        </div>
                        <div>
                            <span className="font-semibold text-neutral-500 uppercase tracking-widest text-[10px] block mb-1">Location</span> 
                            <input className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-sm text-right text-white outline-none focus:border-purple-500" value={footerData.location} onChange={e => setFooterData({...footerData, location: e.target.value})} placeholder="Location" />
                        </div>
                        <div className="text-xs text-neutral-500 text-right mt-2 italic">Phone number is updated via the "Socials" tab (WhatsApp Number).</div>
                    </div>
                </div>
             ) : (
                <div className="flex flex-col md:flex-row justify-between gap-10 md:items-start text-center md:text-left pt-6">
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent mb-2">{footerData.title}</h3>
                        <p className="text-neutral-400 text-sm leading-relaxed mb-4">{footerData.desc}</p>
                        <p className="font-semibold text-white">{footerData.subtitle}</p>
                    </div>
                    <div className="space-y-4 text-sm text-neutral-300 md:w-72 mt-4 md:mt-0">
                        <div className="flex justify-between items-center gap-4 border-b border-neutral-800 pb-3">
                           <span className="font-semibold text-neutral-500 uppercase tracking-widest text-[10px]">Address</span> 
                           <span className="text-right">{footerData.address}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4 border-b border-neutral-800 pb-3">
                           <span className="font-semibold text-neutral-500 uppercase tracking-widest text-[10px]">Phone</span> 
                           <span className="text-right">{data.whatsappLink ? `+91 ${data.whatsappLink.replace('+91', '')}` : 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4 pb-3">
                           <span className="font-semibold text-neutral-500 uppercase tracking-widest text-[10px]">Location</span> 
                           <span className="text-right">{footerData.location}</span>
                        </div>
                    </div>
                </div>
             )}
          </div>
          <div className="max-w-4xl mx-auto mt-12 pt-6 border-t border-white/5 text-center text-xs text-neutral-600 flex flex-col md:flex-row justify-between items-center gap-2">
              <span>© {new Date().getFullYear()} {footerData.subtitle}.</span>
              <span>All rights reserved. Designed with precision.</span>
          </div>
      </footer>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl"
            onClick={() => setLightboxImage(null)}
          >
            <button className="absolute top-6 right-6 p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-full text-white transition-colors">
              <X size={24} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              src={lightboxImage} alt="Enlarged" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
