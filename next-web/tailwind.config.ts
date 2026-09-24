import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#EEF4FF",
          100: "#DCE7FD",
          200: "#B9CFFB",
          300: "#8AABF7",
          400: "#5B82F1",
          500: "#2F5FE3",
          600: "#0F4BD1",
          700: "#0B3BA8",
          800: "#0A2E5F",
          900: "#06244B",
          950: "#041C3A",
        },
        ink: {
          DEFAULT: "#101828",
          secondary: "#475467",
          tertiary: "#667085",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F8FAFC",
          muted: "#F1F5F9",
        },
        line: {
          DEFAULT: "#E4E9F0",
          soft: "#EEF2F7",
        },
        success: {
          DEFAULT: "#12805C",
          soft: "#E6F6EE",
          border: "#BFE6D2",
        },
        danger: {
          DEFAULT: "#C4320A",
          soft: "#FDEEEC",
          border: "#F5C6C0",
        },
        warning: {
          DEFAULT: "#9A6700",
          soft: "#FEF3E2",
          border: "#F5D9A8",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "10px",
        md: "10px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(16, 24, 40, 0.05)",
        sm: "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)",
        card: "0 1px 2px rgba(16, 24, 40, 0.05)",
      },
      spacing: {
        "18": "4.5rem",
      },
    },
  },
  plugins: [],
};
export default config;

