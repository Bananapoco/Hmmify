"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type DanceMove = "idle" | "bob" | "spin" | "jump" | "wiggle";

const danceMoves: DanceMove[] = ["idle", "bob", "spin", "jump", "wiggle"];

interface VillagerDancerProps {
  isPlaying?: boolean;
  className?: string;
}

export function VillagerDancer({ isPlaying = false, className }: VillagerDancerProps) {
  // Dancing state
  const [currentMove, setCurrentMove] = useState<DanceMove>("idle");
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Wandering state
  const [positionX, setPositionX] = useState(0); // Percentage -40 to 40
  const [isFacingRight, setIsFacingRight] = useState(false);
  const [isWandering, setIsWandering] = useState(false);
  const [hopState, setHopState] = useState(false);
  const [moveDuration, setMoveDuration] = useState(1000);

  // Refs
  const wanderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hopIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentPosRef = useRef(0); 

  // Dancing Logic
  useEffect(() => {
    if (!isPlaying) {
      setCurrentMove("idle");
      return;
    }

    // Reset wandering state when playing starts
    if (wanderTimeoutRef.current) clearTimeout(wanderTimeoutRef.current);
    if (hopIntervalRef.current) clearInterval(hopIntervalRef.current);
    
    setPositionX(0);
    currentPosRef.current = 0;
    setIsWandering(false);
    setIsFacingRight(false);
    setHopState(false);

    const changeMove = () => {
      setIsAnimating(true);
      const randomMove = danceMoves[Math.floor(Math.random() * danceMoves.length)];
      setCurrentMove(randomMove);
      
      setTimeout(() => setIsAnimating(false), 2000);
    };

    const interval = setInterval(changeMove, 2000 + Math.random() * 2000);
    changeMove();

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Wandering Logic (when not playing)
  useEffect(() => {
    if (isPlaying) return;

    const moveVillager = (targetX: number, facingRight: boolean, duration: number) => {
      // Start movement
      setIsFacingRight(facingRight);
      setIsWandering(true);
      setPositionX(targetX);
      setMoveDuration(duration);
      currentPosRef.current = targetX;

      // Start gentle hopping
      const hopInterval = setInterval(() => {
        setHopState(prev => !prev);
      }, 200); // Faster, smaller hops
      hopIntervalRef.current = hopInterval;

      // Stop moving after transition
      setTimeout(() => {
        setIsWandering(false);
        setHopState(false);
        if (hopIntervalRef.current) {
            clearInterval(hopIntervalRef.current);
            hopIntervalRef.current = null;
        }
        scheduleWander(); // Schedule next move loop
      }, duration);
    };

    const scheduleWander = () => {
      const waitTime = 1000 + Math.random() * 3000; 

      wanderTimeoutRef.current = setTimeout(() => {
        const newX = Math.floor(Math.random() * 80) - 40;
        const movingRight = newX > currentPosRef.current;
        
        // Calculate duration based on distance
        const distance = Math.abs(newX - currentPosRef.current);
        // Ensure minimum duration so short moves aren't too fast
        const duration = Math.max(1000, distance * 30); 

        moveVillager(newX, movingRight, duration);

      }, waitTime);
    };

    scheduleWander();

    return () => {
      if (wanderTimeoutRef.current) clearTimeout(wanderTimeoutRef.current);
      if (hopIntervalRef.current) clearInterval(hopIntervalRef.current);
    };
  }, [isPlaying]);

  return (
    <div className={cn("relative flex items-center justify-center w-full h-full", className)}>
      <div
        className={cn(
          "relative transition-all ease-linear", // Use linear for X movement to avoid ease-in/out stopping the feel of walking
          // Dance animations
          isPlaying && currentMove === "bob" && isAnimating && "animate-bounce",
          isPlaying && currentMove === "spin" && isAnimating && "animate-spin",
          isPlaying && currentMove === "jump" && isAnimating && "animate-bounce scale-110"
        )}
        style={{
          // Main wrapper handles X position
          transform: `
            translateX(${isPlaying ? 0 : positionX}%) 
            ${isPlaying && currentMove === "wiggle" && isAnimating ? "rotate(-5deg)" : ""}
            ${isPlaying && currentMove === "wiggle" && !isAnimating ? "rotate(5deg)" : ""}
          `,
          transitionDuration: isPlaying ? "0.5s" : `${moveDuration}ms`,
        }}
      >
         {/* Inner wrapper handles Y-axis hopping independently + FLIPPING */}
         <div 
            className="transition-transform duration-200 ease-in-out"
            style={{
                // Apply ScaleX here so it's not affected by the long transition duration of the parent
                transform: `
                    translateY(${!isPlaying && isWandering && hopState ? "-10px" : "0"}) 
                    scaleX(${!isPlaying && isFacingRight ? -1 : 1})
                `
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
    </div>
  );
}
