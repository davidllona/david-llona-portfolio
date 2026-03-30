/** @type {import('tailwindcss').Config} */
export default {
 content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
 theme: {
  extend: {
   colors: {
    bg: "var(--color-bg)",
    surface: "var(--color-surface)",

    text: "var(--color-text)",
    "text-muted": "var(--color-text-muted)",

    primary: "var(--color-primary)",
    "primary-soft": "var(--color-primary-soft)",

    border: "var(--color-border)",
   },
   fontFamily: {
    sans: ["Inter", "system-ui", "sans-serif"],
    serif: ["Times New Roman", "Georgia", "serif"],
   },
  },
 },
 plugins: [],
};
