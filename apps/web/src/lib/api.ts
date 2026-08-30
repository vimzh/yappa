/** Same-origin API calls that keep the Yappa session cookie first-party. */
export const apiUrl = "/api";

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, { ...init, credentials: "include" });
}
