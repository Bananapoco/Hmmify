# 🎵 Minecraft Villager Singing Generator - Roadmap

## Project Overview
A web app that converts YouTube videos into hilarious Minecraft villager singing videos with dancing animations.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Next.js API Routes
- **Audio Processing**: Python backend service (or Node.js alternatives)
- **Voice Conversion**: RVC (Retrieval-based Voice Conversion) or similar

---

## Phase 1: Project Setup ✅
- [x] Initialize Next.js project
- [x] Configure Tailwind CSS
- [x] Install and configure ShadCN UI components
- [x] Set up TypeScript

---

## Phase 2: Frontend UI Development

### 2.1 Basic Layout
- [ ] Create main page with:
  - YouTube URL input field (ShadCN Input component)
  - Submit button
  - Loading state indicator
  - Villager display area (canvas or div with sprite animations)
  - Audio player for result

### 2.2 Dancing Villager Component
- [ ] Create villager sprite/character (CSS animations or canvas)
- [ ] Implement random dance move cycle:
  - Idle animation
  - Dance move 1 (bobbing)
  - Dance move 2 (spinning)
  - Dance move 3 (jumping)
  - Dance move 4 (wiggling)
- [ ] Randomly cycle through moves during playback

### 2.3 State Management
- [ ] Handle form submission
- [ ] Manage loading states
- [ ] Handle error states
- [ ] Store and play generated audio

---

## Phase 3: Backend API Development

### 3.1 YouTube Audio Extraction
**Option A: Node.js (Recommended for simplicity)**
- Use `ytdl-core` or `@distube/ytdl-core` to extract audio
- Convert to WAV/MP3 format
- Store temporarily

**Option B: Python Service**
- Use `yt-dlp` (better maintained than youtube-dl)
- Extract audio as MP3/WAV
- Expose via API endpoint

**API Route**: `/api/extract-audio`
```typescript
POST /api/extract-audio
Body: { youtubeUrl: string }
Returns: { audioUrl: string, duration: number }
```

### 3.2 Audio Separation (Optional but Recommended)
**Why**: Better results if we separate vocals from instrumental
- Use **Spleeter** (Python) or **demucs** (better quality)
- Or use API service like **LALAL.AI API** or **VocalRemover.org API**
- Extract vocals only

**API Route**: `/api/separate-vocals`
```typescript
POST /api/separate-vocals
Body: { audioFile: File }
Returns: { vocalsUrl: string }
```

**Alternative**: Skip separation if using RVC models that handle mixed audio well

### 3.3 Voice Conversion to Villager Sounds
**The Magic Part**: Converting vocals to villager grunts

**Option A: RVC (Retrieval-based Voice Conversion)**
- Train or use pre-trained RVC model with villager sounds
- Requires Python backend service
- Best quality but more complex

**Option B: Real-Time Voice Changer (RVC) via API**
- Use existing RVC service/API
- Or run RVC model in Docker container

**Option C: Audio Processing + Sound Library**
- Map audio frequencies to villager sound library
- Use Web Audio API or similar
- Simpler but less accurate

**API Route**: `/api/convert-to-villager`
```typescript
POST /api/convert-to-villager
Body: { audioFile: File }
Returns: { villagerAudioUrl: string }
```

---

## Phase 4: Integration & Polish

### 4.1 Complete Pipeline
- [ ] Chain all API calls:
  1. Extract audio from YouTube
  2. Separate vocals (optional)
  3. Convert to villager sounds
  4. Return to frontend

### 4.2 Error Handling
- [ ] Handle invalid YouTube URLs
- [ ] Handle processing failures
- [ ] Show user-friendly error messages

### 4.3 Performance Optimization
- [ ] Add progress indicators for long operations
- [ ] Implement audio caching
- [ ] Optimize file sizes

### 4.4 UI/UX Enhancements
- [ ] Add preview of original audio
- [ ] Show processing progress
- [ ] Add download button for result
- [ ] Make villager dance sync with audio playback

---

## Phase 5: Deployment Considerations

### 5.1 Backend Services
- **Option A**: Deploy Python service separately (Railway, Render, etc.)
- **Option B**: Use serverless functions (Vercel, but limited for heavy ML)
- **Option C**: Use external APIs for heavy processing

### 5.2 Storage
- Temporary file storage (S3, Cloudinary, or local temp files)
- Clean up after processing

### 5.3 Rate Limiting
- Prevent abuse
- Add rate limiting to API routes

---

## Recommended Libraries & Tools

### Audio Processing
- **ytdl-core** / **@distube/ytdl-core** - YouTube audio extraction (Node.js)
- **yt-dlp** - Better YouTube extraction (Python)
- **ffmpeg** - Audio conversion/manipulation
- **fluent-ffmpeg** - Node.js wrapper for ffmpeg

### Voice Conversion
- **RVC (Retrieval-based Voice Conversion)** - GitHub: RVC-Project
- **so-vits-svc** - Alternative voice conversion model
- **Coqui TTS** - Text-to-speech (if needed)

### Audio Separation
- **Spleeter** - Audio source separation (Python)
- **demucs** - Better quality separation (Python)
- **LALAL.AI API** - Commercial API option

### Frontend Audio
- **Howler.js** - Audio playback library
- **Web Audio API** - Native browser audio

---

## Quick Start Implementation Order

1. ✅ **Set up Next.js project** (Done)
2. **Create basic UI** with input field and villager display
3. **Implement YouTube audio extraction** (start simple)
4. **Add dancing villager animation**
5. **Research and implement voice conversion** (this is the hardest part)
6. **Add audio separation** (if needed for better results)
7. **Polish and deploy**

---

## Notes & Considerations

### Voice Conversion Challenge
The hardest part is converting vocals to villager sounds. You have a few approaches:

1. **Pre-trained RVC Model**: Train an RVC model on Minecraft villager sounds
   - Collect villager sound samples
   - Train model to convert any voice to villager
   - Requires ML knowledge but best results

2. **Audio Mapping**: Map audio frequencies to villager sound library
   - Extract pitch/rhythm from vocals
   - Map to closest matching villager sounds
   - Simpler but less accurate

3. **Use Existing Service**: Find if someone already built this
   - Check GitHub for villager voice conversion projects
   - Use their API or code

### Audio Separation
- **Not always necessary** - RVC models can work with mixed audio
- **Better quality** - Separating vocals first usually gives cleaner results
- **Start without it** - Add later if needed

### Villager Sounds
- Extract from Minecraft game files
- Or use online villager sound libraries
- Need variety for different pitches/emotions

---

## Next Steps
1. Start with basic UI and YouTube extraction
2. Research RVC implementation options
3. Build MVP without separation first
4. Iterate based on results

Good luck! This is going to be hilarious! 🎉

