/** Reads API JSON without exposing low-level parser failures in the UI. */
export async function readApiJson(response: Response): Promise<unknown> {
  const body = await response.text();

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("The API returned an invalid response. Please try again.");
  }
}
