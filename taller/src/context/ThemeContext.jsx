import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const THEMES = {
  dark: {
    name:              "dark",
    bg:                "#121212",
    bgCard:            "#1C1C1C",
    bgSecondary:       "#2A2A2A",
    border:            "#444444",
    text:              "#E0E0E0",
    textMuted:         "#B0B0B0",
    accent:            "#888888",
    accentSecondary:   "#666666",
    sidebar:           "#0D0D0D",
    sidebarBorder:     "#444444",
    sidebarText:       "#B0B0B0",
    sidebarTextActive: "#E0E0E0",
    input:             "#2A2A2A",
    inputBorder:       "#444444",
    label:             "Oscuro",
  },
  taller: {
    name:              "taller",
    bg:                "#0A0A0A",
    bgCard:            "#1A1A1A",
    bgSecondary:       "#242424",
    border:            "#CC0000",
    text:              "#F5F5F5",
    textMuted:         "#CCCCCC",
    accent:            "#CC0000",
    accentSecondary:   "#FFD700",
    sidebar:           "#0A0A0A",
    sidebarBorder:     "#CC0000",
    sidebarText:       "#CCCCCC",
    sidebarTextActive: "#FFD700",
    input:             "#242424",
    inputBorder:       "#CC0000",
    label:             "Taller",
  },
  light: {
    name:              "light",
    bg:                "#F9F9FB",
    bgCard:            "#FFFFFF",
    bgSecondary:       "#F1F3F5",
    border:            "#94A3B8",
    text:              "#2C3E50",
    textMuted:         "#94A3B8",
    accent:            "#E35335",
    accentSecondary:   "#FFF59D",
    sidebar:           "#2C3E50",
    sidebarBorder:     "#3D5166",
    sidebarText:       "#94A3B8",
    sidebarTextActive: "#FFFFFF",
    input:             "#FFFFFF",
    inputBorder:       "#94A3B8",
    label:             "Claro",
  },
};

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => localStorage.getItem("theme") || "dark");
  const [largeFonts, setLargeFonts] = useState(() => localStorage.getItem("largeFonts") === "true");
  const theme = THEMES[themeName] || THEMES.dark;

  useEffect(() => { localStorage.setItem("theme", themeName); }, [themeName]);
  useEffect(() => {
    // Setear variables CSS para que el layout las use
    const r = document.documentElement.style;
    r.setProperty("--bg",          theme.bg);
    r.setProperty("--bg-card",     theme.bgCard);
    r.setProperty("--text",        theme.text);
    r.setProperty("--accent",      theme.accent);
    r.setProperty("--border",      theme.border);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("largeFonts", largeFonts);
    document.documentElement.style.fontSize = largeFonts ? "18px" : "16px";
  }, [largeFonts]);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName, largeFonts, toggleLargeFonts: () => setLargeFonts(f => !f), THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};
