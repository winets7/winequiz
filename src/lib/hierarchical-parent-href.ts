/**
 * Путь «родителя» для меню навигации — совпадает с иерархией
 * useHierarchicalBack / docs/PAGES.md.
 */
export function getHierarchicalParentHref(pathname: string): string | null {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (!path || path === "/") return null;

  const lobbySelect = path.match(
    /^\/lobby\/([^/]+)\/round\/([^/]+)\/select\/[^/]+$/
  );
  if (lobbySelect) {
    return `/lobby/${lobbySelect[1]}/round/${lobbySelect[2]}/edit`;
  }

  const playSelect = path.match(/^\/play\/([^/]+)\/select\/[^/]+$/);
  if (playSelect) return `/play/${playSelect[1]}`;

  const lobbyEdit = path.match(/^\/lobby\/([^/]+)\/round\/([^/]+)\/edit$/);
  if (lobbyEdit) return `/lobby/${lobbyEdit[1]}`;

  if (/^\/play\/[^/]+$/.test(path)) return "/games/wine-quiz";
  if (/^\/lobby\/[^/]+$/.test(path)) return "/games/wine-quiz";
  if (/^\/join\/[^/]+$/.test(path)) return "/games/wine-quiz";
  if (/^\/history\/[^/]+$/.test(path)) return "/profile";
  if (/^\/scoreboard\/[^/]+$/.test(path)) return "/games/wine-quiz";

  if (/^\/profile\/[^/]+$/.test(path) && path !== "/profile") {
    return "/profile";
  }

  if (path === "/profile") return "/";

  if (path.startsWith("/games/")) return "/";
  if (path === "/login" || path === "/register") return "/";
  if (path === "/offline") return "/";

  const lastSlash = path.lastIndexOf("/");
  if (lastSlash <= 0) return null;
  const parent = path.slice(0, lastSlash);
  return parent || "/";
}
