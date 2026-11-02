---
title: Orchestration Frameworks
description: Choosing between the Google GenAI SDK, ADK, Pipecat, and LiveKit for Gemini Live applications.
---

<aside class="one-minute" aria-label="In one minute">
  <div class="one-minute-head">
    <span class="badge badge-blue">In one minute</span>
    <span class="one-minute-audience">For product managers and solution architects</span>
  </div>
  <dl class="one-minute-grid">
    <div class="one-minute-cell"><dt>What this page covers</dt><dd>The four ways to connect callers to Gemini Live (raw SDK, Google ADK, Pipecat, LiveKit) and why a native speech model beats a three-service chain.</dd></div>
    <div class="one-minute-cell"><dt>Why it matters</dt><dd>This is the first architecture decision and the hardest to reverse. It also decides whether you get sub-second replies or a 1 to 2 second pause on every turn.</dd></div>
    <div class="one-minute-cell one-minute-number"><dt>The number to remember</dt><dd>A three-stage cascade takes 1,200 to 2,500 ms per turn. The native path stays under a second.</dd></div>
    <div class="one-minute-cell"><dt>The decision you own</dt><dd>Match the transport to how calls arrive: direct GenAI SDK for custom microservices, Google ADK for multi-agent workflows on Google Cloud, LiveKit for global WebRTC rooms and SIP, or Pipecat for Python frame-pipeline connectors.</dd></div>
  </dl>
</aside>

When building a Gemini Live application, your first architectural decision is how to connect user devices and telephony trunks to the Gemini Live WebSocket.

---

## 1. Framework comparison matrix

| Option | Primary Strength | Transport Layer | Best Use Case |
| :--- | :--- | :--- | :--- |
| **Direct `google-genai` SDK** | Zero framework overhead, immediate access to every Bidi API field (`send_context_update`, `interaction_status`) | Custom WebSocket / WebRTC | Custom backend microservices, Twilio/carrier media-stream gateways, or full control over `sessionResumption` and `contextWindowCompression`. |
| **Google Agent Development Kit (ADK)** | First-party multi-agent routing, built-in evaluation & Vertex AI Agent Engine integration | FastAPI WebSocket / WebRTC | Enterprise multi-agent systems deployed on Google Cloud with structured sub-agent handoffs. |
| **LiveKit Agents** | Production-grade WebRTC SFU, global edge routing, SIP trunking, native browser/mobile SDKs | LiveKit WebRTC & SIP | Consumer mobile/web apps and SIP deployments requiring low-latency WebRTC, room management, and multi-participant audio/video. |
| **Pipecat (`pipecat-ai`)** | Frame-based Python audio pipeline and prebuilt telephony/DSP connectors | WebRTC & SIP WebSockets | Python pipelines combining custom frame-level DSP filters with prebuilt carrier media-stream adapters. |

---

## 2. Native S2S vs. cascaded STT → LLM → TTS inside frameworks

Orchestration frameworks support two fundamentally different pipeline modes. Configure the **Native Multimodal / Realtime** node rather than chaining separate STT, LLM, and TTS services:

### Anti-pattern: The 3-stage cascade
```text
[User Audio] → [Deepgram/Chirp STT] → (Text) → [Gemini Flash Text API] → (Text) → [ElevenLabs/Cloud TTS] → [Speaker]
```
- **Latency**: 1,200ms to 2,500ms (sums STT endpointing + LLM TTFT + TTS synthesis).
- **Blind to paralinguistics**: Strips tone, hesitation, and emotion before the LLM sees the input.
- **Triple vendor billing**: Pays separately for ASR per minute, LLM tokens, and TTS characters.

### Recommended: Native Speech-to-Speech
```text
[User Audio (16kHz PCM)] ──► [Gemini Live Bidi WebSocket] ──► [Speaker Audio (24kHz PCM)]
                                         │
                              (Async Tool & Transcript Events)
```
- **Latency**: 400ms to 700ms end-to-end.
- **Acoustic understanding**: Hears frustration, sarcasm, background noise, and language switches natively.
- **Single unified stream**: Emits 24kHz audio (`inlineData`), input/output transcriptions, and `toolCall` events over one connection.
- **Pin `gemini-3.8-live` explicitly in third-party wrappers**: Several open-source realtime adapters (for example `GeminiLiveLLMService` in older `pipecat-ai` releases) default to `gemini-2.5-flash-native-audio-preview-12-2025`, which shuts down on **November 17, 2026**. Always pass `model="gemini-3.8-live"` explicitly.

### If you keep a cascade: hold the TTS voice steady
A cascade sends one TTS request per sentence, so each sentence is a fresh generation. With Gemini 3.8 TTS:
- Put the accent and character in the voice itself: an Extended Voice Library voice (for example the Indian English `en-in-*` voices from `client.voices.list`) or a Voice design voice. Asking for an accent inside `speech_metadata.style` on every sentence makes the voice wander.
- Keep `style` to short situational delivery: emotion, pitch and pace.
- Do not send one-word sentences ("Namaste.") as their own request; merge them into the next sentence.
- Send as few requests per reply as you can: the model cannot take earlier audio as context, so every request re-derives the voice. Release the first sentence quickly, then send the rest of the reply as one request. Measured: seven requests 0.65 to 0.67 speaker similarity, first sentence then the rest 0.69 to 0.76, one request 0.75 to 0.80.
- When identity matters more than expressiveness, send the plain transcript with no `speech_metadata.style` at all (0.69 to 0.71 against 0.61 to 0.66 with any style string).
- Check results with a speaker-verification model across the sentences of one reply, not only by ear or pitch.

See [Agent Skill §2.C](/gemini-live/gemini-live-skill/) for the full rules and the A/B numbers.

---

## 3. When a hybrid pipeline still makes sense

While native Speech-to-Speech is the default for 90% of conversational voice agents, two specialized scenarios justify a hybrid or sidecar architecture:

1. **Strict pre-speech compliance filtering**: If a regulated financial or healthcare environment requires inspecting and redacting the exact text transcript *before* the first millisecond of audio is played to the user, you can either use [Pre-speech compliance guardrails (200ms jitter buffer)](/gemini-live/optimization/#pre-speech-compliance-guardrails-200ms-jitter-buffer) on the native stream, or run Gemini Live in `TEXT` output modality paired with an ultra-low-latency streaming TTS.
2. **Custom brand voices**: Start with native instant voice cloning via `speechConfig.voiceConfig.replicatedVoiceConfig` (a 10 to 20 second clean 24 kHz mono PCM clip keeps `responseModalities: ["AUDIO"]` and full speech-to-speech latency; see [Configuration reference -> Voices and language](/gemini-live/gemini-live-configuration/#voices-and-language)). Reserve `responseModalities: ["TEXT"]` paired with an external streaming TTS engine only when you are contractually required to synthesize through a specific third-party voice vendor.
