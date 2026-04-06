import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0a0a0f",
          surface: "#151520",
        },
        light: {
          bg: "#f5f5f7",
          surface: "#ffffff",
        },
        accent: {
          dark: "#ffab40",
          light: "#e65100",
        },
        wine: {
          DEFAULT: "#e57373",
        },
        sage: {
          DEFAULT: "#81c784",
        },
        gold: {
          DEFAULT: "#ffd54f",
        },
      },
      fontFamily: {
        sans: ["var(--font-albert-sans)"],
      },
    },
  },
  plugins: [],
};

export default config;
