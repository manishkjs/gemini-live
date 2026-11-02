---
title: Interactive Voice Studio
description: Audition Gemini Live HD voices, test VAD sensitivity, and inspect real-time token telemetry in the browser.
---

<aside class="one-minute" aria-label="In one minute">
  <div class="one-minute-head">
    <span class="badge badge-blue">In one minute</span>
    <span class="one-minute-audience">For product managers and solution architects</span>
  </div>
  <dl class="one-minute-grid">
    <div class="one-minute-cell"><dt>What this page covers</dt><dd>A browser sandbox where you talk to a live agent, try the prebuilt voices, change the instructions, and watch latency and token counts per turn.</dd></div>
    <div class="one-minute-cell"><dt>Why it matters</dt><dd>Voice choice and turn-taking settings are product decisions. Hearing them is faster than reading about them.</dd></div>
    <div class="one-minute-cell one-minute-number"><dt>The number to remember</dt><dd>Five flagship HD voices (Puck, Charon, Kore, Fenrir, Aoede) plus 25 or more regional ones. Playback should stop within 100 ms when you interrupt.</dd></div>
    <div class="one-minute-cell"><dt>The decision you own</dt><dd>Which voice and which end-of-speech sensitivity your product ships with.</dd></div>
  </dl>
</aside>

The **Gemini Voice Studio** lets you audition prebuilt HD voices (`Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede`, and 25+ regional voices), experiment with system instructions, and watch per-turn latency and token telemetry in real time.

<div class="hero-card" style="display: flex; flex-direction: column; gap: 1rem; margin: 1.5rem 0;">
  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
    <div>
      <span class="badge badge-blue">Interactive Sandbox</span>
      <h3 style="margin: 0.5rem 0 0.25rem 0;">Launch Gemini Voice Studio</h3>
      <p style="margin: 0; font-size: 0.95rem; opacity: 0.85;">
        Test live microphone streaming, barge-in interruption, custom system prompts, and voice selection.
      </p>
    </div>
    <a href="https://aistudio.google.com/live" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--sl-color-accent); color: #ffffff; font-weight: 600; padding: 0.65rem 1.25rem; border-radius: 8px; text-decoration: none;">
      Open in Google AI Studio ↗
    </a>
  </div>
</div>

---

## 1. Choosing the right prebuilt HD voice

Configure the model's voice in `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`:

| Voice Name | Vocal Profile & Cadence | Recommended Use Cases |
| :--- | :--- | :--- |
| **`Aoede`** | Warm, composed, articulate mid-register | Enterprise concierge, healthcare intake, wealth management, executive assistants. |
| **`Kore`** | Crisp, upbeat, clear diction | Retail customer support, order tracking, onboarding walkthroughs, travel booking. |
| **`Puck`** | Energetic, conversational, fast-paced | Consumer companions, interactive gaming, brainstorming, casual tutoring. |
| **`Charon`** | Calm, measured, authoritative low-register | Technical troubleshooting, IT helpdesk, financial disclosures, step-by-step guidance. |
| **`Fenrir`** | Deep, resonant, steady | Storytelling, coaching, hardware/automotive voice interfaces. |

```python
from google.genai import types

config = types.LiveConnectConfig(
    response_modalities=[types.Modality.AUDIO],
    speech_config=types.SpeechConfig(
        language_code="en-US",
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                voice_name="Aoede"
            )
        ),
    ),
)
```

---

## 2. Audition voices locally in ~35 lines of Python

To audition any prebuilt voice and inspect per-turn `usage_metadata` from your terminal without setting up a browser app, run a one-turn `gemini-3.8-live` session that saves a 24 kHz `.wav` clip (`pip install -U "google-genai>=2.32.0"`):

```python
import asyncio
import wave
from google import genai
from google.genai import types

MODEL = "gemini-3.8-live"

async def audition_voice(voice_name: str = "Kore", language_code: str = "en-US"):
    client = genai.Client()  # reads GEMINI_API_KEY, or GOOGLE_GENAI_USE_VERTEXAI=TRUE
    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        speech_config=types.SpeechConfig(
            language_code=language_code,
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            ),
        ),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )
    pcm = bytearray()
    async with client.aio.live.connect(model=MODEL, config=config) as session:
        await session.send_client_content(
            turns=types.Content(role="user", parts=[types.Part(text="Greet me in two short sentences.")]),
            turn_complete=True,
        )
        async for msg in session.receive():
            if msg.data:
                pcm.extend(msg.data)
            if msg.server_content and msg.server_content.turn_complete:
                if msg.usage_metadata:
                    print("Tokens:", msg.usage_metadata.total_token_count)
                break
    with wave.open(f"audition_{voice_name}.wav", "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(24000); wf.writeframes(pcm)

asyncio.run(audition_voice("Kore", "en-IN"))
```

For interactive microphone testing in the browser, open [Google AI Studio Live](https://aistudio.google.com/live) or pair the [Getting started](/gemini-live/getting-started/) script with a local audio I/O loop.

### What to test in your first 2 minutes
1. **Barge-in latency**: Interrupt the model mid-sentence with *"Hold on, change the date to Friday"* and verify that playback stops within `<100ms`.
2. **VAD sensitivity**: Pause for half a second mid-thought (for example, reciting a 10-digit phone number in groups of three) and tune `silenceDurationMs` until the model waits naturally for the full number.
3. **Per-turn `usageMetadata` inspector**: Watch the `Input AUDIO` token counter across Turns 1 to 10 with `contextWindowCompression` toggled on vs. off.
