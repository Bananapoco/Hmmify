"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { VillagerDancer } from "@/components/VillagerDancer";
import { Loader2, Music, Upload, Wand2, Play, Pause, Mic2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [separateVocals, setSeparateVocals] = useState(true);

  // Meme & Animation State
  const [memeImages, setMemeImages] = useState<string[]>([]);
  const [currentMeme, setCurrentMeme] = useState<string | null>(null);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [progress, setProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shuffledMemesRef = useRef<string[]>([]);
  const memeIndexRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Smooth progress animation
  useEffect(() => {
    if (!isProcessing || progress >= targetProgress) return;
    const interval = setInterval(() => {
        setProgress((prev) => {
            const diff = targetProgress - prev;
            if (diff <= 0.5) return targetProgress;
            const step = Math.max(0.5, diff * 0.1); 
            return Math.min(prev + step, targetProgress);
        });
    }, 100);
    return () => clearInterval(interval);
  }, [isProcessing, targetProgress, progress]);

  // Fetch memes
  useEffect(() => {
    const fetchMemes = async () => {
      try {
        const res = await fetch('/api/memes');
        if (res.ok) {
          const data = await res.json();
          setMemeImages(data.images);
        }
      } catch (err) {
        console.error("Failed to fetch memes", err);
      }
    };
    fetchMemes();
  }, []);

  const shuffleArray = useCallback((array: string[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  const nextMemeSlide = useCallback(() => {
    setFadeState('out');
    slideshowTimerRef.current = setTimeout(() => {
        let nextIndex = memeIndexRef.current + 1;
        if (nextIndex >= shuffledMemesRef.current.length) {
            const lastMeme = shuffledMemesRef.current[shuffledMemesRef.current.length - 1];
            let newShuffle = shuffleArray(memeImages);
            if (memeImages.length > 1 && newShuffle[0] === lastMeme) {
                [newShuffle[0], newShuffle[1]] = [newShuffle[1], newShuffle[0]];
            }
            shuffledMemesRef.current = newShuffle;
            nextIndex = 0;
        }
        memeIndexRef.current = nextIndex;
        setCurrentMeme(shuffledMemesRef.current[nextIndex]);
        setFadeState('in');
        slideshowTimerRef.current = setTimeout(nextMemeSlide, 5000);
    }, 500);
  }, [memeImages, shuffleArray]);

  const startMemeSlideshow = useCallback(() => {
    if (memeImages.length === 0) return;
    if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);
    shuffledMemesRef.current = shuffleArray(memeImages);
    memeIndexRef.current = 0;
    setCurrentMeme(shuffledMemesRef.current[0]);
    setFadeState('in');
    slideshowTimerRef.current = setTimeout(nextMemeSlide, 5000);
  }, [memeImages, nextMemeSlide, shuffleArray]);

  const stopMemeSlideshow = useCallback(() => {
    if (slideshowTimerRef.current) {
      clearTimeout(slideshowTimerRef.current);
      slideshowTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopMemeSlideshow();
  }, [stopMemeSlideshow]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("audio/")) {
        setError("Invalid file type (use MP3/WAV)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large (>10MB)");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return setError("Select an audio file first");

    setIsProcessing(true);
    setError(null);
    setAudioUrl(null);
    setStatusMessage("Initializing...");
    setProgress(0);
    setTargetProgress(0);
    startMemeSlideshow();

    try {
      const formData = new FormData();
      formData.append("audio", selectedFile);

      setTargetProgress(30); 
      setStatusMessage("Uploading...");
      const uploadResponse = await fetch("/api/upload-audio", { method: "POST", body: formData });
      if (!uploadResponse.ok) throw new Error("Upload failed");
      
      const uploadData = await uploadResponse.json();
      let processingUrl = uploadData.audioUrl; 
      let instrumentalUrl: string | { type: string; stems: string[] } | null = null;
      
      setProgress((prev) => Math.max(prev, 30));

      if (separateVocals) {
        setTargetProgress(60); 
        setStatusMessage("Extracting vocals...");
        const separateResponse = await fetch("/api/separate-vocals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: uploadData.filename }),
        });
        if (!separateResponse.ok) throw new Error("Separation failed");
        
        const separateData = await separateResponse.json();
        processingUrl = separateData.vocalsUrl; 
        
        if (typeof separateData.instrumentalUrl === 'string') {
           try { instrumentalUrl = JSON.parse(separateData.instrumentalUrl); } 
           catch { instrumentalUrl = separateData.instrumentalUrl; }
        } else {
           instrumentalUrl = separateData.instrumentalUrl;
        }
        setProgress((prev) => Math.max(prev, 60));
      }
      
      setTargetProgress(90); 
      setStatusMessage("Villager-ifying...");
      const convertResponse = await fetch("/api/convert-to-villager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: processingUrl }),
      });
      if (!convertResponse.ok) throw new Error("Conversion failed");
      
      const convertData = await convertResponse.json();
      const villagerVocalsUrl = convertData.villagerUrl;
      setProgress((prev) => Math.max(prev, 90));

      if (separateVocals && instrumentalUrl) {
        setTargetProgress(98);
        setStatusMessage("Mixing...");
        const combineResponse = await fetch("/api/combine-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vocalsUrl: villagerVocalsUrl, instrumentalUrl }),
        });
        if (!combineResponse.ok) throw new Error("Mixing failed");
        setAudioUrl((await combineResponse.json()).combinedUrl);
      } else {
        setAudioUrl(villagerVocalsUrl);
      }
      
      setTargetProgress(100);
      setProgress(100);
      setStatusMessage("Done!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
      stopMemeSlideshow();
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <main 
      className="min-h-screen bg-[url('/images/background_edited.png')] animate-scroll-background bg-repeat-x flex items-center justify-center p-4 md:p-8"
      style={{ backgroundSize: "auto 100%" }}
    >
      <div className="w-full max-w-5xl bg-[#1e1e1e]/90 border-4 border-[#5d5d5d] shadow-[0_0_0_4px_#00000040] rounded-lg overflow-hidden backdrop-blur-sm">
        
        {/* Header Bar */}
        <div className="bg-[#313131] p-4 border-b-4 border-[#1e1e1e] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                 <Image src="/images/title.png" alt="Hmmify" width={180} height={60} className="object-contain" />
                 <span className="hidden md:inline text-[#7a7a7a] font-mc-subheading text-lg">|</span>
                 <p className="text-[#FFFF00] font-mc-subheading text-sm text-minecraft-splash hidden md:block">
                    Turn audio into villageroke!
                 </p>
            </div>
            {/* Status Indicator */}
            <div className="flex items-center gap-2 bg-[#1e1e1e] px-4 py-2 rounded border-2 border-[#5d5d5d]">
                {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-mc-green" />
                ) : (
                    <div className={`h-3 w-3 rounded-full ${audioUrl ? 'bg-mc-green animate-pulse' : 'bg-gray-500'}`} />
                )}
                <span className="text-xs font-mc-subheading text-[#a0a0a0] uppercase tracking-wider">
                    {isProcessing ? statusMessage : audioUrl ? "Ready to Play" : "Idle"}
                </span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Left Column: Controls (4/12) */}
            <div className="lg:col-span-4 bg-[#c6c6c6] p-6 flex flex-col gap-6 border-b-4 lg:border-b-0 lg:border-r-4 border-[#1e1e1e]">
                
                {/* File Upload */}
                <div className="bg-[#8b8b8b] p-1 border-2 border-b-white border-r-white border-t-[#373737] border-l-[#373737]">
                    <div className="bg-[#c6c6c6] p-4 border-2 border-[#373737] relative group cursor-pointer hover:bg-[#dcdcdc] transition-colors">
                        <Input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileChange}
                            disabled={isProcessing}
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-2 text-[#373737]">
                             {selectedFile ? (
                                <Music className="w-8 h-8 text-[#373737]" />
                             ) : (
                                <Upload className="w-8 h-8 opacity-50" />
                             )}
                             <p className="font-mc-subheading text-xs text-center truncate w-full px-2">
                                {selectedFile ? selectedFile.name : "Click to Upload Audio"}
                             </p>
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 bg-[#8b8b8b] border-2 border-[#373737] cursor-pointer hover:bg-[#969696] transition-colors select-none">
                        <input
                            type="checkbox"
                            checked={separateVocals}
                            onChange={(e) => setSeparateVocals(e.target.checked)}
                            disabled={isProcessing}
                            className="w-5 h-5 rounded-none border-2 border-[#373737] bg-[#c6c6c6] checked:bg-mc-green focus:ring-0 text-mc-green"
                        />
                        <div className="flex flex-col">
                            <span className="font-mc-subheading text-sm text-[#1e1e1e]">Separate Vocals</span>
                            <span className="text-[10px] text-[#373737]">Recommended for songs</span>
                        </div>
                    </label>
                </div>

                {/* Action Button */}
                <Button 
                    onClick={handleSubmit}
                    disabled={isProcessing || !selectedFile} 
                    className={cn(
                        "w-full h-14 text-lg font-mc-heading tracking-wide border-b-4 border-black/30 active:border-b-0 active:translate-y-1 transition-all",
                        isProcessing ? "bg-[#5d5d5d] text-[#a0a0a0]" : "bg-mc-green hover:bg-mc-darkGreen text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.3)]"
                    )}
                >
                    {isProcessing ? "Cooking..." : "Villager-ify!"}
                </Button>

                {/* Error Box */}
                {error && (
                    <div className="bg-[#ff5555]/20 border-2 border-[#ff5555] p-3 text-[#ff5555] text-xs font-mc-subheading text-center">
                        {error}
                    </div>
                )}
            </div>

            {/* Right Column: Stage (8/12) */}
            <div className="lg:col-span-8 bg-[#101010] relative min-h-[400px] flex flex-col">
                
                {/* Visualizer Area */}
                <div 
                    className="flex-1 relative flex items-center justify-center overflow-hidden bg-[url('/images/village_background.webp')] bg-bottom"
                    style={{ backgroundSize: "150% auto", backgroundPosition: "center bottom" }}
                >
                    <div className="absolute inset-0 bg-black/20" />
                    
                    {/* Progress Overlay */}
                    {isProcessing && (
                         <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-8">
                            <div className="w-full max-w-sm space-y-4">
                                {/* Meme Frame */}
                                <div className="aspect-video bg-[#c6c6c6] border-4 border-white p-1 shadow-2xl relative">
                                    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden relative">
                                        {currentMeme ? (
                                            <Image 
                                                src={currentMeme} 
                                                alt="Meme" 
                                                fill 
                                                className={`object-contain transition-opacity duration-500 ${fadeState === 'in' ? 'opacity-100' : 'opacity-0'}`} 
                                            />
                                        ) : (
                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        )}
                                    </div>
                                </div>
                                {/* Bar */}
                                <div className="space-y-1">
                                    <div className="h-4 w-full bg-[#373737] border-2 border-white relative">
                                        <div className="h-full bg-mc-green transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-center text-white text-xs font-mc-subheading animate-pulse">{Math.round(progress)}%</p>
                                </div>
                            </div>
                         </div>
                    )}

                    {/* Main Actor */}
                    <div className="relative z-10 w-full h-full p-8 flex items-end justify-center pb-0">
                        <VillagerDancer isPlaying={isPlaying} className="w-full max-w-[400px] aspect-square" />
                    </div>
                </div>

                {/* Audio Controls Bar (Jukebox Style) */}
                <div className="h-20 bg-[#3a2618] border-t-4 border-[#563823] flex items-center px-6 gap-4 relative">
                    {/* Custom Audio Player */}
                    {audioUrl ? (
                         <>
                            <audio 
                                ref={audioRef}
                                src={audioUrl}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => setIsPlaying(false)}
                                className="hidden"
                            />
                            <Button 
                                onClick={togglePlayback}
                                size="icon"
                                className="h-12 w-12 rounded-full bg-[#c6c6c6] border-4 border-[#8b8b8b] hover:bg-white text-[#1e1e1e] hover:scale-105 active:scale-95 transition-all"
                            >
                                {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current ml-1" />}
                            </Button>
                            
                            <div className="flex-1 bg-[#1e1e1e] h-10 border-2 border-[#563823] rounded p-2 flex items-center gap-2 overflow-hidden">
                                <Music className="w-4 h-4 text-mc-green animate-bounce" />
                                <span className="font-mc-subheading text-xs text-[#a0a0a0] truncate">
                                    Now Playing: {selectedFile?.name.replace(/\.[^/.]+$/, "")} (Villager Mix)
                                </span>
                            </div>

                            <a 
                                href={audioUrl} 
                                download={`villager-${selectedFile?.name || 'audio'}.wav`}
                                className="h-10 px-4 bg-mc-green hover:bg-mc-darkGreen text-white font-mc-subheading text-xs flex items-center gap-2 border-b-4 border-black/20 rounded active:border-b-0 active:translate-y-1 transition-all"
                            >
                                Download
                            </a>
                         </>
                    ) : (
                        <div className="w-full flex items-center justify-center text-[#8b6546] font-mc-subheading text-sm opacity-50 gap-2">
                             <Mic2 className="w-4 h-4" />
                             <span>Jukebox Empty</span>
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </main>
  );
}
