import { NextRequest, NextResponse } from "next/server";
import replicate from "@/lib/replicate";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { getCache, setCache } from "@/lib/cache";
import { getTempDir } from "@/lib/path-utils";

// Define strict types for Replicate output
interface DemucsOutput {
  vocals?: ReadableStream | string | null;
  drums?: ReadableStream | string | null;
  bass?: ReadableStream | string | null;
  other?: ReadableStream | string | null;
  instrumental?: ReadableStream | string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { filename, fileData } = await request.json();

    if (!filename && !fileData) {
      return NextResponse.json({ error: "Filename or fileData is required" }, { status: 400 });
    }

    // Determine input for Replicate
    let dataUri = "";
    let cacheKey = "";

    if (fileData) {
        // Direct Base64 input
        dataUri = fileData; // Client ensures this is a valid Data URI
        // Use hash of data for cache key? Too expensive/large. Use partial hash?
        // Let's skip cache for direct Base64 uploads to save complexity/memory
        cacheKey = ""; 
    } else {
        // Local file fallback
        const tempDir = getTempDir();
        const filePath = path.join(tempDir, path.basename(filename));
        
        try {
            await fs.access(filePath);
        } catch {
          return NextResponse.json({ error: "File not found on server" }, { status: 404 });
        }
        
        const fileBuffer = await fs.readFile(filePath);
        const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
        dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        cacheKey = `separate:${filename}`;
    }

    // Check Cache if key exists
    if (cacheKey) {
        const cachedResult = await getCache(cacheKey);
        if (cachedResult) {
            console.log(`Cache hit for separate-vocals: ${filename}`);
            return NextResponse.json({
                success: true,
                ...cachedResult,
                cached: true
            });
        }
    }

    console.log(`Sending to Replicate for vocal separation...`);

    // Run Demucs
    const output = await replicate.run(
      "ryan5453/demucs:5a7041cc9b82e5a558fea6b3d7b12dea89625e89da33f0447bd727c2d0ab9e77",
      {
        input: {
          audio: dataUri
        }
      }
    ) as DemucsOutput;

    console.log("Replicate output received");

    if (!output || !output.vocals) {
        throw new Error("Replicate failed to return vocals");
    }

    // If using fileData (remote mode), return URLs directly!
    // If using filename (local mode), preserve old behavior (download to disk)
    // Actually, let's prefer returning URLs if they are strings (Replicate URLs)
    // because that enables the "Replicate as Storage" pattern.
    
    // Check if outputs are URLs
    const isUrl = (s: any) => typeof s === 'string' && s.startsWith('http');
    
    // We will return the URLs directly if possible
    let vocalsUrl = output.vocals as string;
    let instrumentalUrl: string | { type: string; stems: string[] };

    // Helper to process output
    const processStem = async (stem: ReadableStream | string | null, name: string) => {
        if (!stem) return null;
        if (typeof stem === 'string') return stem; // It's a URL
        
        // It's a stream (rare for Replicate API unless configured oddly), implies we MUST save it.
        // Or we convert stream to something else? 
        // Replicate Node SDK usually returns URLs for files.
        // Let's assume URL.
        console.warn(`Warning: ${name} returned as stream, cannot pass as URL. Saving to disk (might fail on Vercel between requests).`);
        // Fallback to saving to disk
        const tempDir = getTempDir();
        const timestamp = Date.now();
        const stemFilename = `${name}-${timestamp}.wav`;
        const stemPath = path.join(tempDir, stemFilename);
        // @ts-ignore
        const nodeStream = Readable.fromWeb(stem);
        await pipeline(nodeStream, createWriteStream(stemPath));
        return `/api/audio?file=${stemFilename}`;
    };

    vocalsUrl = (await processStem(output.vocals, 'vocals')) || "";

    if (output.instrumental) {
        instrumentalUrl = (await processStem(output.instrumental, 'instrumental')) || "";
    } else if (output.drums && output.bass && output.other) {
        const [drums, bass, other] = await Promise.all([
            processStem(output.drums, 'drums'),
            processStem(output.bass, 'bass'),
            processStem(output.other, 'other')
        ]);
        instrumentalUrl = { 
            type: 'multi', 
            stems: [drums!, bass!, other!].filter(Boolean) as string[]
        };
    } else if (output.other) {
        instrumentalUrl = (await processStem(output.other, 'instrumental')) || "";
    } else {
        // Fallback or error?
        instrumentalUrl = ""; 
    }

    const result = { vocalsUrl, instrumentalUrl };
    
    // Save to cache if we have a key
    if (cacheKey) {
        // We aren't saving files locally in the "URL mode", so 'createdFiles' list is empty.
        await setCache(cacheKey, result, []);
    }

    return NextResponse.json({ 
      success: true, 
      ...result
    });

  } catch (error: any) {
    console.error("Error separating vocals:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to separate vocals",
      },
      { status: 500 }
    );
  }
}
