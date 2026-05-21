import { createContext, useState, useMemo } from "react";
import { createTheme } from "@mui/material/styles";

// ─── Color Tokens ────────────────────────────────────────────────────────────
// Dark mode  → deep purple-navy backgrounds + Shudu light-blue accents
// Light mode → soft lavender backgrounds + matching blues/purples
// ─────────────────────────────────────────────────────────────────────────────
export const tokens = (mode) => ({
  ...(mode === "dark"
    ? {
        grey: {
          100: "#e8e5f0",
          200: "#d1ccdf",
          300: "#b9b2cf",
          400: "#a299be",
          500: "#8a7fae",
          600: "#6f668b",
          700: "#544d68",
          800: "#383346",
          900: "#1c1a23",
        },
        primary: {
          // dark purple-navy – page backgrounds and surfaces
          100: "#cdc9e3",
          200: "#9b93c8",
          300: "#695cac",
          400: "#2d2660",   // cards / sidebar bg
          500: "#1c1545",   // main page background
          600: "#150f36",
          700: "#0f0a27",
          800: "#080618",
          900: "#040309",
        },
        // Shudu brand blue – primary action / highlight colour
        blueAccent: {
          100: "#deeeff",
          200: "#addaff",
          300: "#7bc5ff",
          400: "#47aeff",   // bright brand blue for chips / badges
          500: "#1a8fff",   // primary action blue (matches Shudu light-blue brand)
          600: "#1572cc",
          700: "#105699",
          800: "#0a3966",
          900: "#051d33",
        },
        // Teal-mint – success states, active items
        greenAccent: {
          100: "#ccf5ed",
          200: "#99ecdb",
          300: "#66e2c9",
          400: "#33d9b7",
          500: "#00cfa5",   // vibrant teal
          600: "#00a684",
          700: "#007c63",
          800: "#005342",
          900: "#002921",
        },
        // Soft lavender-purple – secondary highlights, notification dots
        redAccent: {
          100: "#f0d6f5",
          200: "#e0adeb",
          300: "#d185e1",
          400: "#c15cd7",
          500: "#b133cd",   // used for "on hold" / warning-purple
          600: "#8e29a4",
          700: "#6a1f7b",
          800: "#471452",
          900: "#230a29",
        },
        orangeAccent: {
          100: "#fde8d8",
          200: "#fbd1b1",
          300: "#f9bb8a",
          400: "#f7a463",
          500: "#f58d3c",
          600: "#c4711f",
          700: "#935418",
          800: "#623810",
          900: "#311c08",
        },
      }
    : {
        // ── Light mode: flipped primary, soft lavender surfaces ──────────────
        grey: {
          100: "#1c1a23",
          200: "#383346",
          300: "#544d68",
          400: "#6f668b",
          500: "#8a7fae",
          600: "#a299be",
          700: "#b9b2cf",
          800: "#d1ccdf",
          900: "#e8e5f0",
        },
        primary: {
          100: "#040309",
          200: "#080618",
          300: "#0f0a27",
          400: "#ede8ff",   // light mode card / sidebar surface (soft lavender)
          500: "#1c1545",
          600: "#2d2660",
          700: "#695cac",
          800: "#9b93c8",
          900: "#cdc9e3",
        },
        blueAccent: {
          100: "#051d33",
          200: "#0a3966",
          300: "#105699",
          400: "#1572cc",
          500: "#1a8fff",
          600: "#47aeff",
          700: "#7bc5ff",
          800: "#addaff",
          900: "#deeeff",
        },
        greenAccent: {
          100: "#002921",
          200: "#005342",
          300: "#007c63",
          400: "#00a684",
          500: "#00cfa5",
          600: "#33d9b7",
          700: "#66e2c9",
          800: "#99ecdb",
          900: "#ccf5ed",
        },
        redAccent: {
          100: "#230a29",
          200: "#471452",
          300: "#6a1f7b",
          400: "#8e29a4",
          500: "#b133cd",
          600: "#c15cd7",
          700: "#d185e1",
          800: "#e0adeb",
          900: "#f0d6f5",
        },
        blueAccentLight: {
          100: "#051d33",
          200: "#0a3966",
          300: "#105699",
          400: "#1572cc",
          500: "#1a8fff",
          600: "#47aeff",
          700: "#7bc5ff",
          800: "#addaff",
          900: "#deeeff",
        },
      }),
});

// ─── MUI Theme Settings ───────────────────────────────────────────────────────
export const themeSettings = (mode) => {
  const colors = tokens(mode);
  return {
    palette: {
      mode: mode,
      ...(mode === "dark"
        ? {
            primary:   { main: colors.primary[500] },
            secondary: { main: colors.blueAccent[500] },
            success:   { main: colors.greenAccent[500] },
            info:      { main: colors.blueAccent[400] },
            neutral: {
              dark:  colors.grey[700],
              main:  colors.grey[500],
              light: colors.grey[100],
            },
            background: { default: colors.primary[500] },
          }
        : {
            primary:   { main: colors.primary[600] },
            secondary: { main: colors.blueAccent[500] },
            success:   { main: colors.greenAccent[500] },
            info:      { main: colors.blueAccent[500] },
            neutral: {
              dark:  colors.grey[700],
              main:  colors.grey[500],
              light: colors.grey[100],
            },
            background: { default: "#f5f0ff" },  // soft lavender page bg
          }),
    },
    typography: {
      fontFamily: ["Inter", "Source Sans Pro", "sans-serif"].join(","),
      fontSize: 12,
      h1: { fontFamily: ["Inter", "sans-serif"].join(","), fontSize: 40 },
      h2: { fontFamily: ["Inter", "sans-serif"].join(","), fontSize: 32 },
      h3: { fontFamily: ["Inter", "sans-serif"].join(","), fontSize: 24 },
      h4: { fontFamily: ["Inter", "sans-serif"].join(","), fontSize: 20 },
      h5: { fontFamily: ["Inter", "sans-serif"].join(","), fontSize: 16 },
      h6: { fontFamily: ["Inter", "sans-serif"].join(","), fontSize: 14 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, textTransform: "none", fontWeight: 600 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6 },
        },
      },
    },
  };
};

// ─── Color Mode Context ───────────────────────────────────────────────────────
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
});

export const useMode = () => {
  const [mode, setMode] = useState("dark");

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    []
  );

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);
  return [theme, colorMode];
};
