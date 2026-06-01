"use client";

import { ReactLenis } from '@studio-freight/react-lenis';
import React from 'react';

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ 
      lerp: 0.07,
      duration: 1.5, 
      smoothWheel: true 
    }}>
      {/* Casting to 'any' to silence the React 18 vs 19 type mismatch */}
      {children as any}
    </ReactLenis>
  );
}