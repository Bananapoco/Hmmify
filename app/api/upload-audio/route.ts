import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { cleanupTempFiles } from "@/lib/cleanup";
import { getCache, setCache } from "@/lib/cache";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm'];

export async function POST(request: NextRequest) {
  try {
    // Trigger cleanup in background
    cleanupTempFiles().catch(err => console.error("Background cleanup failed:", err));

    const formData = await request.formData();
    const file = formData.get("audio") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Server-side validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size too large (max 10MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.some(type => file.type.includes(type) || file.type.startsWith('audio/'))) {
       return NextResponse.json(
        { error: "Invalid file type. Please upload an audio file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Calculate hash for deduplication/caching
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const cacheKey = `upload:${hash}`;
    
    // Check cache
    const cachedFilename = await getCache(cacheKey);
    if (cachedFilename) {
        console.log(`Cache hit for upload: ${cachedFilename}`);
        return NextResponse.json({ 
            success: true, 
            audioUrl: `/api/audio?file=${cachedFilename}`,
            filename: cachedFilename,
            cached: true
        });
    }

    console.log(`Receiving upload: ${file.name} (${file.size} bytes)`);

    const tempDir = path.join(process.cwd(), "public", "temp");
    
    // Ensure directory exists
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    // Use hash in filename to ensure uniqueness and content-addressability
    const filename = `upload-${hash}-${safeName}`;
    const filePath = path.join(tempDir, filename);

    await fs.writeFile(filePath, buffer);
    console.log(`Saved file to ${filePath}`);

    // Update cache
    await setCache(cacheKey, filename, [filename]);

    return NextResponse.json({ 
      success: true, 
      audioUrl: `/api/audio?file=${filename}`,
      filename: filename
    });

  } catch (error: any) {
    console.error("Error processing upload:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process upload",
      },
      { status: 500 }
    );
  }
}
