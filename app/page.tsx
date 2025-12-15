"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VillagerDancer } from "@/components/VillagerDancer";
import { Loader2, Music, Upload, Wand2, RefreshCcw } from "lucide-react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  // New state for vocal separation toggle
  const [separateVocals, setSeparateVocals] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("audio/")) {
        setError("Please select a valid audio file (MP3, WAV, etc.)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError("File size too large (max 10MB)");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError("Please select an audio file first");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setAudioUrl(null);
    setStatusMessage("Uploading audio...");

    try {
      const formData = new FormData();
      formData.append("audio", selectedFile);

      // 1. Upload Audio
      const uploadResponse = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio");
      }

      const uploadData = await uploadResponse.json();
      let processingUrl = uploadData.audioUrl; // Default to uploaded file
      let instrumentalUrl: string | { type: string; stems: string[] } | null = null;
      
      // 2. Separate Vocals (Optional)
      if (separateVocals) {
        setStatusMessage("Phase 1: Extracting vocals (AI Separation)...");
        
        const separateResponse = await fetch("/api/separate-vocals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: uploadData.filename }),
        });

        if (!separateResponse.ok) {
            const errData = await separateResponse.json();
            throw new Error(errData.error || "Failed to separate vocals");
        }

        const separateData = await separateResponse.json();
        processingUrl = separateData.vocalsUrl; // Use vocals for next step
        instrumentalUrl = separateData.instrumentalUrl; // Could be string or object with multiple stems
      }

      // 3. Convert to Villager (RVC)
      setStatusMessage("Phase 2: Villager-ifying (RVC Model)...");

      const convertResponse = await fetch("/api/convert-to-villager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: processingUrl }),
      });

      if (!convertResponse.ok) {
        const errData = await convertResponse.json();
        throw new Error(errData.error || "Failed to convert to villager voice");
      }

      const convertData = await convertResponse.json();
      const villagerVocalsUrl = convertData.villagerUrl;
      
      // 4. Combine villager vocals with instrumental (if vocal separation was used)
      if (separateVocals && instrumentalUrl) {
        setStatusMessage("Phase 3: Mixing villager vocals with instrumental...");
        
        const combineResponse = await fetch("/api/combine-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            vocalsUrl: villagerVocalsUrl,
            instrumentalUrl: instrumentalUrl
          }),
        });

        if (!combineResponse.ok) {
          const errData = await combineResponse.json();
          throw new Error(errData.error || "Failed to combine audio");
        }

        const combineData = await combineResponse.json();
        setAudioUrl(combineData.combinedUrl);
      } else {
        // No vocal separation, just play the villager-converted audio
        setAudioUrl(villagerVocalsUrl);
      }
      
      setIsPlaying(true);
      setStatusMessage("");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[url('/dirt-texture.png')] bg-repeat bg-[#f0f0f0]">
      <div className="min-h-screen bg-background/95 relative">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 space-y-1">
              <h1 className="text-6xl md:text-7xl font-mc-title mb-0 text-minecraft-title tracking-wider pt-4">
                Hmmify
              </h1>
              <p className="text-minecraft-splash text-xl font-mc-subheading pt-0">
                Turn any audio into villageroke!
              </p>
            </div>

            {/* Main Card */}
            <Card className="mb-8 border-4 border-border/50">
              <CardHeader className="bg-secondary/10">
                <CardDescription className="text-lg mt-0 text-center font-mc-subheading text-muted-foreground/80">
                  Upload an MP3 or WAV file. We'll extract the vocals and turn them into "Hmmms"!
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex gap-4 flex-col sm:flex-row items-start">
                    <div className="flex-1 w-full space-y-4">
                        <div className="relative flex items-center justify-center w-full h-32 border-2 border-dashed border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-colors cursor-pointer group rounded-lg overflow-hidden">
                            <Input
                                type="file"
                                accept="audio/*"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="text-center space-y-2 pointer-events-none">
                                {selectedFile ? (
                                    <>
                                        <Music className="w-8 h-8 mx-auto text-primary" />
                                        <p className="font-mc-subheading text-sm text-primary truncate max-w-[200px]">
                                            {selectedFile.name}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                                        <p className="font-mc-subheading text-sm text-muted-foreground">
                                            Click or drag to upload audio
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Vocal Separation Toggle */}
                        <div className="flex items-center space-x-2 bg-secondary/10 p-3 rounded-lg border-2 border-border/20">
                            <input
                                type="checkbox"
                                id="separate-vocals"
                                checked={separateVocals}
                                onChange={(e) => setSeparateVocals(e.target.checked)}
                                disabled={isProcessing}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="separate-vocals" className="text-sm font-mc-subheading cursor-pointer select-none flex-1">
                                Separate Vocals (Recommended for songs)
                                <span className="block text-xs text-muted-foreground font-sans mt-0.5">
                                    Uncheck for acapellas or to save API costs.
                                </span>
                            </label>
                        </div>
                    </div>
                    
                    <Button type="submit" disabled={isProcessing || !selectedFile} size="lg" className="text-lg h-32 w-full sm:w-auto px-8">
                      {isProcessing ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-6 w-6 animate-spin mb-2" />
                          <span className="text-xs text-center max-w-[100px] leading-tight">
                            {statusMessage || "Processing..."}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Wand2 className="h-6 w-6 mb-2" />
                          <span>Villager-ify</span>
                        </div>
                      )}
                    </Button>
                  </div>
                  {error && (
                    <div className="bg-destructive/10 border-2 border-destructive text-destructive p-4 font-mc-subheading text-sm">
                      ⚠️ {error}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Villager Display Area */}
            <Card className="border-4 border-border/50">
              <CardContent className="pt-12 pb-12">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  {isProcessing ? (
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 mx-auto bg-secondary/30 flex items-center justify-center border-4 border-border animate-pulse">
                         <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      </div>
                      <p className="text-muted-foreground font-mc-subheading text-lg max-w-md mx-auto">
                        {statusMessage || "Processing..."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-8">
                         <VillagerDancer isPlaying={isPlaying} className="scale-125" />
                      </div>
                      
                      {audioUrl && (
                        <div className="w-full max-w-md p-4 bg-card border-2 border-border shadow-[4px_4px_0_rgba(0,0,0,0.05)]">
                          <audio
                            controls
                            src={audioUrl}
                            className="w-full"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                          />
                        </div>
                      )}
                      {!audioUrl && !isProcessing && (
                        <p className="text-muted-foreground text-center font-mc-subheading opacity-50">
                          Waiting for your mixtape...
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info Section */}
            <div className="mt-12 text-center text-sm text-muted-foreground font-mc-subheading opacity-60">
              <p>
                Powered by Replicate AI
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
