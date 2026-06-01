"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";

import ParticleBackground from "@/components/particle-background";
import WaveBackground from "@/components/WaveBackground";

const TRANSITION_PHRASES = [
  "Generating cryptographic keys...",
  "Allocating secure database shard...",
  "Waking up Celery background workers...",
  "Establishing strict multi-tenant boundaries...",
  "Entering AEPP Dashboard...",
];

const HOW_IT_WORKS_STEPS = [
  {
    kicker: "Step 01",
    title: "Create the workspace",
    description:
      "Enter the organization details first so the system can create the workspace and lock the upload flow to that tenant.",
    metric: "01. Intake",
  },
  {
    kicker: "Step 02",
    title: "Edit roster and salary data",
    description:
      "Review the roster and payment rows in the editor, add or remove entries, and download a clean sample CSV when needed.",
    metric: "02. Edit",
  },
  {
    kicker: "Step 03",
    title: "Preview and dispatch payroll",
    description:
      "Generate the preview, verify the salary slip contents, and then dispatch the batch to the background workers.",
    metric: "03. Send",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AMBIENT WAVE LAYERS
// ─────────────────────────────────────────────────────────────────────────────

function AmbientWaves() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          top: "8%",
          left: 0,
          width: "110%",
          opacity: 0.045,
          animation: "waveDrift1 18s ease-in-out infinite alternate",
        }}
      >
        <path
          d="M0,160 C180,80 360,240 540,160 C720,80 900,240 1080,160 C1260,80 1380,200 1440,160 L1440,320 L0,320 Z"
          fill="white"
        />
      </svg>
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          top: "35%",
          left: "-5%",
          width: "115%",
          opacity: 0.03,
          animation: "waveDrift2 13s ease-in-out infinite alternate",
        }}
      >
        <path
          d="M0,200 C200,100 400,280 600,200 C800,120 1000,300 1200,200 C1340,140 1400,220 1440,200 L1440,320 L0,320 Z"
          fill="white"
        />
      </svg>
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          bottom: "5%",
          left: 0,
          width: "120%",
          opacity: 0.04,
          animation: "waveDrift3 22s ease-in-out infinite alternate",
        }}
      >
        <path
          d="M0,120 C240,60 480,220 720,120 C960,20 1200,180 1440,100 L1440,320 L0,320 Z"
          fill="white"
        />
      </svg>
      <svg
        viewBox="0 0 800 600"
        style={{
          position: "absolute",
          top: "-80px",
          right: "-60px",
          width: "55%",
          opacity: 0.035,
          animation: "waveDrift1 26s ease-in-out infinite alternate",
        }}
      >
        <path d="M800,0 C600,100 500,300 300,250 C100,200 0,400 -100,600" fill="none" stroke="white" strokeWidth="1.5" />
        <path d="M750,0 C550,120 450,320 250,270 C50,220 -50,420 -150,620" fill="none" stroke="white" strokeWidth="0.8" />
      </svg>
      <svg
        viewBox="0 0 600 800"
        style={{
          position: "absolute",
          top: "42%",
          right: "-80px",
          width: "38%",
          opacity: 0.04,
          animation: "waveDrift2 20s ease-in-out infinite alternate",
        }}
      >
        <ellipse cx="500" cy="400" rx="380" ry="500" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="500" cy="400" rx="280" ry="380" fill="none" stroke="white" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARALLAX PARTICLE FIELD
// ─────────────────────────────────────────────────────────────────────────────

function ParallaxParticles({ motionMode }: { motionMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionRef = useRef(motionMode);
  const rafRef = useRef<number | null>(null);

  useEffect(() => { motionRef.current = motionMode; }, [motionMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 60;
    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      baseVx: number; baseVy: number;
      r: number; alpha: number;
    };
    const particles: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      baseVx: (Math.random() - 0.5) * 0.3,
      baseVy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.4,
      alpha: Math.random() * 0.35 + 0.05,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const motion = motionRef.current;

      particles.forEach((p) => {
        const targetVx = motion ? p.baseVx * 4 + 0.8 : p.baseVx;
        const targetVy = motion ? Math.abs(p.baseVy) * 3 + 0.6 : p.baseVy;
        p.vx += (targetVx - p.vx) * 0.04;
        p.vy += (targetVy - p.vy) * 0.04;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -2) p.x = canvas.width + 2;
        if (p.x > canvas.width + 2) p.x = -2;
        if (p.y < -2) p.y = canvas.height + 2;
        if (p.y > canvas.height + 2) p.y = -2;

        if (motion && (Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 0.5)) {
          ctx.beginPath();
          ctx.moveTo(p.x - p.vx * 6, p.y - p.vy * 6);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(255,255,255,${p.alpha * 0.6})`;
          ctx.lineWidth = p.r * 0.8;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${motion ? p.alpha * 1.6 : p.alpha})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2,
        transition: "opacity 0.8s",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM CURSOR
// ─────────────────────────────────────────────────────────────────────────────

function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -200, y: -200 });
  const currentRef = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", move);

    const animate = () => {
      currentRef.current.x += (posRef.current.x - currentRef.current.x) * 0.14;
      currentRef.current.y += (posRef.current.y - currentRef.current.y) * 0.14;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${currentRef.current.x - 7}px, ${currentRef.current.y - 7}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", move);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 0 10px 4px rgba(255,255,255,0.55), 0 0 28px 10px rgba(255,255,255,0.18)",
        pointerEvents: "none",
        zIndex: 10000,
        willChange: "transform",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL LINE + BRANCH
// ─────────────────────────────────────────────────────────────────────────────

function ScrollCurveLine({
  progress,
  anchorRef,
  enableBranching,
  showUserIcon,
  showMailIcon,
}: {
  progress: number;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  enableBranching: boolean;
  showUserIcon: boolean;
  showMailIcon: boolean;
}) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLen, setPathLen] = useState(0);
  const [dotPos, setDotPos] = useState<{ x: number; y: number } | null>(null);
  const [svgH, setSvgH] = useState(900);

  useEffect(() => {
    const update = () => {
      if (anchorRef.current) setSvgH(anchorRef.current.scrollHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    if (anchorRef.current) ro.observe(anchorRef.current);
    return () => ro.disconnect();
  }, [anchorRef]);

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, [svgH]);

  const W = 600;
  const cx = 300;
  const y0 = 0;
  const y1 = svgH * 0.33;
  const y2 = svgH * 0.66;
  const y3 = svgH * 0.88;

  const d = [
    `M ${cx} ${y0}`,
    `C ${cx + 28} ${y0 + svgH * 0.09}, ${cx - 28} ${y1 - svgH * 0.09}, ${cx} ${y1}`,
    `C ${cx + 28} ${y1 + svgH * 0.09}, ${cx - 28} ${y2 - svgH * 0.09}, ${cx} ${y2}`,
    `C ${cx + 28} ${y2 + svgH * 0.08}, ${cx - 18} ${y3 - svgH * 0.05}, ${cx} ${y3}`,
  ].join(" ");

  const branchStart = 0.85;
  const branchSpan = 0.11;
  const rawBranchP = Math.max(0, Math.min(1, (progress - branchStart) / branchSpan));
  const branchP = enableBranching ? rawBranchP : 0;

  const trunkProgress = branchP > 0 ? branchStart : Math.min(progress, 1);
  const drawn = pathLen * trunkProgress;
  const dashoffset = pathLen - drawn;

  useEffect(() => {
    if (!pathRef.current || pathLen === 0) return;
    const safe = Math.max(0, Math.min(drawn, pathLen - 0.1));
    const pt = pathRef.current.getPointAtLength(safe);
    setDotPos({ x: pt.x, y: pt.y });
  }, [drawn, pathLen]);

  const branchEased = 1 - Math.pow(1 - branchP, 3);
  const maxBranch = 400;
  const branchDropY = 70;
  const iconP = Math.max(0, Math.min(1, (progress - 0.92) / 0.08));

  const dotX = dotPos?.x ?? cx;
  const dotY = dotPos?.y ?? y3;
  const leftTipX = cx - maxBranch * branchEased;
  const leftTipY = dotY + branchDropY * branchEased;
  const rightTipX = cx + maxBranch * branchEased;
  const rightTipY = dotY + branchDropY * branchEased;

  const leftBranchD = `M ${dotX} ${dotY} C ${dotX - 40} ${dotY + 20}, ${leftTipX + 30} ${leftTipY - 20}, ${leftTipX} ${leftTipY}`;
  const rightBranchD = `M ${dotX} ${dotY} C ${dotX + 40} ${dotY + 20}, ${rightTipX - 30} ${rightTipY - 20}, ${rightTipX} ${rightTipY}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${svgH + 160}`}
      preserveAspectRatio="xMidYMin meet"
      overflow="visible"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        transform: "translateX(-50%)",
        width: W,
        height: svgH + 160,
        pointerEvents: "none",
        zIndex: 20,
        overflow: "visible",
      }}
    >
      <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round" />
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={pathLen || 9999}
        strokeDashoffset={dashoffset}
      />
      {branchEased > 0 && (
        <>
          <path d={leftBranchD} fill="none" stroke={`rgba(255,255,255,${0.75 * branchEased})`} strokeWidth="1.5" strokeLinecap="round" />
          <path d={rightBranchD} fill="none" stroke={`rgba(255,255,255,${0.75 * branchEased})`} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={leftTipX} cy={leftTipY} r="10" fill="none" stroke={`rgba(255,255,255,${branchEased * 0.15})`} strokeWidth="10" />
          <circle cx={leftTipX} cy={leftTipY} r="3" fill={`rgba(255,255,255,${branchEased * 0.9})`} style={{ filter: `drop-shadow(0 0 6px rgba(255,255,255,${branchEased}))` }} />
          <circle cx={rightTipX} cy={rightTipY} r="10" fill="none" stroke={`rgba(255,255,255,${branchEased * 0.15})`} strokeWidth="10" />
          <circle cx={rightTipX} cy={rightTipY} r="3" fill={`rgba(255,255,255,${branchEased * 0.9})`} style={{ filter: `drop-shadow(0 0 6px rgba(255,255,255,${branchEased}))` }} />
        </>
      )}
      {showUserIcon && iconP > 0 && (
        <g transform={`translate(${leftTipX - 16}, ${leftTipY + 8})`} opacity={iconP} style={{ filter: `drop-shadow(0 0 8px rgba(255,255,255,${iconP * 0.7}))` }}>
          <circle cx="16" cy="8" r="6.5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" />
          <path d="M1,28 Q1,17 16,17 Q31,17 31,28" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinecap="round" />
          <text x="16" y="44" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.45)" fontFamily="sans-serif" letterSpacing="0.08em">EMPLOYEE</text>
        </g>
      )}
      {showMailIcon && iconP > 0 && (
        <g transform={`translate(${rightTipX - 16}, ${rightTipY + 8})`} opacity={iconP} style={{ filter: `drop-shadow(0 0 8px rgba(255,255,255,${iconP * 0.7}))` }}>
          <rect x="0" y="0" width="32" height="22" rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" />
          <polyline points="0,0 16,13 32,0" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinejoin="round" />
          <text x="16" y="38" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.45)" fontFamily="sans-serif" letterSpacing="0.08em">PAYSLIP</text>
        </g>
      )}
      {dotPos && branchP === 0 && (
        <circle cx={dotPos.x} cy={dotPos.y} r="4" fill="white" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,1)) drop-shadow(0 0 18px rgba(255,255,255,0.6))" }} />
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXED NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────

function FixedNavigator({ activeIndex, visible }: { activeIndex: number; visible: boolean; }) {
  const step = HOW_IT_WORKS_STEPS[activeIndex];

  return (
    <div
      style={{
        position: "fixed",
        top: "56%",
        left: "max(24px, calc(50vw - 576px + 24px))",
        transform: visible ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(-16px)",
        width: "clamp(220px, 22vw, 290px)",
        zIndex: 40,
        transition: "opacity 0.4s ease, transform 0.4s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(9,9,11,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "24px",
          boxShadow: "0 0 80px rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ height: 1.5, background: "rgba(255,255,255,0.1)", borderRadius: 999, marginBottom: 20, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              background: "white",
              borderRadius: 999,
              width: `${((activeIndex + 1) / HOW_IT_WORKS_STEPS.length) * 100}%`,
              transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.32em", color: "rgb(113,113,122)", marginBottom: 12 }}>
          Live Step
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "4px 12px", fontSize: 12, color: "rgb(212,212,216)", marginBottom: 16 }}>
          <span style={{ height: 6, width: 6, borderRadius: "50%", background: "white", boxShadow: "0 0 8px rgba(255,255,255,0.8)", display: "inline-block" }} />
          {step.metric}
        </div>
        <h3 key={`nav-title-${activeIndex}`} style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "white", marginBottom: 8, lineHeight: 1.25, animation: "navFadeUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards" }}>
          {step.title}
        </h3>
        <p key={`nav-desc-${activeIndex}`} style={{ color: "rgb(161,161,170)", lineHeight: 1.6, fontSize: 12, animation: "navFadeUp 0.35s 0.05s cubic-bezier(0.22,1,0.36,1) forwards", opacity: 0 }}>
          {step.description}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {HOW_IT_WORKS_STEPS.map((_, i) => (
            <div key={i} style={{ height: 2, width: i === activeIndex ? 24 : 8, borderRadius: 999, background: i === activeIndex ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)", transition: "width 0.4s cubic-bezier(0.22,1,0.36,1), background 0.4s" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  
  // NEW: Toggle between Create Workspace and Login Workspace
  const [isLoginMode, setIsLoginMode] = useState(false);

  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [visibleCards, setVisibleCards] = useState<boolean[]>(HOW_IT_WORKS_STEPS.map(() => false));
  const [motionMode, setMotionMode] = useState(false);
  const [navigatorVisible, setNavigatorVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const storyZoneRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rightColumnRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isTransitioning) return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => Math.min(prev + 1, TRANSITION_PHRASES.length - 1));
    }, 700);
    return () => clearInterval(interval);
  }, [isTransitioning]);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const vhMid = window.innerHeight / 2;

      if (sectionRef.current) {
        const r = sectionRef.current.getBoundingClientRect();
        const inView = r.top < window.innerHeight * 0.85 && r.bottom > window.innerHeight * 0.15;
        setMotionMode(inView);

        const firstCardRect = storyZoneRefs.current[0]?.getBoundingClientRect();
        const lastCardRect = storyZoneRefs.current[HOW_IT_WORKS_STEPS.length - 1]?.getBoundingClientRect();

        const cardsStarted = firstCardRect ? firstCardRect.top < window.innerHeight * 0.62 : false;
        const beforeLastCardPass = lastCardRect ? lastCardRect.bottom > window.innerHeight * 0.58 : false;

        setNavigatorVisible(!isMobile && cardsStarted && beforeLastCardPass);
      }

      let closestIdx = 0;
      let closestDist = Infinity;
      storyZoneRefs.current.forEach((zone, i) => {
        if (!zone) return;
        const rect = zone.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - vhMid);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      });
      setActiveStoryIndex(closestIdx);

      setVisibleCards(
        storyZoneRefs.current.map((zone) => {
          if (!zone) return false;
          const rect = zone.getBoundingClientRect();
          return rect.top < window.innerHeight * 0.88;
        })
      );

      const col = rightColumnRef.current;
      if (col) {
        const rect = col.getBoundingClientRect();
        const total = rect.height + window.innerHeight;
        const scrolled = window.innerHeight - rect.top;
        setLineProgress(Math.max(0, Math.min(1, scrolled / total)));
      }
    });
  }, [isMobile]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  // Handle Workspace Creation
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const response = await fetch(apiUrl("/api/organizations/"), {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to provision organization. Check backend connection.");
      const data = await response.json();
      localStorage.setItem("aepp_org_id", data.id);
      setIsLoading(false);
      setIsTransitioning(true);
      setTimeout(() => router.push("/dashboard"), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  // Handle Workspace Login
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const response = await fetch(apiUrl("/api/organizations/login"), {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || "Failed to find workspace.");
      }
      const data = await response.json();
      localStorage.setItem("aepp_org_id", data.id);
      setIsLoading(false);
      setIsTransitioning(true);
      setTimeout(() => router.push("/dashboard"), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  if (isTransitioning) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative w-20 h-20 mb-10">
          <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-white animate-spin" />
          <div className="absolute inset-3 rounded-full border-r-2 border-b-2 border-zinc-500 animate-spin duration-700" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
        <div className="h-8 flex items-center justify-center overflow-hidden">
          <p key={phraseIndex} className="text-zinc-300 font-medium tracking-wide animate-in slide-in-from-bottom-2 fade-in duration-200">
            {TRANSITION_PHRASES[phraseIndex]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
          overflow-x: hidden;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
        * { cursor: none !important; }

        @media (hover: none), (pointer: coarse) {
          html, body, * {
            cursor: auto !important;
          }
        }

        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-enter { animation: cardEnter 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
        .card-hidden { opacity: 0; transform: translateY(28px); }

        @keyframes navFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes waveDrift1 {
          from { transform: translateX(0) scaleY(1); }
          to   { transform: translateX(-40px) scaleY(1.08); }
        }
        @keyframes waveDrift2 {
          from { transform: translateX(0) scaleY(1); }
          to   { transform: translateX(50px) scaleY(0.94); }
        }
        @keyframes waveDrift3 {
          from { transform: translateX(-20px) scaleY(1); }
          to   { transform: translateX(30px) scaleY(1.1); }
        }
      `}</style>

      {!isMobile && <CustomCursor />}
      <ParallaxParticles motionMode={motionMode} />

      {/* Fixed navigator — floats at 50vh, left-aligned to the left column */}
      {!isMobile && <FixedNavigator activeIndex={activeStoryIndex} visible={navigatorVisible} />}

      <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-white/20 relative overflow-x-hidden">

        <div className="absolute inset-0 z-0 pointer-events-none">
          <ParticleBackground />
          <WaveBackground />
          <AmbientWaves />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
        </div>

        {/* Navbar */}
        <nav className="w-full border-b border-white/5 bg-black/40 backdrop-blur-xl fixed top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-center">
            <Image src="/logo.png" alt="AEPP Enterprise" width={280} height={72} loading="eager" priority className="h-50 w-auto object-contain" />
          </div>
        </nav>

        <main className="relative z-20 pt-40 pb-8 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">

          {/* Hero */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-6 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            Automated Enterprise
            <br className="hidden md:block" />
            Payroll Pipeline
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-16 leading-relaxed">
            Securely process thousands of highly confidential salary slips in seconds.
            Built on Next.js, FastAPI, and Celery for ultimate scale.
          </p>

          {/* Video */}
          <div className="w-full max-w-5xl aspect-video bg-[#09090b]/90 border border-white/10 rounded-[24px] overflow-hidden relative flex items-center justify-center mb-32 shadow-[0_0_100px_rgba(255,255,255,0.04)] backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.02] z-10" />
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80">
              <source src="/demo-vid.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/20 z-10" />
            <div className="absolute bottom-8 left-8 z-20">
              <p className="text-white/40 text-xs uppercase tracking-[0.3em] font-medium">AEPP Engine Preview</p>
            </div>
          </div>

          {/* ══════════════════ HOW IT WORKS ══════════════════ */}
          <section ref={sectionRef} className="w-full max-w-6xl mb-28 text-left">

            <div className="mb-16 max-w-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 mb-3">How It Works</p>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">
                Walkthrough of the steps.
              </h2>
              <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-xl">
                Scroll through the process — the left panel tracks where you are while the narrative shifts with each stage.
              </p>
            </div>

            <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-16 items-start">

              {/* Desktop left column spacer — the fixed navigator floats here */}
              <div className="hidden lg:block" aria-hidden="true" />

              {/* RIGHT: scrolling cards + SVG line */}
              <div
                ref={rightColumnRef}
                className="flex flex-col gap-6"
                style={{ position: "relative", overflow: "visible" }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 0,
                    height: "100%",
                    overflow: "visible",
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                >
                  <ScrollCurveLine
                    progress={lineProgress}
                    anchorRef={rightColumnRef}
                    enableBranching={!isMobile}
                    showUserIcon={!isMobile}
                    showMailIcon={true}
                  />
                </div>

                {HOW_IT_WORKS_STEPS.map((step, index) => {
                  const isLast = index === HOW_IT_WORKS_STEPS.length - 1;
                  const isActive = index === activeStoryIndex;
                  const isVisible = visibleCards[index];

                  return (
                    <div
                      key={step.kicker}
                      ref={(el: HTMLDivElement | null) => { storyZoneRefs.current[index] = el; }}
                      className={isVisible ? "card-enter" : "card-hidden"}
                      style={{ animationDelay: `${index * 0.07}s` }}
                    >
                      <article
                        className={`w-full relative overflow-hidden rounded-[24px] border transition-all duration-500 ${
                          isActive
                            ? "border-white/[0.18] bg-white/[0.05]"
                            : "border-white/[0.06] bg-[#09090b]/60"
                        }`}
                      >
                        <div
                          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                          style={{
                            opacity: isActive ? 1 : 0,
                            background: "radial-gradient(ellipse at 60% 0%, rgba(255,255,255,0.05) 0%, transparent 65%)",
                          }}
                        />
                        <div className="relative p-6 md:p-8">
                          <div className="flex items-center justify-between mb-6">
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-zinc-400">
                              {step.kicker}
                            </span>
                            <div
                              className="h-2 w-2 rounded-full transition-all duration-500"
                              style={{
                                background: isActive ? "white" : "rgba(255,255,255,0.12)",
                                boxShadow: isActive ? "0 0 12px rgba(255,255,255,0.9)" : "none",
                              }}
                            />
                          </div>
                          <h3 className="text-xl md:text-3xl font-semibold tracking-tight text-white mb-3">
                            {step.title}
                          </h3>
                          <p
                            className="text-zinc-400 text-sm md:text-base leading-relaxed"
                            style={{ opacity: isActive ? 1 : 0.55, transition: "opacity 0.5s" }}
                          >
                            {step.description}
                          </p>
                          <div className="flex items-center justify-between gap-4 pt-5 mt-5 border-t border-white/[0.07]">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                              {isLast ? "All steps complete" : "Scroll to continue"}
                            </p>
                            <div className="h-px flex-1 mx-3 bg-gradient-to-r from-white/12 via-white/4 to-transparent" />
                            <p className="text-xs text-zinc-500">{step.metric}</p>
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>

            </div>
          </section>

          {/* ══════════════════ FORM ══════════════════ */}
          <div
            id="get-started"
            className="w-full max-w-2xl text-left bg-[#09090b]/80 border border-white/10 rounded-[24px] p-8 md:p-12 backdrop-blur-xl"
          >
            {/* Form Header */}
            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">
                  {isLoginMode ? "Workspace Login" : "Get Started"}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {isLoginMode 
                    ? "Enter your company name to access your dashboard." 
                    : "Configure your enterprise workspace to begin processing."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setError(null);
                }}
                className="text-xs text-zinc-500 hover:text-white px-0 md:px-4"
              >
                {isLoginMode ? "Need to create a workspace?" : "Already have a workspace?"}
              </Button>
            </div>

            {/* Conditional Form Rendering */}
            {isLoginMode ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="bg-[#121214]/70 border border-white/5 p-6 rounded-[20px]">
                  <div className="space-y-2.5">
                    <label htmlFor="login-name" className="text-sm font-medium text-zinc-200">
                      Company Name <span className="text-zinc-500">*</span>
                    </label>
                    <Input id="login-name" name="name" required placeholder="e.g., Wayne Enterprises"
                      className="bg-white/5 border-transparent text-zinc-100 placeholder:text-zinc-600 rounded-xl h-12 focus-visible:ring-1 focus-visible:ring-white/20 px-4" />
                  </div>
                </div>
                
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={isLoading}
                  className="w-full bg-white text-black hover:bg-zinc-200 rounded-full font-medium h-12 transition-all duration-200 text-base">
                  {isLoading ? "Locating..." : "Enter Workspace"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 bg-[#121214]/70 border border-white/5 p-6 rounded-[20px]">
                  <div className="space-y-2.5">
                    <label htmlFor="name" className="text-sm font-medium text-zinc-200">
                      Company Name <span className="text-zinc-500">*</span>
                    </label>
                    <Input id="name" name="name" required placeholder="e.g., Wayne Enterprises"
                      className="bg-white/5 border-transparent text-zinc-100 placeholder:text-zinc-600 rounded-xl h-12 focus-visible:ring-1 focus-visible:ring-white/20 px-4" />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="address" className="text-sm font-medium text-zinc-200">Headquarters Address</label>
                    <Input id="address" name="address" placeholder="e.g., 1007 Mountain Drive, Gotham"
                      className="bg-white/5 border-transparent text-zinc-100 placeholder:text-zinc-600 rounded-xl h-12 focus-visible:ring-1 focus-visible:ring-white/20 px-4" />
                  </div>
                </div>

                <div className="grid gap-6 bg-[#121214]/70 border border-white/5 p-6 rounded-[20px]">
                  <div className="space-y-2.5">
                    <label htmlFor="custom_message" className="text-sm font-medium text-zinc-200">Custom Footer Message</label>
                    <Input id="custom_message" name="custom_message" placeholder="e.g., Happy Holidays from the Board of Directors."
                      className="bg-white/5 border-transparent text-zinc-100 placeholder:text-zinc-600 rounded-xl h-12 focus-visible:ring-1 focus-visible:ring-white/20 px-4" />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="logo" className="text-sm font-medium text-zinc-200 flex justify-between items-center">
                      <span>Company Logo</span>
                      <span className="text-xs text-zinc-500 font-normal">PNG or JPG</span>
                    </label>
                    <Input id="logo" name="logo" type="file" accept="image/png, image/jpeg"
                      className="bg-white/5 border-transparent text-zinc-400 h-12 rounded-xl file:bg-white/10 file:text-zinc-200 file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-lg hover:file:bg-white/20 pt-2.5 px-3 focus-visible:ring-1 focus-visible:ring-white/20" />
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={isLoading}
                  className="w-full bg-white text-black hover:bg-zinc-200 rounded-full font-medium h-12 transition-all duration-200 text-base">
                  {isLoading ? "Validating..." : "Create Workspace & Continue"}
                </Button>
              </form>
            )}
          </div>

        </main>
      </div>
    </>
  );
}