import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette: black (ink) leads, orange (accent) highlights, warm whites carry the page.
        // Keep orange to accents — CTAs, active states, icons — never large fills.
        background: "#FAFAF8",
        surface: "#FFFFFF",
        paper: "#FAFAF8",
        sand: {
          DEFAULT: "#F3F1EE",
          deep: "#E7E3DE",
        },
        ink: {
          DEFAULT: "#121212",
          soft: "#2A2A2A",
          deep: "#0A0A0A",
        },
        accent: {
          DEFAULT: "#EA580C",
          hover: "#C2410C",
          bright: "#FB923C",
          soft: "#FFF4EC",
          muted: "#FFE1CC",
        },
        // Legacy names, mapped onto the palette above.
        primary: {
          DEFAULT: "#121212",
          hover: "#2A2A2A",
          light: "#FFF4EC",
          dark: "#0A0A0A",
        },
        lime: {
          brand: "#FB923C",
          light: "#FFF4EC",
        },
        cta: {
          DEFAULT: "#EA580C",
          hover: "#C2410C",
          light: "#FFF4EC",
        },
        macro: {
          protein: "#16A34A",
          proteinBg: "#DCFCE7",
          proteinBorder: "#86EFAC",
          carbs: "#D97706",
          carbsBg: "#FEF3C7",
          carbsBorder: "#FDE68A",
          fat: "#9333EA",
          fatBg: "#F3E8FF",
          fatBorder: "#D8B4FE",
          calories: "#EA580C",
          caloriesBg: "#FFEDD5",
          caloriesBorder: "#FDBA74",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        heading: ["'Plus Jakarta Sans'", "var(--font-jakarta)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
        "card-hover": "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        float: "0 20px 30px -10px rgba(18, 18, 18, 0.15)",
        menu: "0 24px 60px -12px rgba(18, 18, 18, 0.18), 0 2px 6px rgba(18, 18, 18, 0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
