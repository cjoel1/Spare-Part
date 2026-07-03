// Minimal hash-based SPA router.
const routes = [];
let notFoundHandler = null;
let current = null;

export function route(pattern, handler) {
  const paramNames = [];
  const normalized = pattern.length > 1 ? pattern.replace(/\/$/, "") : pattern;
  const regex = new RegExp(
    "^" +
      normalized
        .split("/")
        .map((seg) => {
          if (seg.startsWith(":")) {
            paramNames.push(seg.slice(1));
            return "([^/]+)";
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/") +
      "$"
  );
  routes.push({ regex, paramNames, handler });
}

export function notFound(handler) {
  notFoundHandler = handler;
}

function parseHash() {
  let hash = location.hash.slice(1) || "/";
  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query || "");
  return { path: path.replace(/\/$/, "") || "/", query: params };
}

async function resolve() {
  const { path, query } = parseHash();
  for (const r of routes) {
    const match = path.match(r.regex);
    if (match) {
      const params = {};
      r.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      current = { path, params, query };
      await r.handler({ params, query, path });
      return;
    }
  }
  if (notFoundHandler) await notFoundHandler({ path, query });
}

export function navigate(path) {
  if (location.hash.slice(1) === path) {
    resolve();
  } else {
    location.hash = path;
  }
}

export function getCurrent() {
  return current;
}

export function startRouter() {
  window.addEventListener("hashchange", resolve);
  resolve();
}
