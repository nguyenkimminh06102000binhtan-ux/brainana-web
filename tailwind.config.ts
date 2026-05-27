import type { Config } from "tailwindcss";

const config = {
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      orange: "#F36B2E",
      mango: "#F59A1E",
      ocean: "#C4E7E5",
      blue: "#253C96",
      navy: "#19244E",
      red: "#F36B2E",
      yellow: "#F59A1E",
      green: "#C4E7E5",
      ink: "#19244E",
      paper: "#C4E7E5",
      "paper-2": "#E7F6F5",
      "red-soft": "#FFD6C4",
      "yellow-soft": "#FFE3A6",
      "green-soft": "#DDF1EF",
      "ink-2": "#3D4B72",
      "ink-3": "#7890A0",
    },
    fontFamily: {
      fredoka: ["Fredoka", "sans-serif"],
      manrope: ["Manrope", "sans-serif"],
      kalam: ["Kalam", "cursive"],
      mono: ["JetBrains Mono", "monospace"],
    },
    borderWidth: {
      DEFAULT: "1.5px",
    },
    borderRadius: {
      sm: "14px",
      md: "22px",
      lg: "30px",
      full: "999px",
    },
    boxShadow: {
      none: "none",
      hard: "0 18px 40px #19244E24",
      "hard-sm": "0 10px 24px #19244E1F",
      "hard-red": "0 18px 36px #F36B2E40",
    },
  },
} satisfies Config;

export default config;
