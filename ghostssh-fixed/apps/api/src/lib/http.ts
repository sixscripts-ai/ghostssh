export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) { const body = await res.text(); throw new Error(`HTTP ${res.status} ${url}: ${body.slice(0,300)}`); }
  return (await res.json()) as T;
}
