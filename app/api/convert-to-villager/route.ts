import { NextRequest, NextResponse } from "next/server";
import replicate from "@/lib/replicate";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json();

    if (!audioUrl) {
      return NextResponse.json({ error: "Audio URL is required" }, { status: 400 });
    }

    console.log(`Converting to villager voice. Input: ${audioUrl}`);

    // If audioUrl is local (/api/audio?file=...), resolve it to a public URL or upload it
    // Replicate RVC needs a public URL for input_audio usually, or a data URI.
    // Our /api/audio is LOCAL ONLY.
    
    // Check if it's a local file path we can read directly to create a data URI
    let inputAudio = audioUrl;
    if (audioUrl.startsWith('/api/audio')) {
        const urlObj = new URL(audioUrl, 'http://localhost');
        const filename = urlObj.searchParams.get('file');
        if (filename) {
            const filePath = path.join(process.cwd(), "public", "temp", filename);
            if (fs.existsSync(filePath)) {
                const buffer = fs.readFileSync(filePath);
                const base64 = buffer.toString('base64');
                // mime type guess
                const ext = path.extname(filename);
                const mime = ext === '.mp3' ? 'audio/mpeg' : 'audio/wav'; 
                inputAudio = `data:${mime};base64,${base64}`;
                console.log("Converted local audio to Data URI for Replicate");
            }
        }
    }

    // Run RVC-v2
    const output = await replicate.run(
      "pseudoram/rvc-v2:d18e2e0a6a6d3af183cc09622cebba8555ec9a9e66983261fc64c8b1572b7dce",
      {
        input: {
          input_audio: inputAudio,
          rvc_model: "CUSTOM",
          custom_rvc_model_download_url: "https://huggingface.co/Fonre/RVC-Models/resolve/main/Villager%20(Minecraft)%20-%20Weights%20Model.zip?download=true",
          pitch_change: 0, // Villagers are kinda neutral? Maybe -2 for deeper? Let's try 0.
          index_rate: 0.5, // Default balance
          filter_radius: 3,
          rms_mix_rate: 0.25,
          protect: 0.33
        }
      }
    ) as ReadableStream | string;

    console.log("Replicate RVC output received.");

    // Handle output (stream or URL)
    const tempDir = path.join(process.cwd(), "public", "temp");
    const timestamp = Date.now();
    const villagerFilename = `villager-${timestamp}.wav`; // RVC usually outputs WAV
    const villagerPath = path.join(tempDir, villagerFilename);

    if (typeof output === 'string') {
        const response = await fetch(output);
        if (!response.ok) throw new Error("Failed to fetch villager audio from Replicate URL");
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(villagerPath, buffer);
    } else {
        const nodeStream = Readable.fromWeb(output as any);
        await pipeline(nodeStream, fs.createWriteStream(villagerPath));
    }

    console.log(`Villager audio saved to ${villagerPath}`);

    const villagerUrl = `/api/audio?file=${villagerFilename}`;

    return NextResponse.json({ 
      success: true, 
      villagerUrl: villagerUrl 
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

