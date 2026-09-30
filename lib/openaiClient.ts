import OpenAI from "openai";

let client: OpenAI | null = null;
let configuredKey: string | undefined;

/** Build/import must work without credentials; validate only before an AI call. */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }
  if (!client || configuredKey !== apiKey) {
    client = new OpenAI({ apiKey });
    configuredKey = apiKey;
  }
  return client;
}
