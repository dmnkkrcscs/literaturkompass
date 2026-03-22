import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0f0f1a",
          surface: "#1a1a2e",
          accent: "#a29bfe",
        },
        light: {
          bg: "#f8f9fa",
          surface: "#ffffff",
          accent: "#6c5ce7",
        },
        accent: {
          light: "#6c5ce7",
          dark: "#a29bfe",
        },
        wine: { DEFAULT: "#d63031", light: "#ff7675" },
        sage: { DEFAULT: "#00b894", light: "#55efc4" },
        gold: { DEFAULT: "#fdcb6e", light: "#ffeaa7" },
      },
      fontFamily: {
        sans: ["Albert Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderColor: {
        wine: "#d63031",
        sage: "#00b894",
        gold: "#fdcb6e",
      },
    },
  },
  plugins: [],
  safelist: [
    "border-l-wine",
    "border-l-sage",
    "border-l-gold",
    "bg-wine",
    "bg-sage",
    "bg-gold",
    "text-wine",
    "text-sage",
    "text-gold",
    "bg-accent-light",
    "bg-accent-dark",
    "text-accent-light",
    "text-accent-dark",
  ],
};

export default config;
