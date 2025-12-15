import { NextRequest, NextResponse } from "next/server";
import replicate from "@/lib/replicate";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { getCache, setCache } from "@/lib/cache";
import crypto from "crypto";
import { getTempDir } from "@/lib/path-utils";

export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json();

    if (!audioUrl) {
      return NextResponse.json({ error: "Audio URL is required" }, { status: 400 });
    }

    // Determine Cache Key
    let cacheKey = "";
    let localFilename = "";

    if (audioUrl.startsWith('/api/audio')) {
        const urlObj = new URL(audioUrl, 'http://localhost');
        const f = urlObj.searchParams.get('file');
        if (f) {
            localFilename = f;
            cacheKey = `convert:${f}`;
        }
    } else {
        const hash = crypto.createHash('md5').update(audioUrl).digest('hex');
        cacheKey = `convert:${hash}`;
    }

    // Check Cache
    if (cacheKey) {
        const cachedResult = await getCache(cacheKey);
        if (cachedResult) {
            console.log(`Cache hit for convert-to-villager: ${cacheKey}`);
            return NextResponse.json({
                success: true,
                ...cachedResult,
                cached: true
            });
        }
    }

    console.log(`Converting to villager voice. Input: ${audioUrl}`);

    let inputAudio = audioUrl;

    if (localFilename) {
        const tempDir = getTempDir();
        const filePath = path.join(tempDir, localFilename);
        try {
            const buffer = await fs.readFile(filePath);
                const base64 = buffer.toString('base64');
            const ext = path.extname(localFilename).toLowerCase();
                const mime = ext === '.mp3' ? 'audio/mpeg' : 'audio/wav'; 
                inputAudio = `data:${mime};base64,${base64}`;
                console.log("Converted local audio to Data URI for Replicate");
        } catch (err) {
            console.error("Error reading local file:", err);
            return NextResponse.json({ error: "Local audio file not found" }, { status: 404 });
        }
    } else {
        console.log("Using remote URL directly for Replicate input");
    }

    // Run RVC-v2
    const output = await replicate.run(
      "psuedoram/rvc-v2:d18e2e0a6a6d3af183cc09622cebba8555ec9a9e66983261fc64c8b1572b7dce",
      {
        input: {
          input_audio: inputAudio,
          rvc_model: "CUSTOM",
          custom_rvc_model_download_url: "https://huggingface.co/Fonre/RVC-Models/resolve/main/Villager%20(Minecraft)%20-%20Weights%20Model.zip?download=true",
          pitch_change: 0, 
          index_rate: 0.5, 
          filter_radius: 3,
          rms_mix_rate: 0.25,
          protect: 0.33
        }
      }
    ) as ReadableStream | string;

    console.log("Replicate RVC output received.");

    let villagerUrl = "";

    if (typeof output === 'string') {
        // It's a URL (typical Replicate behavior)
        // Return it directly!
        villagerUrl = output;
        console.log("Returning Replicate URL directly:", villagerUrl);
    } else {
        // It's a stream? Save to disk (fallback)
        const tempDir = getTempDir();
        // Ensure temp dir exists
        try { await fs.access(tempDir); } catch { await fs.mkdir(tempDir, { recursive: true }); }

        const timestamp = Date.now();
        const villagerFilename = `villager-${timestamp}.wav`;
        const villagerPath = path.join(tempDir, villagerFilename);
        
        // @ts-ignore
        const nodeStream = Readable.fromWeb(output);
        await pipeline(nodeStream, createWriteStream(villagerPath));
        console.log(`Villager audio saved to ${villagerPath}`);
        villagerUrl = `/api/audio?file=${villagerFilename}`;
    }

    const result = { villagerUrl };

    // Save to Cache
    if (cacheKey) {
        await setCache(cacheKey, result, []);
    }

    return NextResponse.json({ 
      success: true, 
      ...result
    });

  } catch (error: any) {
    console.error("Error converting to villager:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to convert to villager",
      },
      { status: 500 }
    );
  }
}
