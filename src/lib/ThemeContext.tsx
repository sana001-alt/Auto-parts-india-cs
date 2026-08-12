import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem("autoparts_theme_mode");
      if (saved === "dark" || saved === "light") {
        return saved;
      }
    } catch (e) {
      console.error("Failed to read theme mode from localStorage:", e);
    }
    return "light";
  });

  const isDarkMode = theme === "dark";

  const applyThemeToDom = (m: ThemeMode) => {
    if (typeof document === "undefined") return;
    if (m === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem("autoparts_theme_mode", mode);
    } catch (e) {
      console.error("Failed to write theme mode to localStorage:", e);
    }
    applyThemeToDom(mode);
    window.dispatchEvent(new Event("autoparts_theme_changed"));
  };

  const toggleTheme = () => {
    const nextMode = theme === "dark" ? "light" : "dark";
    setTheme(nextMode);
  };

  useEffect(() => {
    applyThemeToDom(theme);

    const handleThemeChanged = () => {
      try {
        const saved = localStorage.getItem("autoparts_theme_mode");
        if (saved && (saved === "dark" || saved === "light") && saved !== theme) {
          setThemeState(saved as ThemeMode);
          applyThemeToDom(saved as ThemeMode);
        }
      } catch (e) {
        console.error("Failed to handle theme sync", e);
      }
    };

    window.addEventListener("autoparts_theme_changed", handleThemeChanged);
    return () => {
      window.removeEventListener("autoparts_theme_changed", handleThemeChanged);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
