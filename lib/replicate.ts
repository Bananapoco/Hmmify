import Replicate from "replicate";

// Create a Replicate instance with your API token
// This reads from .env.local automatically in Next.js
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default replicate;
