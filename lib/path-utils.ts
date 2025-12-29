import path from "path";
import os from "os";

export function getTempDir() {
  // In Vercel/Serverless, we must use os.tmpdir() (which is usually /tmp)
  // Locally, we can also use it, or fallback to public/temp if we really want to inspect files easily.
  // But for consistency and to avoid "read-only filesystem" errors, let's use os.tmpdir() everywhere.
  // However, local development might be easier if we stick to the project folder.
  
  if (process.env.NODE_ENV === "production") {
    return os.tmpdir();
  }
  
  // Local development: usage of os.tmpdir() works but files are hidden deep in system.
  // We can stick to project temp for dev if we ensure it's writable.
  // But to be 100% sure the logic is identical, using os.tmpdir() is safer.
  // Let's use os.tmpdir() to rule out environment differences.
  return os.tmpdir();
}




