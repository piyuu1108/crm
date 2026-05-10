interface PublishResponse {
  messageId?: string;
}

export async function publishToQstash<TPayload>(
  targetUrl: string,
  payload: TPayload
): Promise<PublishResponse> {
  const qstashUrl = process.env.QSTASH_URL;
  const qstashToken = process.env.QSTASH_TOKEN;

  if (!qstashUrl || !qstashToken) {
    throw new Error("QStash is not configured");
  }

  const publishUrl = `${qstashUrl.replace(/\/$/, "")}/v2/publish/${encodeURIComponent(
    targetUrl
  )}`;

  const res = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qstashToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => ({}))) as PublishResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(body.error ?? "Failed to publish message to QStash");
  }

  return body;
}
