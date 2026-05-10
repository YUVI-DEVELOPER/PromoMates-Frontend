/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d9efff",
          600: "#0f7bbd",
          700: "#0b6399",
          900: "#10384f",
        },
      },
    },
  },
  plugins: [],
};
