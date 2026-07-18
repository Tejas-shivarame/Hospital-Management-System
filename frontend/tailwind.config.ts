import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0F6E5C",   // clinical teal — trust + calm, not generic blue
          foreground: "#F5FBF9",
        },
        accent: {
          DEFAULT: "#E8873A",   // warm amber — used sparingly for alerts/CTAs
          foreground: "#1A1300",
        },
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        danger: "#C4442E",
        success: "#1E8A5F",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
