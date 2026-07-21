import { NextRequest, NextResponse } from "next/server";
import replicate from "@/lib/replicate";
import fs from "fs/promises";
import path from "path";
import { getCache, setCache } from "@/lib/cache";
import crypto from "crypto";
import { getTempDir } from "@/lib/path-utils";

const RVC_VERSION = "d18e2e0a6a6d3af183cc09622cebba8555ec9a9e66983261fc64c8b1572b7dce";

const rvcInput = (inputAudio: string) => ({
  input_audio: inputAudio,
  rvc_model: "CUSTOM",
  custom_rvc_model_download_url: "https://huggingface.co/Fonre/RVC-Models/resolve/main/Villager%20(Minecraft)%20-%20Weights%20Model.zip?download=true",
  pitch_change: 0,
  index_rate: 0.5,
  filter_radius: 3,
  rms_mix_rate: 0.25,
  protect: 0.33,
});

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

    // Create an asynchronous prediction instead of holding a Vercel request open.
    // Public models can queue for several minutes even when the actual RVC work is fast.
    const prediction = await replicate.predictions.create({
      version: RVC_VERSION,
      input: rvcInput(inputAudio),
    });

    return NextResponse.json({
      success: true,
      predictionId: prediction.id,
      status: prediction.status,
      cacheKey,
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

export async function GET(request: NextRequest) {
  const predictionId = request.nextUrl.searchParams.get("predictionId");
  const cacheKey = request.nextUrl.searchParams.get("cacheKey") || "";

  if (!predictionId || !/^[a-z0-9]+$/.test(predictionId)) {
    return NextResponse.json({ error: "A valid predictionId is required" }, { status: 400 });
  }

  try {
    const prediction = await replicate.predictions.get(predictionId);

    if (prediction.status === "succeeded") {
      if (typeof prediction.output !== "string") {
        throw new Error("Replicate completed without an audio URL");
      }

      const result = { villagerUrl: prediction.output };
      if (cacheKey.startsWith("convert:")) {
        await setCache(cacheKey, result, []);
      }

      return NextResponse.json({ success: true, status: prediction.status, ...result });
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      return NextResponse.json(
        { error: typeof prediction.error === "string" ? prediction.error : "Villager conversion failed", status: prediction.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, status: prediction.status });
  } catch (error: any) {
    console.error("Error retrieving villager prediction:", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve villager conversion" }, { status: 500 });
  }
}
