import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'cache.json');
const TEMP_DIR = path.join(process.cwd(), 'public', 'temp');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(CACHE_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

interface CacheEntry {
  timestamp: number;
  data: any;
  files?: string[]; // List of related filenames in TEMP_DIR
}

interface CacheData {
  [key: string]: CacheEntry;
}

export async function getCache(key: string): Promise<any | null> {
  try {
    await ensureDataDir();
    
    let cacheData: CacheData = {};
    try {
      const content = await fs.readFile(CACHE_FILE, 'utf-8');
      cacheData = JSON.parse(content);
    } catch {
      return null;
    }

    const entry = cacheData[key];
    if (!entry) return null;

    // Verify all related files exist
    if (entry.files && entry.files.length > 0) {
      for (const file of entry.files) {
        const filePath = path.join(TEMP_DIR, file);
        try {
            await fs.access(filePath);
            // Touch the file to prevent cleanup
            const now = new Date();
            await fs.utimes(filePath, now, now);
        } catch {
          // File missing, cache invalid
          // Optional: remove entry from cache file immediately?
          // For now just return null
          return null;
        }
      }
    }

    return entry.data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export async function setCache(key: string, data: any, relatedFiles: string[] = []) {
  try {
    await ensureDataDir();
    
    let cacheData: CacheData = {};
    try {
      const content = await fs.readFile(CACHE_FILE, 'utf-8');
      cacheData = JSON.parse(content);
    } catch {
      // File likely doesn't exist or is empty, start fresh
    }

    cacheData[key] = {
      timestamp: Date.now(),
      data,
      files: relatedFiles
    };

    await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}




