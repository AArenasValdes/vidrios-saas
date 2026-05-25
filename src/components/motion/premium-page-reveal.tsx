"use client";

import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type PremiumRevealProps = {
  children: ReactNode;
  className?: string;
} & Omit<
  HTMLAttributes<HTMLDivElement>,
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onAnimationStart"
  | "onDrag"
  | "onDragEnd"
  | "onDragStart"
>;

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function useHydratedMotionReady() {
  const reduceMotion = useReducedMotion();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated && !reduceMotion;
}

export function PremiumPageReveal({
  children,
  className,
  ...props
}: PremiumRevealProps) {
  const motionReady = useHydratedMotionReady();

  if (!motionReady) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.065,
            delayChildren: 0.04,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function PremiumPageSection({
  children,
  className,
  ...props
}: PremiumRevealProps) {
  const motionReady = useHydratedMotionReady();

  if (!motionReady) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={joinClassNames(className)}
      variants={{
        hidden: {
          opacity: 0,
          y: 18,
          scale: 0.992,
          filter: "blur(10px)",
        },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: {
            duration: 0.52,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
