import Replicate from "replicate";

// Create a Replicate instance with your API token
// This reads from .env.local automatically in Next.js
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const RETRY_AFTER_PATTERN = /"retry_after"\s*:\s*(\d+)/;

/**
 * Accounts with low credit can only create one prediction at a time. The
 * vocal-separation and RVC stages are submitted seconds apart, so wait for
 * Replicate's requested cooldown before retrying the create request.
 */
export async function retryAfterRateLimit<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      const retryAfter = Number(message.match(RETRY_AFTER_PATTERN)?.[1]);
      const isRateLimited = error?.status === 429 || message.includes("status 429") || message.includes("Too Many Requests");

      if (!isRateLimited || attempt === 2) throw error;

      const delayMs = Math.max(retryAfter || 6, 1) * 1_000;
      console.warn(`Replicate rate-limited prediction creation; retrying in ${delayMs / 1_000}s`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Replicate prediction could not be created");
}

export default replicate;
