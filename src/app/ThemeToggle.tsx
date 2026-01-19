"use client";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            style={{
                padding: "8px 16px",
                borderRadius: "4px",
                border: "1px solid var(--foreground)",
                background: "transparent",
                color: "var(--foreground)",
                cursor: "pointer",
                marginLeft: "10px",
                fontSize: "0.9em"
            }}
        >
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
    );
}
