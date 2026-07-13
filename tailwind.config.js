/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        rose: {
          deep: "#7A2E3A",
          mid: "#8F3B49",
          light: "#C9A9A0",
        },
        paper: "#FAF6F0",
        gold: "#B8935F",
        sage: "#6B7F6B",
        alert: "#C1443D",
      },
    },
  },
  plugins: [],
};

