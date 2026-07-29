/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDEFE9", // pale sage-paper noticeboard background
        chalk: "#14181F", // near-black ink
        navy: "#1B2A4A", // uniform navy
        stage: "#F2B705", // matatu stage-marker yellow
        murram: "#B23A2F", // red-earth road clay
        signal: "#2F6B4F", // verification-stamp green
        "signal-light": "#E4EFE9",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        ticket: "4px",
      },
    },
  },
  plugins: [],
};
