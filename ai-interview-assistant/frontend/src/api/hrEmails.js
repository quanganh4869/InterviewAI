import { authedFetch } from "./authClient";

export async function sendCandidateEmail(payload) {
  return authedFetch("/v1_0/hr/emails/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
