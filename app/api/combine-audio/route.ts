import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

export async function POST(request: NextRequest) {
  try {
    const { vocalsUrl, instrumentalUrl } = await request.json();

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
    ffmpeg.setFfmpegPath(ffmpegStatic);

    const tempDir = path.join(process.cwd(), "public", "temp");

    // Helper to resolve local file path from URL
    const resolveFilePath = (url: string): string => {
      if (url.startsWith('/api/audio')) {
        const urlObj = new URL(url, 'http://localhost');
        const filename = urlObj.searchParams.get('file');
        if (filename) {
          return path.join(tempDir, filename);
        }
      }
      throw new Error(`Invalid audio URL: ${url}`);
    };

    const vocalsPath = resolveFilePath(vocalsUrl);
    if (!fs.existsSync(vocalsPath)) {
      throw new Error(`Vocals file not found: ${vocalsPath}`);
    }

    // Handle instrumental: could be a single URL or an array of stem URLs
    let instrumentalPaths: string[] = [];
    
    if (typeof instrumentalUrl === 'string') {
      // Single instrumental file
      const instrumentalPath = resolveFilePath(instrumentalUrl);
      if (!fs.existsSync(instrumentalPath)) {
        throw new Error(`Instrumental file not found: ${instrumentalPath}`);
      }
      instrumentalPaths = [instrumentalPath];
    } else if (instrumentalUrl && typeof instrumentalUrl === 'object' && instrumentalUrl.type === 'multi' && Array.isArray(instrumentalUrl.stems)) {
      // Multiple stems to combine (drums + bass + other)
      console.log("Combining multiple stems into instrumental...");
      for (const stemUrl of instrumentalUrl.stems) {
        const stemPath = resolveFilePath(stemUrl);
        if (!fs.existsSync(stemPath)) {
          throw new Error(`Stem file not found: ${stemPath}`);
        }
        instrumentalPaths.push(stemPath);
      }
    } else {
      throw new Error("Invalid instrumentalUrl format");
    }

    console.log(`Combining vocals with ${instrumentalPaths.length} instrumental file(s)...`);

    const outputFilename = `combined-${Date.now()}.wav`;
    const outputPath = path.join(tempDir, outputFilename);

    // Build ffmpeg command with all inputs
    const ffmpegCommand = ffmpeg().input(vocalsPath);
    instrumentalPaths.forEach(path => ffmpegCommand.input(path));

    const totalInputs = 1 + instrumentalPaths.length; // vocals + instrumental stems

    // Use ffmpeg to mix all audio files
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

