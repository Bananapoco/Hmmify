import { NextRequest, NextResponse } from "next/server";
import replicate from "@/lib/replicate";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), "public", "temp");
    const filePath = path.join(tempDir, path.basename(filename));
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found on server" }, { status: 404 });
    }

    console.log(`Sending ${filename} to Replicate for vocal separation...`);

    const fileBuffer = fs.readFileSync(filePath);
    const fileBase64 = fileBuffer.toString('base64');
    const dataUri = `data:audio/mp3;base64,${fileBase64}`;

    // Run Demucs
    const output = await replicate.run(
      "ryan5453/demucs:5a7041cc9b82e5a558fea6b3d7b12dea89625e89da33f0447bd727c2d0ab9e77",
      {
        input: {
          audio: dataUri
        }
      }
    ) as { vocals?: ReadableStream | string };

    console.log("Replicate output received.");

    if (!output || !output.vocals) {
        throw new Error("Replicate failed to return vocals");
    }

    // Handle the output
    const vocalsOutput = output.vocals;
    const vocalsFilename = `vocals-${Date.now()}-${path.basename(filename)}`;
    const vocalsPath = path.join(tempDir, vocalsFilename);

    if (typeof vocalsOutput === 'string') {
        // If it's a URL string, download it
        console.log("Vocals returned as URL, downloading...");
        const response = await fetch(vocalsOutput);
        if (!response.ok) throw new Error("Failed to fetch vocals from Replicate URL");
        
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(vocalsPath, buffer);
    } else {
        // If it's a stream (Replicate SDK behavior)
        console.log("Vocals returned as Stream, saving to file...");
        // Convert web ReadableStream to Node stream if necessary, or just write it
        // Replicate SDK returns a standard web ReadableStream usually
        const nodeStream = Readable.fromWeb(vocalsOutput as any);
        await pipeline(nodeStream, fs.createWriteStream(vocalsPath));
    }

    console.log(`Vocals saved to ${vocalsPath}`);

    // Return local URL
    const localVocalsUrl = `/api/audio?file=${vocalsFilename}`;

    return NextResponse.json({ 
      success: true, 
      vocalsUrl: localVocalsUrl 
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
