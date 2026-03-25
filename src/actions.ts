"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { prisma } from "./lib/prisma";

export async function uploadImage(formData: FormData) {
  const file = formData.get("file") as File;
  const folderId = formData.get("folderId") as string | null;
  if (!file) return { error: "No file provided" };

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const id = crypto.randomUUID();
  const ext = path.extname(file.name);
  const filename = `${id}${ext}`;
  
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  const newImage = await prisma.image.create({
    data: {
      url: `/uploads/${filename}`,
      date: Date.now(),
      folderId: folderId && folderId !== "default" ? folderId : null
    }
  });

  revalidatePath("/");
  return { success: true, image: newImage };
}

export async function deleteImage(imageId: string) {
  const img = await prisma.image.findUnique({ where: { id: imageId } });
  if (!img) return { error: "Image not found" };

  const filePath = path.join(process.cwd(), "public", img.url.replace(/^\//, ""));
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) { console.error("Error deleting old file", e); }
  }

  await prisma.image.delete({ where: { id: imageId } });

  revalidatePath("/");
  return { success: true };
}

export async function addVideo(youtubeUrl: string, folderId?: string) {
  if (!youtubeUrl) return { error: "No URL provided" };
  
  const newVideo = await prisma.video.create({
    data: {
      youtubeUrl,
      date: Date.now(),
      folderId: folderId && folderId !== "default" ? folderId : null
    }
  });
  
  revalidatePath("/");
  return { success: true, video: newVideo };
}

export async function deleteVideo(videoId: string) {
  await prisma.video.delete({ where: { id: videoId } });
  revalidatePath("/");
  return { success: true };
}

export async function updateHeroImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const id = crypto.randomUUID();
  const ext = path.extname(file.name);
  const filename = `hero_${id}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  const userData = await prisma.userData.findFirst();
  if (userData?.heroImage) {
    const oldPath = path.join(process.cwd(), "public", userData.heroImage.replace(/^\//, ""));
    if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) {}
    }
  }

  if (userData) {
    await prisma.userData.update({
      where: { id: userData.id },
      data: { heroImage: `/uploads/${filename}` }
    });
  }

  revalidatePath("/");
  return { success: true };
}

export async function addFolder(name: string) {
  if (!name.trim()) return { error: "Name is required" };
  const newFolder = await prisma.folder.create({
    data: { name: name.trim() }
  });
  revalidatePath("/");
  return { success: true, folder: newFolder };
}

export async function deleteFolder(folderId: string) {
  if (folderId === "default") return { error: "Cannot delete default folder" };
  
  // Move contents to null folder (which corresponds to default)
  await prisma.image.updateMany({
    where: { folderId },
    data: { folderId: null }
  });
  await prisma.video.updateMany({
    where: { folderId },
    data: { folderId: null }
  });

  await prisma.folder.delete({ where: { id: folderId } });
  
  revalidatePath("/");
  return { success: true };
}

export async function updateSocialLinks(ydLink: string, igLink: string, waLink: string, liLink: string) {
  const userData = await prisma.userData.findFirst();
  if (userData) {
    await prisma.userData.update({
      where: { id: userData.id },
      data: {
        youtubeLink: ydLink,
        instagramLink: igLink,
        whatsappLink: waLink,
        linkedInLink: liLink
      }
    });
  }
  revalidatePath("/");
  return { success: true };
}

export async function setAdminPassword(password: string) {
  // Overwrite existing or create new
  const existing = await prisma.adminAuth.findFirst();
  if (existing) {
    await prisma.adminAuth.update({
      where: { id: existing.id },
      data: { password } // In a real app we'd hash it, but storing plain text as requested by user's previous simple json scheme
    });
  } else {
    await prisma.adminAuth.create({
      data: { username: "admin", password }
    });
  }
  revalidatePath("/");
  return { success: true };
}

export async function updateAboutText(text: string) {
  const userData = await prisma.userData.findFirst();
  if (userData) {
    await prisma.userData.update({
      where: { id: userData.id },
      data: { aboutText: text }
    });
  }
  revalidatePath("/");
  return { success: true };
}

export async function updateStats(statsJson: string) {
  let user = await prisma.userData.findFirst();
  if (user) await prisma.userData.update({ where: { id: user.id }, data: { statsJson } });
  revalidatePath('/');
  return { success: true };
}

export async function updateAiBoxes(aiBoxesJson: string) {
  let user = await prisma.userData.findFirst();
  if (user) await prisma.userData.update({ where: { id: user.id }, data: { aiBoxesJson } });
  revalidatePath('/');
  return { success: true };
}
