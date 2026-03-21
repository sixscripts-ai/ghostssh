/**
 * Extracts and parses JSON from LLM responses that may be wrapped
 * in markdown code fences (```json ... ```) or contain extra text.
 */
export function safeParseJson<T = unknown>(raw: string): T {
  // First try direct parse
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract JSON from markdown code fences
    const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch && fenceMatch[1]) {
      return JSON.parse(fenceMatch[1].trim()) as T;
    }

    // Try to find the first { or [ and parse from there
    const objStart = raw.indexOf("{");
    const arrStart = raw.indexOf("[");
    const start = objStart >= 0 && arrStart >= 0
      ? Math.min(objStart, arrStart)
      : objStart >= 0 ? objStart : arrStart;

    if (start >= 0) {
      const isObj = raw[start] === "{";
      const closer = isObj ? "}" : "]";
      const lastClose = raw.lastIndexOf(closer);
      if (lastClose > start) {
        return JSON.parse(raw.slice(start, lastClose + 1)) as T;
      }
    }

    throw new Error(`Cannot extract JSON from LLM response: ${raw.slice(0, 200)}...`);
  }
}
