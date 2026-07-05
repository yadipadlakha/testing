import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f6",
          100: "#d3ebe8",
          200: "#a7d7d1",
          300: "#72bcb4",
          400: "#469b93",
          500: "#2c7d76",
          600: "#22645f",
          700: "#1e504d",
          800: "#1b413f",
          900: "#193735",
        },
      },
    },
  },
  plugins: [],
};

export default config;
