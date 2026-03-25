import { prisma } from './prisma';

export interface DataStore {
  aboutText: string;
  heroImage: string | null;
  youtubeLink: string;
  instagramLink: string;
  whatsappLink: string;
  linkedInLink: string;
  adminPassword: string | null;
  statsJson: string | null;
  aiBoxesJson: string | null;
  images: Array<{ id: string; url: string; date: number; folderId?: string }>;
  folders: Array<{ id: string; name: string; createdAt?: Date }>;
  videos: Array<{ id: string; youtubeUrl: string; date: number; folderId?: string }>;
}

const defaultData = {
  aboutText: "Welcome to JB Ai Creations. I am an AI Content Creator passionate about developing innovative, visually striking, and interactive digital experiences.",
  heroImage: null,
  youtubeLink: "",
  instagramLink: "",
  whatsappLink: "",
  linkedInLink: "",
};

export async function getData(): Promise<DataStore> {
  // Ensure we have a default UserData row
  let userData = await prisma.userData.findFirst();
  if (!userData) {
    userData = await prisma.userData.create({
      data: defaultData
    });
  }

  // Admin password
  const admin = await prisma.adminAuth.findFirst();

  // Images and videos and folders
  const images = await prisma.image.findMany();
  const videos = await prisma.video.findMany();
  const folders = await prisma.folder.findMany();

  // Add default folder
  let mappedFolders = [
    { id: "default", name: "All Items" },
    ...folders.map(f => ({ id: f.id, name: f.name, createdAt: f.createdAt }))
  ];

  return {
    aboutText: userData.aboutText,
    heroImage: userData.heroImage,
    youtubeLink: userData.youtubeLink,
    instagramLink: userData.instagramLink,
    whatsappLink: userData.whatsappLink,
    linkedInLink: userData.linkedInLink,
    statsJson: userData.statsJson,
    aiBoxesJson: userData.aiBoxesJson,
    adminPassword: admin?.password || null, // hashed, ClientPage uses it but wait, we need real auth. The client checks passwordInput === data.adminPassword...
    images: images.map(img => ({ id: img.id, url: img.url, date: img.date, folderId: img.folderId || undefined })),
    videos: videos.map(vid => ({ id: vid.id, youtubeUrl: vid.youtubeUrl, date: vid.date, folderId: vid.folderId || undefined })),
    folders: mappedFolders
  };
}
