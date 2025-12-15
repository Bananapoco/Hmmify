import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log(`Receiving upload: ${file.name} (${file.size} bytes)`);

    const tempDir = path.join(process.cwd(), "public", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Sanitize filename
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const timestamp = Date.now();
    const filename = `upload-${timestamp}-${safeName}`;
    const filePath = path.join(tempDir, filename);

    await writeFile(filePath, buffer);
    console.log(`Saved file to ${filePath}`);

    // Return URL to local file
    const audioUrl = `/api/audio?file=${filename}`;

    return NextResponse.json({ 
      success: true, 
      audioUrl: audioUrl,
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

