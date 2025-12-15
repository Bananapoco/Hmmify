import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const memesDir = path.join(process.cwd(), 'public', 'memes');
    
    if (!fs.existsSync(memesDir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(memesDir);
    
    // Filter for image files
    const images = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    ).map(file => `/memes/${file}`);

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error reading memes directory:', error);
    return NextResponse.json({ error: 'Failed to load memes' }, { status: 500 });
  }
}






