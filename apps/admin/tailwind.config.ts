import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fcf8ec",
          100: "#f8eed2",
          300: "#dfbf79",
          500: "#c5a028",
          700: "#896b14",
          900: "#47360b"
        }
      }
    }
  },
  plugins: []
};

export default config;
