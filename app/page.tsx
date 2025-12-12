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
      // TODO: Call API endpoint to process video
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
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-gray-900 dark:via-emerald-900 dark:to-teal-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              🎵 Villager Singing Generator
            </h1>
            <p className="text-muted-foreground text-lg">
              Turn any YouTube video into hilarious Minecraft villager singing!
            </p>
          </div>

          {/* Main Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Enter YouTube URL</CardTitle>
              <CardDescription>
                Paste a link to any YouTube video and watch the magic happen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={isProcessing}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Music className="mr-2 h-4 w-4" />
                        Convert
                      </>
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Villager Display Area */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                {isProcessing ? (
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-emerald-600" />
                    <p className="text-muted-foreground">
                      Extracting audio... Converting to villager sounds...
                    </p>
                  </div>
                ) : (
                  <>
                    <VillagerDancer isPlaying={isPlaying} className="mb-8" />
                    {audioUrl && (
                      <div className="w-full max-w-md">
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
                      <p className="text-muted-foreground text-center">
                        Enter a YouTube URL above to get started!
                      </p>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Made with ❤️ for laughs. Processing may take a minute or two.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

