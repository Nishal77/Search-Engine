const DEFAULT_API_BASE_URL = "http://127.0.0.1:4000";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export async function safeFetchJson<T>(input: string): Promise<T | null> {
  try {
    const response = await fetch(input, {
      cache: "no-store"
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
