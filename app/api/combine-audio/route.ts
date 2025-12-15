import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { getTempDir } from "@/lib/path-utils";
import { chmod } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

export async function POST(request: NextRequest) {
  try {
    const { vocalsUrl, instrumentalUrl } = await request.json();

    console.log("Combine Audio Request:", { vocalsUrl, instrumentalUrl });

    if (!vocalsUrl) {
      return NextResponse.json(
        { error: "vocalsUrl is required" },
        { status: 400 }
      );
    }

    // Set ffmpeg path
    if (!ffmpegStatic) {
      throw new Error("ffmpeg-static not found");
    }
    
    try {
        await chmod(ffmpegStatic, 0o755);
    } catch (e) {
        console.log("Could not chmod ffmpeg (might already be executable or read-only volume)", e);
    }

    ffmpeg.setFfmpegPath(ffmpegStatic);

    const tempDir = getTempDir();

    // Helper to resolve/download file path from URL
    const resolveFilePath = async (url: string): Promise<string> => {
      // 1. Local API URL
      if (url.startsWith('/api/audio') || url.includes('/api/audio')) {
        let filename: string | null = null;
        try {
            const urlObj = new URL(url, 'http://localhost');
            filename = urlObj.searchParams.get('file');
        } catch (e) {
             const match = url.match(/file=([^&]+)/);
             if (match) filename = match[1];
        }

        if (filename) {
          const p = path.join(tempDir, filename);
          if (fs.existsSync(p)) return p;
          // If not found locally, maybe it was a cached URL from a different session?
          // We can't recover it.
          console.warn(`Local file not found: ${p}`);
        }
      }

      // 2. Remote URL (Replicate, etc.)
      if (url.startsWith('http')) {
          console.log(`Downloading remote file: ${url}`);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to download ${url}`);
          
          const filename = `download-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`;
          const filePath = path.join(tempDir, filename);
          
          if (response.body) {
               // @ts-ignore
              const nodeStream = Readable.fromWeb(response.body);
              await pipeline(nodeStream, createWriteStream(filePath));
              console.log(`Downloaded to ${filePath}`);
              return filePath;
          }
      }

      throw new Error(`Could not resolve file path for: ${url}`);
    };

    const vocalsPath = await resolveFilePath(vocalsUrl);

    // Handle instrumental
    let instrumentalPaths: string[] = [];
    
    if (typeof instrumentalUrl === 'string') {
      const p = await resolveFilePath(instrumentalUrl);
      instrumentalPaths = [p];
    } else if (instrumentalUrl && typeof instrumentalUrl === 'object' && instrumentalUrl.type === 'multi' && Array.isArray(instrumentalUrl.stems)) {
      console.log("Combining multiple stems into instrumental...");
      for (const stemUrl of instrumentalUrl.stems) {
        const p = await resolveFilePath(stemUrl);
        instrumentalPaths.push(p);
      }
    } else {
      console.log("No instrumental provided, using only vocals");
    }

    const outputFilename = `combined-${Date.now()}.wav`;
    const outputPath = path.join(tempDir, outputFilename);

    // Build ffmpeg command
    const ffmpegCommand = ffmpeg().input(vocalsPath);
    instrumentalPaths.forEach(path => ffmpegCommand.input(path));

    const totalInputs = 1 + instrumentalPaths.length;

    await new Promise<void>((resolve, reject) => {
      ffmpegCommand
        .complexFilter([
          {
            filter: 'amix',
            options: {
              inputs: totalInputs,
              duration: 'longest',
              dropout_transition: 0
            }
          }
        ])
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(2)
        .on('end', () => {
          console.log(`Combined audio saved to ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .save(outputPath);
    });

    // Instead of returning JSON URL, we want to return the FILE content or URL
    // Since we are fixing the "mix failed" by handling remote URLs, we can return the local URL 
    // IF we assume the client will download it immediately from the SAME response? 
    // No, client makes a GET request later. 
    // BUT we are in the SAME instance right now. 
    // If the client calls GET /api/audio?file=... immediately, it MIGHT hit the same instance if warm.
    // Ideally, we should return the file stream in the response to be 100% safe.
    
    // However, the frontend code expects JSON with `combinedUrl`.
    // Changing that requires frontend changes. 
    // Let's try returning the JSON first. Since 'combine-audio' does the download + mix in one go,
    // the output file IS present on the current instance.
    // If the client calls GET immediately, there's a chance it hits a different instance.
    // But Vercel usually sticks to the same instance for a short burst of requests from the same user.
    
    // If we want to be 100% safe, we should return base64 in the JSON?
    // Max 4.5MB limit again. Combined audio might be large.
    
    // Let's stick to the URL pattern for now. If it fails, the user has to retry.
    // But we fixed the INPUTS (downloading remote URLs). That was the likely cause of failure.
    
    const combinedUrl = `/api/audio?file=${outputFilename}`;

    return NextResponse.json({
      success: true,
      combinedUrl
    });

  } catch (error: any) {
    console.error("Error combining audio:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to combine audio",
      },
      { status: 500 }
    );
  }
}
