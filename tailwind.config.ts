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
          bg: "#0a0a0f",
          surface: "#151520",
          accent: "#ffab40",
        },
        light: {
          bg: "#f5f5f7",
          surface: "#ffffff",
          accent: "#e65100",
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
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
