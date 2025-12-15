"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Updated dance moves based on user request
type DanceMove = "bounce" | "squash_stretch" | "spin_360" | "rock" | "gravity_flip" | "spin_circle";

const danceMoves: DanceMove[] = ["bounce", "squash_stretch", "spin_360", "rock", "gravity_flip", "spin_circle"];

interface VillagerDancerProps {
  isPlaying?: boolean;
  hasMic?: boolean;
  className?: string;
}

export function VillagerDancer({ isPlaying = false, hasMic = false, className }: VillagerDancerProps) {
  // Dancing state
  const [currentMove, setCurrentMove] = useState<DanceMove>("bounce");
  
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
      // When not playing, ensure we're not animating
      setCurrentMove("bounce"); // Reset to default, but won't animate since isPlaying is false
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

    // Immediately set a random move when playing starts (no delay)
    const changeMove = () => {
      const randomMove = danceMoves[Math.floor(Math.random() * danceMoves.length)];
      setCurrentMove(randomMove);
    };

    // Set initial move immediately
    changeMove();

    // Change moves every 2-3 seconds (Randomly, max 3 seconds)
    // We clear the previous interval and set a new timeout to keep it chaotic
    let timeoutId: NodeJS.Timeout;
    
    const loop = () => {
        const nextTime = 2000 + Math.random() * 1000; // 2-3 seconds max
        timeoutId = setTimeout(() => {
            changeMove();
            loop(); // Continue the loop
        }, nextTime);
    };
    
    loop();

    return () => clearTimeout(timeoutId);
  }, [isPlaying]);

  // Wandering Logic (when not playing AND no mic)
  useEffect(() => {
    if (isPlaying || hasMic) {
        // If has mic, ensure we are centered and not wandering
        if (hasMic && !isPlaying) {
            setPositionX(0);
            currentPosRef.current = 0;
            setIsWandering(false);
            setHopState(false);
        }
        return;
    }

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
  }, [isPlaying, hasMic]);

  return (
    <div className={cn("relative flex items-center justify-center w-full h-full", className)}>
      <div
        className={cn(
          "relative",
          // Only apply transition when NOT playing (for wandering), not during animations
          !isPlaying && "transition-transform ease-linear",
          // Tailwind / Custom animations applied to OUTER wrapper
          isPlaying && currentMove === "bounce" && "animate-fast-bounce", // Faster bounce
          isPlaying && currentMove === "spin_360" && "animate-spin",
          isPlaying && currentMove === "spin_circle" && "animate-spin-circle", // Continuous circle spin
          isPlaying && currentMove === "squash_stretch" && "animate-squash", // Extreme squash
          isPlaying && currentMove === "rock" && "animate-rock" // Rock animation
        )}
        style={{
          // Main wrapper handles X position & Rotation based moves
          transform: `
            translateX(${isPlaying || hasMic ? 0 : positionX}%) 
            ${isPlaying && currentMove === "gravity_flip" ? "rotate(180deg)" : ""}
          `,
          transitionDuration: !isPlaying ? `${moveDuration}ms` : undefined, // No transition when playing/animating
        }}
      >
         {/* Inner wrapper handles Y-axis hopping independently + FLIPPING */}
         <div 
            className={cn(
                "transition-transform duration-200 ease-in-out",
                // Rapid Flip Animation for Gravity Flip
                isPlaying && currentMove === "gravity_flip" && "animate-rapid-flip"
            )}
            style={{
                transform: `
                    translateY(${!isPlaying && isWandering && hopState ? "-10px" : "0"}) 
                    scaleX(${!isPlaying && isFacingRight ? -1 : 1})
                `,
            }}
         >
            <Image
            src="/images/villager.png"
            alt="Minecraft Villager"
            width={256}
            height={256}
            className={cn(
                "w-64 h-64 object-contain drop-shadow-lg",
            )}
            priority
            />
        </div>
      </div>
      
      {/* Mic Stand - visible when hasMic is true */}
      {hasMic && (
          // Adjusted: flipped horizontally, scale 80%, moved upward (bottom-8 roughly translates to moving up from 0)
          // right-[28%] to get it closer/next to center
          <div className="absolute bottom-8 right-[28%] w-32 h-64 pointer-events-none z-20 transition-all duration-500"
               style={{ transform: "scale(0.8) scaleX(-1)" }}>
             <Image 
                src="/images/micstand.png" 
                alt="Mic Stand" 
                fill
                className="object-contain object-bottom"
             />
          </div>
      )}
    </div>
  );
}
