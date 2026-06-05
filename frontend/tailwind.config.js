// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors
        "neon-cyan":              "#00F0FF",
        "surface":                "#101319",
        "surface-dark":           "#12151B",
        "surface-container":      "#1d2026",
        "surface-container-low":  "#191c22",
        "surface-container-high": "#272a30",
        "surface-container-lowest": "#0b0e14",
        "surface-elevated":       "#232A35",
        "surface-variant":        "#32353b",
        "on-surface":             "#e1e2eb",
        "on-surface-variant":     "#c2c6d6",
        "primary":                "#adc6ff",
        "primary-container":      "#1772eb",
        "on-primary-container":   "#ffffff",
        "outline":                "#8c90a0",
        "outline-variant":        "#414754",
        "glass-border":           "rgba(255, 255, 255, 0.12)",
        "tertiary":               "#c0c1ff",
      },
      fontFamily: {
        display:   ["Hanken Grotesk", "sans-serif"],
        headline:  ["Hanken Grotesk", "sans-serif"],
        body:      ["Inter", "sans-serif"],
        mono:      ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};