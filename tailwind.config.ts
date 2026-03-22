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
        wine: {
          DEFAULT: "#d63031",
          light: "#ff7675",
        },
        sage: {
          DEFAULT: "#00b894",
          light: "#55efc4",
        },
        gold: {
          DEFAULT: "#fdcb6e",
          light: "#ffeaa7",
        },
      },
      fontFamily: {
        sans: ["Albert Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
