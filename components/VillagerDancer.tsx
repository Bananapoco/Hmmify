"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DanceMove = "idle" | "bob" | "spin" | "jump" | "wiggle";

const danceMoves: DanceMove[] = ["idle", "bob", "spin", "jump", "wiggle"];

interface VillagerDancerProps {
  isPlaying?: boolean;
  className?: string;
}

export function VillagerDancer({ isPlaying = false, className }: VillagerDancerProps) {
  const [currentMove, setCurrentMove] = useState<DanceMove>("idle");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      setCurrentMove("idle");
      return;
    }

    const changeMove = () => {
      setIsAnimating(true);
      const randomMove = danceMoves[Math.floor(Math.random() * danceMoves.length)];
      setCurrentMove(randomMove);
      
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 2000);
    };

    // Change dance move every 2-4 seconds
    const interval = setInterval(changeMove, 2000 + Math.random() * 2000);
    changeMove(); // Initial move

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div
        className={cn(
          "relative transition-all duration-500",
          currentMove === "idle" && "animate-pulse",
          currentMove === "bob" && isAnimating && "animate-bounce",
          currentMove === "spin" && isAnimating && "animate-spin",
          currentMove === "jump" && isAnimating && "animate-bounce scale-110",
          currentMove === "wiggle" && isAnimating && "animate-pulse"
        )}
        style={{
          animationDuration: currentMove === "spin" ? "1s" : "0.5s",
          transform: currentMove === "wiggle" && isAnimating 
            ? "rotate(-5deg)" 
            : currentMove === "wiggle" && !isAnimating
            ? "rotate(5deg)"
            : undefined,
        }}
      >
        {/* Villager Face - Simple CSS representation */}
        <div className="relative w-32 h-32 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg shadow-lg">
          {/* Eyes */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-4">
            <div className="w-3 h-3 bg-black rounded-full"></div>
            <div className="w-3 h-3 bg-black rounded-full"></div>
          </div>
          
          {/* Nose */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rounded-full"></div>
          
          {/* Mouth */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-8 h-4 border-2 border-black rounded-b-full border-t-0"></div>
          
          {/* Eyebrows */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-4">
            <div className="w-4 h-1 bg-black rounded-full"></div>
            <div className="w-4 h-1 bg-black rounded-full"></div>
          </div>
          
          {/* Robe */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-emerald-700 to-emerald-900 rounded-b-lg"></div>
        </div>
        
        {/* Arms */}
        <div className="absolute top-12 -left-4 w-8 h-3 bg-emerald-700 rounded-full transform -rotate-12"></div>
        <div className="absolute top-12 -right-4 w-8 h-3 bg-emerald-700 rounded-full transform rotate-12"></div>
      </div>
    </div>
  );
}

