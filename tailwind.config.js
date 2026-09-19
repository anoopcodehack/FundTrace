/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cream: {
          50: "#FCFAF7",
          100: "#F5EFEB",
          200: "#EDE3DB",
          300: "#DECFC3",
        },
        brand: {
          orange: "#FF4A1C",
          "orange-dark": "#E2380E",
          "orange-light": "#FF6B42",
          yellow: "#FED74C",
          dark: "#121212",
          black: "#0A0A0A",
          card: "#FAF6F0",
        },
      },
    },
  },
  plugins: [],
};
