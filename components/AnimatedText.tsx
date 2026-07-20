"use client";

import React, { useEffect, useRef, useState } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
  tag?: "h1" | "h2" | "p" | "span";
}

export default function AnimatedText({ text, className = "", tag = "p" }: AnimatedTextProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Unobserve once visible to lock the animation state
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const words = text.split(" ");
  const TagName = tag;

  return (
    <TagName
      ref={containerRef as any}
      className={`inline-flex flex-wrap ${className}`}
    >
      {words.map((word, idx) => (
        <span
          key={idx}
          className="inline-block mr-[0.25em] transition-all duration-700 ease-out transform"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(15px)",
            transitionDelay: `${idx * 40}ms`
          }}
        >
          {word}
        </span>
      ))}
    </TagName>
  );
}
