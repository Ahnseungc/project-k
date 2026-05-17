import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rausch: {
          DEFAULT: "#ff385c",
          active: "#e00b41",
          disabled: "#ffd1da",
        },
        ink: "#222222",
        body: "#3f3f3f",
        foggy: {
          DEFAULT: "#6a6a6a",
          soft: "#929292",
        },
        hairline: {
          DEFAULT: "#dddddd",
          soft: "#ebebeb",
        },
        canvas: "#ffffff",
        surface: {
          soft: "#f7f7f7",
          strong: "#f2f2f2",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "Circular", "system-ui", "sans-serif"],
      },
      borderRadius: {
        airbnb: "14px",
        "airbnb-sm": "8px",
        pill: "9999px",
      },
      boxShadow: {
        airbnb:
          "rgba(0, 0, 0, 0.02) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px, rgba(0, 0, 0, 0.1) 0 4px 8px",
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};
export default config;
