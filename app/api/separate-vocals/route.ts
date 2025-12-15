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
    ) as { 
      vocals?: ReadableStream | string;
      drums?: ReadableStream | string;
      bass?: ReadableStream | string;
      other?: ReadableStream | string;
      instrumental?: ReadableStream | string;
    };

    console.log("Replicate output received:", Object.keys(output));

    if (!output || !output.vocals) {
        throw new Error("Replicate failed to return vocals");
    }

    const timestamp = Date.now();
    const baseFilename = path.basename(filename, path.extname(filename));

    // Helper function to save stem
    const saveStem = async (stem: ReadableStream | string, stemName: string): Promise<string> => {
      const stemFilename = `${stemName}-${timestamp}-${baseFilename}.wav`;
      const stemPath = path.join(tempDir, stemFilename);

      if (typeof stem === 'string') {
        console.log(`${stemName} returned as URL, downloading...`);
        const response = await fetch(stem);
        if (!response.ok) throw new Error(`Failed to fetch ${stemName} from Replicate URL`);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(stemPath, buffer);
      } else {
        console.log(`${stemName} returned as Stream, saving to file...`);
        const nodeStream = Readable.fromWeb(stem as any);
        await pipeline(nodeStream, fs.createWriteStream(stemPath));
      }

      console.log(`${stemName} saved to ${stemPath}`);
      return `/api/audio?file=${stemFilename}`;
    };

    // Save vocals
    const vocalsUrl = await saveStem(output.vocals, 'vocals');

    // Handle instrumental: prefer direct instrumental output, otherwise combine drums+bass+other
    let instrumentalUrl: string | { type: string; stems: string[] };
    
    if (output.instrumental) {
      // Direct instrumental output available
      instrumentalUrl = await saveStem(output.instrumental, 'instrumental');
    } else if (output.drums && output.bass && output.other) {
      // Need to combine drums + bass + other
      console.log("Saving individual stems to combine into instrumental...");
      const drumsUrl = await saveStem(output.drums, 'drums');
      const bassUrl = await saveStem(output.bass, 'bass');
      const otherUrl = await saveStem(output.other, 'other');
      
      // Return object with multiple stems - frontend will call combine-audio with these
      instrumentalUrl = { type: 'multi', stems: [drumsUrl, bassUrl, otherUrl] };
    } else {
      // Fallback: use "other" stem if available (not ideal but better than nothing)
      if (output.other) {
        console.log("Using 'other' stem as instrumental (fallback)");
        instrumentalUrl = await saveStem(output.other, 'instrumental');
      } else {
        throw new Error("Replicate did not return instrumental or required stems (drums, bass, other)");
      }
    }

    return NextResponse.json({ 
      success: true, 
      vocalsUrl,
      instrumentalUrl
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
