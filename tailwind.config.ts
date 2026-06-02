import type { Config } from "tailwindcss";

const config = {
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFF8E8",
      orange: "#F35B45",
      mango: "#F7C842",
      ocean: "#BFE7D7",
      blue: "#2F6F89",
      navy: "#1B1716",
      red: "#F35B45",
      yellow: "#F7C842",
      green: "#84BD57",
      "electric-pink": "#FF0054",
      "acid-green": "#9EFF00",
      ink: "#1B1716",
      paper: "#FFF3D6",
      "paper-2": "#FFFBEF",
      "red-soft": "#FFD8D0",
      "yellow-soft": "#FFE59B",
      "green-soft": "#DCEFC8",
      "ink-2": "#4F4038",
      "ink-3": "#78675B",
    },
    fontFamily: {
      fredoka: ["Young Typeface", "sans-serif"],
      manrope: ["Young Typeface", "sans-serif"],
      kalam: ["Young Typeface", "sans-serif"],
      mono: ["Young Typeface", "sans-serif"],
      young: ["Young Typeface", "sans-serif"],
    },
    borderWidth: {
      DEFAULT: "2px",
    },
    borderRadius: {
      sm: "14px",
      md: "22px",
      lg: "30px",
      full: "999px",
    },
    boxShadow: {
      none: "none",
      hard: "0 8px 0 #1B1716, 0 18px 36px #1B171624",
      "hard-sm": "0 4px 0 #1B1716, 0 10px 20px #1B17161F",
      "hard-red": "0 8px 0 #1B1716, 0 18px 34px #F35B4540",
    },
  },
} satisfies Config;

export default config;
