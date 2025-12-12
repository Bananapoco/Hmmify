import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-mc-heading",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border-b-4 border-black/20 active:border-b-0 active:translate-y-1",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-b-4 border-black/20 active:border-b-0 active:translate-y-1",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground border-b-4 border-black/20 active:border-b-2 active:translate-y-[2px]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-b-4 border-black/20 active:border-b-0 active:translate-y-1",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-2", // Taller for blocky feel
        sm: "h-9 px-3",
        lg: "h-14 px-8",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
