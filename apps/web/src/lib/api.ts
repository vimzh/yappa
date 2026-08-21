/** Browser API calls that include the authenticated Yappa session cookie. */
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, { ...init, credentials: "include" });
}
