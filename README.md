# 🎵 Minecraft Villager Singing Generator

A hilarious web app that converts YouTube videos into Minecraft villager singing videos with dancing animations!

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Project Status

✅ **Completed:**
- Next.js project setup with TypeScript
- Tailwind CSS configuration
- ShadCN UI components
- Basic UI with YouTube URL input
- Dancing villager animation component
- API route structure

🚧 **To Implement:**
- YouTube audio extraction
- Audio/vocal separation (optional)
- Voice conversion to villager sounds (RVC)
- Complete processing pipeline

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI
- **Icons**: Lucide React

## 📚 Implementation Guide

See [ROADMAP.md](./ROADMAP.md) for a detailed implementation roadmap and technical details.

## 🎯 Next Steps

1. **YouTube Audio Extraction**
   - Install `@distube/ytdl-core` or `ytdl-core`
   - Implement audio extraction in API route
   - Convert to WAV/MP3 format

2. **Voice Conversion**
   - Research RVC (Retrieval-based Voice Conversion) implementation
   - Set up Python service or use Node.js alternative
   - Train/use pre-trained villager voice model

3. **Audio Separation** (Optional)
   - Implement using Spleeter, demucs, or API service
   - Improves quality but not always necessary

## 📝 Notes

- The hardest part is the voice conversion - this is where the magic happens!
- Consider starting with a simpler approach (audio mapping) before diving into RVC
- Check GitHub for existing villager voice conversion projects you can learn from

## 🎨 Features

- 🎬 YouTube video URL input
- 🎵 Audio extraction and processing
- 🎭 Dancing villager animations
- 🎤 Villager voice conversion
- 📱 Responsive design

## 🤝 Contributing

This is a fun project! Feel free to experiment and make it even sillier!

## 📄 License

MIT

---

Made with ❤️ and lots of laughs! 🎉



