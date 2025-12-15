import { NextRequest, NextResponse } from "next/server";
import replicate from "@/lib/replicate";
import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { getCache, setCache } from "@/lib/cache";

// Define strict types for Replicate output
interface DemucsOutput {
  vocals?: ReadableStream | string | null;
  drums?: ReadableStream | string | null;
  bass?: ReadableStream | string | null;
  other?: ReadableStream | string | null;
  instrumental?: ReadableStream | string | null;
}

function extractFilenameFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url, 'http://localhost');
        return urlObj.searchParams.get('file');
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    // Check Cache
    const cacheKey = `separate:${filename}`;
    const cachedResult = await getCache(cacheKey);
    
    if (cachedResult) {
        console.log(`Cache hit for separate-vocals: ${filename}`);
        return NextResponse.json({
            success: true,
            ...cachedResult,
            cached: true
        });
    }

    const tempDir = path.join(process.cwd(), "public", "temp");
    const filePath = path.join(tempDir, path.basename(filename));
    
    try {
        await fs.access(filePath);
    } catch {
        return NextResponse.json({ error: "File not found on server" }, { status: 404 });
    }

    console.log(`Sending ${filename} to Replicate for vocal separation...`);

    const fileBuffer = await fs.readFile(filePath);
    const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
    const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

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

    const timestamp = Date.now();
    const baseFilename = path.basename(filename, path.extname(filename));
    const createdFiles: string[] = [];

    // Helper function to save stem
    const saveStem = async (stem: ReadableStream | string, stemName: string): Promise<string> => {
      const stemFilename = `${stemName}-${timestamp}-${baseFilename}.wav`;
      const stemPath = path.join(tempDir, stemFilename);

      if (typeof stem === 'string') {
        console.log(`${stemName} returned as URL, downloading...`);
        const response = await fetch(stem);
        if (!response.ok) throw new Error(`Failed to fetch ${stemName} from Replicate URL`);
        if (response.body) {
            // @ts-ignore
            const nodeStream = Readable.fromWeb(response.body); 
            await pipeline(nodeStream, createWriteStream(stemPath));
        } else {
             throw new Error(`No body in response for ${stemName}`);
        }
      } else {
        console.log(`${stemName} returned as Stream, saving to file...`);
        // @ts-ignore
        const nodeStream = Readable.fromWeb(stem);
        await pipeline(nodeStream, createWriteStream(stemPath));
      }

      console.log(`${stemName} saved to ${stemPath}`);
      createdFiles.push(stemFilename);
      return `/api/audio?file=${stemFilename}`;
    };

    // Save vocals
    const vocalsUrl = await saveStem(output.vocals!, 'vocals');

    // Handle instrumental
    let instrumentalUrl: string | { type: string; stems: string[] };
    
    if (output.instrumental) {
      instrumentalUrl = await saveStem(output.instrumental, 'instrumental');
    } else if (output.drums && output.bass && output.other) {
      console.log("Saving individual stems to combine into instrumental...");
      const [drumsUrl, bassUrl, otherUrl] = await Promise.all([
          saveStem(output.drums!, 'drums'),
          saveStem(output.bass!, 'bass'),
          saveStem(output.other!, 'other')
      ]);
      
      instrumentalUrl = { type: 'multi', stems: [drumsUrl, bassUrl, otherUrl] };
    } else {
      if (output.other) {
        console.log("Using 'other' stem as instrumental (fallback)");
        instrumentalUrl = await saveStem(output.other, 'instrumental');
      } else {
        throw new Error("Replicate did not return instrumental or required stems");
      }
    }

    const result = { vocalsUrl, instrumentalUrl };
    
    // Save to cache
    await setCache(cacheKey, result, createdFiles);

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
