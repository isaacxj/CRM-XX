export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "crm-theme";
export const THEME_EVENT = "crm-theme-change";

// Runs before first paint (inlined in <head>) so the page never flashes the wrong theme.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||((t!=="light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function applyTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {}
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new Event(THEME_EVENT));
}
