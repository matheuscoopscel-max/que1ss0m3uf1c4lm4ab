// FILE: frontend/tailwind.config.js — Patch #15
// Expandido: novas animações, paleta de temas, utilitários de scroll.

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        om: {
          bg:           "#0a0a0f",
          surface:      "#111118",
          card:         "#16161f",
          border:       "#22222e",
          accent:       "#e8841a",
          "accent-dim": "#b8651a",
          "accent-glow":"rgba(232,132,26,0.15)",
          text:         "#e8e8f0",
          muted:        "#7a7a8a",
          danger:       "#e84040",
          safe:         "#40c070",
        },
        // Tema claro (para Patch futuro)
        light: {
          bg:      "#f5f5f8",
          surface: "#ffffff",
          card:    "#f0f0f5",
          border:  "#dddde8",
          text:    "#1a1a2e",
          muted:   "#7a7a8a",
        },
      },
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in-fast": {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        "slide-up": {
          from: { opacity: 0, transform: "translateY(24px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
        "slide-left": {
          from: { opacity: 0, transform: "translateX(16px)" },
          to:   { opacity: 1, transform: "translateX(0)" },
        },
        "slide-right": {
          from: { opacity: 0, transform: "translateX(-16px)" },
          to:   { opacity: 1, transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.95)" },
          to:   { opacity: 1, transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(232,132,26,0)" },
          "50%":       { boxShadow: "0 0 16px 4px rgba(232,132,26,0.3)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        "hero-fade": {
          "0%":   { opacity: 0, transform: "scale(1.03)" },
          "10%":  { opacity: 1, transform: "scale(1)" },
          "90%":  { opacity: 1, transform: "scale(1)" },
          "100%": { opacity: 0, transform: "scale(0.98)" },
        },
        "stagger-1": {
          from: { opacity: 0, transform: "translateY(12px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
        "stagger-2": {
          from: { opacity: 0, transform: "translateY(12px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
        "stagger-3": {
          from: { opacity: 0, transform: "translateY(12px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in":      "fade-in 0.3s ease forwards",
        "fade-in-fast": "fade-in-fast 0.15s ease forwards",
        "slide-up":     "slide-up 0.4s ease forwards",
        "slide-left":   "slide-left 0.3s ease forwards",
        "slide-right":  "slide-right 0.3s ease forwards",
        "scale-in":     "scale-in 0.2s ease forwards",
        "pulse-glow":   "pulse-glow 2s ease infinite",
        shimmer:        "shimmer 1.8s linear infinite",
        "hero-fade":    "hero-fade 8s ease-in-out forwards",
        "stagger-1":    "stagger-1 0.4s ease 0.05s both",
        "stagger-2":    "stagger-2 0.4s ease 0.1s both",
        "stagger-3":    "stagger-3 0.4s ease 0.15s both",
      },
      transitionTimingFunction: {
        "spring":  "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "smooth":  "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
