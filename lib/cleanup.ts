import fs from 'fs/promises';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'public', 'temp');
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export async function cleanupTempFiles() {
  try {
    // Check if directory exists
    try {
      await fs.access(TEMP_DIR);
    } catch {
      return; // Directory doesn't exist, nothing to clean
    }

    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();

    const deletePromises = files.map(async (file) => {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > MAX_AGE_MS) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      } catch (err) {
        // Ignore errors for individual files (e.g. race conditions)
        console.error(`Failed to clean up file ${file}:`, err);
      }
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error during temp file cleanup:', error);
  }
}

