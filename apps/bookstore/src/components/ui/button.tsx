import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90 hover:text-white",
        destructive: "bg-destructive text-white hover:bg-destructive/90 hover:text-white",
        outline: "border border-input bg-background hover:bg-primary hover:text-white",
        secondary: "bg-secondary text-white hover:bg-secondary/80 hover:text-white",
        ghost: "hover:bg-accent hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded px-3",
        lg: "h-11 rounded px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  liquidGlass?: boolean;
    style?: React.CSSProperties;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, liquidGlass = true, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // Variants with background colors should have white text
    const hasBgColor = variant === 'default' || variant === 'destructive' || variant === 'secondary';
    const glassClass = liquidGlass
      ? `backdrop-blur-md shadow border border-white/30 ${hasBgColor ? 'text-white' : 'bg-white/30 text-black'}`
      : "";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), glassClass)}
        ref={ref}
        style={
          {
            ...style,
            ...(liquidGlass && {
              WebkitBackdropFilter: 'blur(20px)',
            
            }),
          }
        }
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
