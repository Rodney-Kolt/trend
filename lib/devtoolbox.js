/**
 * DevToolBox AI API helper.
 * No API key required — completely free.
 * Endpoint: https://devtoolbox-api.devtoolbox-api.workers.dev/ai/summarize
 */

const DEVTOOLBOX_ENDPOINT =
  'https://devtoolbox-api.devtoolbox-api.workers.dev/ai/summarize';

// Fallback endpoint (the one used in the component)
const DEVTOOLBOX_FALLBACK = 'https://devtoolbox.co/api/ai/summarize';

/**
 * Summarize text using DevToolBox AI.
 * @param {string} text - The text/prompt to summarize
 * @returns {Promise<string>} The summary text
 */
export async function summarize(text) {
  if (!text?.trim()) throw new Error('No text provided to summarize');

  // Try primary endpoint first
  for (const endpoint of [DEVTOOLBOX_ENDPOINT, DEVTOOLBOX_FALLBACK]) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(15_000), // 15s timeout
      });

      if (!res.ok) continue;

      const data = await res.json();
      const result =
        data.summary ||
        data.result  ||
        data.text    ||
        data.output  ||
        data.response;

      if (result) return String(result).trim();
    } catch {
      // Try next endpoint
      continue;
    }
  }

  throw new Error('DevToolBox AI is unavailable — both endpoints failed');
}

/**
 * Build a dropshipper-focused summarization prompt from video titles.
 * @param {string[]} titles - Array of video titles
 * @returns {string} Formatted prompt
 */
export function buildTrendPrompt(titles) {
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  return (
    `Summarize these top trending YouTube video titles for a dropshipper or affiliate marketer. ` +
    `Identify common themes, trending niches, and potential product opportunities:\n\n${numbered}`
  );
}
