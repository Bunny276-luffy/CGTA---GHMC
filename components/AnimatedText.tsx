"use client";

import React from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
  tag?: "h1" | "h2" | "p" | "span";
}

export default function AnimatedText({ text, className = "", tag = "p" }: AnimatedTextProps) {
  const TagName = tag;
  return <TagName className={className}>{text}</TagName>;
}
