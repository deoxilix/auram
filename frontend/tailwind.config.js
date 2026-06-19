/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#ede0ff",
          100: "#d2bbff",
          200: "#b594ff",
          300: "#986eff",
          400: "#7c3aed",
          500: "#630ed4",
          600: "#4f06b0",
          700: "#3d058c",
          800: "#2c0468",
          900: "#1b0344",
        },
        surface: {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          container: {
            lowest: "#ffffff",
            low: "#eff4ff",
            DEFAULT: "#e5eeff",
            high: "#dce9ff",
            highest: "#d3e4fe",
          },
        },
        secondary: {
          DEFAULT: "#565e74",
          container: "#dae2fd",
        },
        tertiary: {
          DEFAULT: "#4e4e58",
          container: "#666670",
        },
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.25rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      boxShadow: {
        card: "0 4px 12px rgba(0,0,0,0.04)",
        elevated: "0 10px 20px rgba(0,0,0,0.08)",
      },
      spacing: {
        gutter: "24px",
      },
    },
  },
  plugins: [],
};
