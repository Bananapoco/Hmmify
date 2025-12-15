
# 🎵 Minecraft Villager Singing Generator - Roadmap

## Project Overview
A web app that converts uploaded audio files into hilarious Minecraft villager singing with dancing animations.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Next.js API Routes
- **Audio Processing**: Replicate API for ML models
- **Vocal Separation**: Replicate - Demucs by ryan5453
- **Voice Conversion**: Replicate - rvc-v2 by psuedoram

---

## Replicate API Setup (Required)

### Quick Setup
1. **Create Replicate Account**: https://replicate.com/signup
2. **Get API Token**: https://replicate.com/account/api-tokens
3. **Install SDK**: `npm install replicate`
4. **Add to `.env.local`**:
   ```bash
   REPLICATE_API_TOKEN=your_token_here
   ```

### Cost Estimates
- **Demucs (vocal separation)**: ~$0.035 per run
- **RVC-v2 (voice conversion)**: Check current pricing on Replicate
- **Total per conversion**: Likely under $0.10

### Why Replicate?
- No ML infrastructure needed - No GPU, no Python setup
- Pay-per-use - Only pay for what you process
- Easy integration - Simple API calls from Next.js
- Scalable - Handles load automatically


---

## Phase 1: Project Setup ✅
- [x] Initialize Next.js project
- [x] Configure Tailwind CSS
- [x] Install and configure ShadCN UI components
- [x] Set up TypeScript
- [x] Create Minecraft-style UI with custom fonts

---

## Phase 2: Frontend UI Development ✅
- [x] Create main page with file upload (drag-and-drop)
- [x] Implement dancing villager component with random dance moves
- [x] Add audio player and state management

---

## Phase 3: Backend API Development

### 3.1 File Upload ✅
- [x] Accept MP3/WAV file uploads
- [x] Save files to temporary storage
- [x] Serve uploaded files for playback

**API Route**: `/api/upload-audio`
```typescript
POST /api/upload-audio
Body: FormData with 'audio' field
Returns: { audioUrl: string, filename: string }
```

### 3.2 Audio Separation (Recommended)
**Why**: Better results if we separate vocals from instrumental before voice conversion

**Using Replicate - Demucs by ryan5453**
- **Model**: `ryan5453/demucs` on Replicate
- **Cost**: ~$0.035 per run
- **API Route**: `/api/separate-vocals`
```typescript
POST /api/separate-vocals
Body: { audioFile: File | audioUrl: string }
Returns: { vocalsUrl: string }
```

### 3.3 Voice Conversion to Villager Sounds
**Using Replicate - rvc-v2 by psuedoram**
- **Model**: `psuedoram/rvc-v2` on Replicate
- **Requires**: Pre-trained villager RVC model file
- **API Route**: `/api/convert-to-villager`
```typescript
POST /api/convert-to-villager
Body: { audioFile: File | audioUrl: string, modelPath?: string }
Returns: { villagerAudioUrl: string }
```
---

## Phase 4: Integration & Polish

### 4.1 Complete Pipeline
- [ ] Chain all API calls:
  1. Upload audio file
  2. Separate vocals (optional)
  3. Convert to villager sounds
  4. Return to frontend

### 4.2 Error Handling
- [ ] Handle invalid file formats
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
- **Deployment**: Deploy Next.js app to Vercel (perfect for serverless)
- **ML Processing**: All handled by Replicate API (no infrastructure needed)
- **Cost Management**: Monitor usage in Replicate dashboard

### 5.2 Storage
- Temporary file storage (local temp files or S3/Cloudinary)
- Clean up after processing

### 5.3 Rate Limiting
- Prevent abuse
- Add rate limiting to API routes

---

## Recommended Libraries & Tools

### Voice Conversion & Audio Separation
- **Replicate SDK**: `npm install replicate`
- **Demucs**: `ryan5453/demucs` - https://replicate.com/ryan5453/demucs
- **RVC-v2**: `psuedoram/rvc-v2` - https://replicate.com/psuedoram/rvc-v2

### Frontend Audio
- **Web Audio API** - Native browser audio (already using HTML5 `<audio>`)

---

## Quick Start Implementation Order

1. ✅ **Set up Next.js project** (Done)
2. ✅ **Create basic UI** with file upload and villager display (Done)
3. ✅ **Add dancing villager animation** (Done)
4. ✅ **Implement file upload** (Done)
5. **Set up Replicate API** (see setup section above)
6. **Implement Demucs vocal separation** via Replicate
7. **Obtain/train villager RVC model** (key challenge!)
8. **Implement RVC voice conversion** via Replicate
9. **Chain pipeline together** in `/api/process-audio`
10. **Polish and deploy**

---

## Notes & Considerations

### Replicate API Considerations
- **Processing**: Async jobs - handle polling for completion
- **Rate Limits**: Check Replicate docs for current limits
- **File Size**: Be aware of upload size limits
- **Error Handling**: Implement retry logic for failed jobs

### Voice Conversion Challenge
The main challenge is obtaining a villager RVC model:

1. **Train Your Own Model** (Best results):
   - Collect Minecraft villager sound samples
   - Use RVC training tools to create model
   - Upload model to Replicate or host elsewhere
   - Use model path in Replicate API calls

2. **Use Pre-trained Model** (If available):
   - Search for existing villager RVC models
   - May need to adapt to Replicate format
   - Could start with generic voice model and adapt

3. **Alternative Approach** (If RVC model unavailable):
   - Use Replicate's RVC-v2 with closest available voice model
   - Post-process audio to add villager-like characteristics
   - Combine with villager sound library for final effect

