import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#07111c",
        panel: "rgba(10, 27, 39, 0.72)",
        line: "rgba(117, 255, 246, 0.22)",
        cyan: "#58fff1",
        mint: "#38f2a6",
        violet: "#9b7cff",
        danger: "#ff5f76",
        warning: "#ffbf47"
      },
      boxShadow: {
        glass: "0 22px 80px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.06)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(88,255,241,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(88,255,241,.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: [animate]
};
