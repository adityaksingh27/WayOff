export function xaiKey() {
  return process.env.XAI_API_KEY ?? "";
}

export function hasXai() {
  return Boolean(xaiKey());
}

export async function grokChat(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const key = xaiKey();
  if (!key) throw new Error("Missing XAI_API_KEY");
  const models = ["grok-4-fast-non-reasoning", "grok-4-fast", "grok-3-mini", "grok-2-latest"];
  let last = "Grok chat failed";
  for (const model of models) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, temperature: 0.9, messages }),
    });
    if (!res.ok) {
      last = await res.text();
      continue;
    }
    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return json.choices[0]?.message?.content?.trim() || "Stay lost a little longer.";
  }
  throw new Error(last);
}

export async function grokImagineImage(prompt: string, aspectRatio = "16:9") {
  const key = xaiKey();
  if (!key) throw new Error("Missing XAI_API_KEY");
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-imagine-image-2.0",
      prompt,
      n: 1,
      aspect_ratio: aspectRatio,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Imagine failed");
  }
  const json = (await res.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
  };
  const item = json.data?.[0];
  if (item?.url) return item.url;
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  throw new Error("Imagine returned no image");
}

export async function grokTts(text: string, voiceId = "eve") {
  const key = xaiKey();
  if (!key) throw new Error("Missing XAI_API_KEY");
  const res = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      language: "en",
    }),
  });
  if (!res.ok) throw new Error("Voice TTS failed");
  return Buffer.from(await res.arrayBuffer());
}

export async function grokStt(file: File) {
  const key = xaiKey();
  if (!key) throw new Error("Missing XAI_API_KEY");
  const form = new FormData();
  form.append("model", "grok-voice-transcribe-2.0");
  form.append("file", file);
  const res = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Voice STT failed");
  }
  const json = (await res.json()) as { text?: string };
  return json.text?.trim() || "";
}

export async function grokImagineVideo(prompt: string, imageUrl?: string) {
  const key = xaiKey();
  if (!key) throw new Error("Missing XAI_API_KEY");
  const body: Record<string, unknown> = {
    model: "grok-imagine-video-1.5",
    prompt,
    duration: 8,
    ratio: "16:9",
    resolution: "720p",
  };
  if (imageUrl) body.image = { url: imageUrl };

  const start = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!start.ok) {
    const text = await start.text();
    throw new Error(text || "Video start failed");
  }
  const kicked = (await start.json()) as { request_id?: string };
  const id = kicked.request_id;
  if (!id) throw new Error("No video request id");

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const poll = await fetch(`https://api.x.ai/v1/videos/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = (await poll.json()) as {
      status?: string;
      video?: { url?: string };
    };
    if (json.status === "done" && json.video?.url) return json.video.url;
    if (json.status === "failed" || json.status === "expired") {
      throw new Error("Video generation failed");
    }
  }
  throw new Error("Video timed out");
}
