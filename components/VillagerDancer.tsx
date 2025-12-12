"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
          currentMove === "bob" && isAnimating && "animate-bounce",
          currentMove === "spin" && isAnimating && "animate-spin",
          currentMove === "jump" && isAnimating && "animate-bounce scale-110"
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
        <Image
          src="/images/villager.png"
          alt="Minecraft Villager"
          width={256}
          height={256}
          className="w-64 h-64 object-contain drop-shadow-lg"
          priority
        />
      </div>
    </div>
  );
}
