import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getTempDir } from "@/lib/path-utils";

// Handles serving audio files securely from temp dir
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("file");

  if (!filename) {
    return NextResponse.json({ error: "File parameter missing" }, { status: 400 });
  }

  // Security check: ensure no directory traversal
  const cleanFilename = path.basename(filename);
  const tempDir = getTempDir();
  const filePath = path.join(tempDir, cleanFilename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  
  // Determine content type
  const ext = path.extname(cleanFilename).toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === ".mp3") contentType = "audio/mpeg";
  if (ext === ".m4a") contentType = "audio/mp4";
  if (ext === ".wav") contentType = "audio/wav";
  if (ext === ".webm") contentType = "audio/webm";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileBuffer.length.toString(),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store" // Don't cache during dev/testing
    },
  });
}


