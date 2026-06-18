import { authedFetch } from "./authClient";

/**
 * Sends conversation messages to the assistant chatbot backend.
 * @param {Array<{role: string, content: string}>} messages - The list of messages in the conversation.
 * @returns {Promise<{reply: string}>}
 */
export async function chatWithAssistant(messages) {
  return authedFetch("/v1_0/assistant/chat", {
    method: "POST",
    body: JSON.stringify({
      messages,
    }),
  });
}
