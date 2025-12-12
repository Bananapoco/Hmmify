"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VillagerDancer } from "@/components/VillagerDancer";
import { Loader2, Music } from "lucide-react";

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setAudioUrl(null);

    try {
      // Call API endpoint to process video
      const response = await fetch("/api/process-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtubeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process video");
      }

      const data = await response.json();
      setAudioUrl(data.audioUrl);
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[url('/dirt-texture.png')] bg-repeat bg-[#f0f0f0]">
      {/* Texture overlay via CSS if image missing, essentially just a light noise or grid */}
      <div className="min-h-screen bg-background/95 relative">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 space-y-1">
              <h1 className="text-6xl md:text-7xl font-mc-title mb-0 text-minecraft-title tracking-wider pt-4">
                Hmmify
              </h1>
              <p className="text-minecraft-splash text-xl font-mc-subheading pt-0">
                Turn any YT vid into villageroke!
              </p>
            </div>

            {/* Main Card */}
            <Card className="mb-8 border-4 border-border/50">
              <CardHeader className="bg-secondary/10">
                <CardDescription className="text-lg mt-0 text-center font-mc-subheading text-muted-foreground/80">
                  Paste a link to any YouTube video and watch the magic happen
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex gap-4 flex-col sm:flex-row">
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      disabled={isProcessing}
                      className="flex-1 text-lg h-14"
                    />
                    <Button type="submit" disabled={isProcessing} size="lg" className="text-lg">
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Music className="mr-2 h-6 w-6" />
                          Convert
                        </>
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
                      <p className="text-muted-foreground font-mc-subheading text-lg">
                        Extracting audio... <br/>Converting to villager sounds...
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
                          Waiting for input...
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
                Made with ❤️ for laughs. Processing may take a minute or two.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
