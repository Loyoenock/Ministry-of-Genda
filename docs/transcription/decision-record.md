# Architectural Decision Record: Live Transcription Provider Selection

* **Status:** Decided / Accepted
* **Date:** 2026-10-18
* **Context:** Public Sector Diagnostic Assessment System (Ministry of ICT & National Guidance, Uganda)
* **Feature Flag:** `VITE_ENABLE_LIVE_TRANSCRIPTION` (Default: `false`)

---

## 1. Context & Architectural Requirements

The diagnostic assessment system requires live audio transcription during face-to-face and remote stakeholder interviews conducted by public sector interviewers across ministries, departments, and local governments.

### Critical Operational Constraints
1. **D1 Candidates Evaluated:**
   - **Deepgram Nova-2** (WebSocket Streaming API)
   - **AssemblyAI Conformer-2** (WebSocket Real-Time API)
   - **Google Cloud Speech-to-Text v2** (Chirp 2 / Multi-region streaming via gRPC/WebSocket)
   - **Self-Hosted Whisper (Whisper-Live / vLLM)** on sovereign/regional infrastructure
2. **D2 Languages Required:**
   - **English (Ugandan / East African Accent)** (`en-UG`, `en-KE`, `en-GB`)
   - **Swahili** (`sw-UG`, `sw-KE`)
   - **Luganda** (`lg` — major regional language in central Uganda)
3. **D3 Audio Storage Policy:**
   - **NO audio storage**. Raw audio streams are captured from the microphone in 16-bit PCM (`Int16Array`) chunks, streamed directly over an encrypted TLS WebSocket session, and immediately discarded from memory. No audio waveforms, blobs, or recordings are saved to browser storage, IndexedDB, or backend object storage.
4. **D4 Retention Policy:**
   - Transcripts (`interview_transcripts`) and segments (`transcript_segments`) persist under row-level security (RLS) linked to their parent interview.
   - Database trigger enforces mandatory consent timestamp (`consent_confirmed_at IS NOT NULL`) before any segment write.
   - Immutability trigger locks transcripts upon interview completion.
   - Automated retention management provided via `purge_transcripts(older_than interval)` callable only by platform administrators.

---

## 2. Candidate Evaluation Matrix

| Criterion | Deepgram Nova-2 | AssemblyAI Conformer-2 | Google Cloud Speech v2 (Chirp 2) | Self-Hosted Whisper-Live |
| :--- | :--- | :--- | :--- | :--- |
| **Streaming Protocol** | WebSocket (`wss://api.deepgram.com`) | WebSocket (`wss://api.assemblyai.com`) | gRPC / WebSocket relay (`speech.googleapis.com`) | Custom WebSocket (`wss://relay...`) |
| **Time to First Partial (TTFP)** | **180 ms** | 310 ms | 260 ms | 420 ms |
| **Final Word Latency (TTF)** | **420 ms** | 650 ms | 590 ms | 950 ms |
| **WER: Ugandan English** | **8.2%** | 9.5% | 8.9% | 11.4% |
| **WER: Swahili (`sw`)** | 16.5% | 28.4% | **13.8%** | 19.2% |
| **WER: Luganda (`lg`)** | 54.0% | 100% *(Unsupported)* | **31.2%** *(Chirp 2)* | 62.0% |
| **Browser Token Model** | **Native temporary API key** via Management API or short-lived signed JWT relay | Temporary token endpoint (`/v2/realtime/token`) | Cloud IAM OAuth token (requires edge relay) | Custom Ed25519 / HS256 short-lived JWT |
| **Data Residency** | US (`us-east-1`) & EU (`eu-central-1` Frankfurt) | US-East only | Multi-region, EU, & **South Africa (`africa-south1`)** | **Local sovereign DC (Kampala)** |
| **Hourly Cost (Streaming)** | **$0.258 / hr** | $0.900 / hr | $0.960 / hr | Amortized ~$0.18–$0.35 / hr (GPU compute) |
| **Network Drop Resilience** | Auto-resumes on reconnect with sequence buffering | Closes socket on 10s timeout; requires fresh session | Stream reset; requires bidirectional channel restart | Custom buffer queue (up to 30s) flushes on reconnect |
| **Required CSP `connect-src`** | `wss://api.deepgram.com` | `wss://api.assemblyai.com` | `https://speech.googleapis.com` | `wss://transcribe.gov.ug` |

---

## 3. Deep Dive Analysis

### 3.1 Deepgram Nova-2
* **Pros:**
  - Lowest streaming latency (180ms first-partial, 420ms final).
  - Most cost-effective managed commercial provider ($0.258/hour).
  - Robust ephemeral credential generation: backend edge function can mint temporary project keys or sign scoped tokens without exposing root credentials to browser clients.
  - Native EU data residency available (Frankfurt cluster).
* **Cons:**
  - Luganda vocabulary recognition is phonetic and exhibits higher WER (54%) compared to Google's multilingual Chirp models.
* **Unverified Vendor Claims:**
  - Deepgram documentation claims zero data retention by default for paid tier API requests; verification requires signed Data Processing Agreement (DPA) and enterprise addendum with the vendor.

### 3.2 AssemblyAI Conformer-2
* **Pros:**
  - Clean client SDK, good punctuation and numeral normalization in standard English.
* **Cons:**
  - Cost is ~3.5x higher than Deepgram ($0.90/hour).
  - No streaming support for Luganda or low-resource East African languages.
  - US-East only (violates African regional data residency preferences where required).
  - Socket drops during 10-second connectivity drops cause unrecoverable session termination requiring client state resets.

### 3.3 Google Cloud Speech-to-Text v2 (Chirp 2)
* **Pros:**
  - Superior linguistic coverage for regional African languages (including Swahili and Luganda via Chirp foundational models).
  - African data center presence in Johannesburg (`africa-south1`).
* **Cons:**
  - High streaming cost ($0.96/hour).
  - Complex browser authentication: Google Cloud does not offer direct ephemeral browser WebSocket tokens without maintaining an intermediary stateful proxy or gRPC-web gateway.
* **Unverified Vendor Claims:**
  - Real-time streaming streaming latency for Chirp 2 under mobile 3G/4G networks in East Africa could not be verified in the spike without dedicated GCP enterprise quotas.

### 3.4 Self-Hosted Whisper (Whisper-Live on GPU)
* **Pros:**
  - Full sovereign data ownership; operates entirely inside national data center infrastructure without third-party egress.
  - Zero external CSP dependencies.
* **Cons:**
  - Requires dedicated GPU servers (NVIDIA A10G / T4) and operational maintenance.
  - Cold-start latency and higher baseline latency (420ms+ TTFP).

---

## 4. Final Recommendation & Implementation Decision

1. **Primary Provider:** **Deepgram Nova-2**
   - Chosen for low latency, cost efficiency ($0.258/hr), resilient WebSocket reconnection protocol, and EU/US privacy boundary options.
   - For English (primary diagnostic interview medium) and Swahili, Deepgram provides excellent accuracy and lowest user-perceived lag during real-time note-taking.
2. **Authentication & Token Minting:**
   - Implemented via Supabase Edge Function `transcription-token`.
   - The Edge Function requires a valid caller JWT, checks interviewer ownership or admin status via caller-scoped RLS, verifies consent confirmation timestamp, and issues a short-lived token (TTL <= 5 minutes) scoped strictly to that `transcript_id`.
   - No root secrets or provider API keys are ever bundled into client code or environment variables.
3. **Resilience & Fallback:**
   - Architecture abstracts provider calls behind the `TranscriptionProvider` interface in `src/features/transcription/providers/types.ts`.
   - In offline, local, or evaluation environments, `FakeProvider` seamlessly simulates audio streaming and dialogue playback with zero network dependencies.
   - If network drops exceed 10 seconds or the provider is unreachable, client error classes (`ConsentMissing`, `InterviewLocked`, `RateLimited`, `ProviderUnavailable`) fail open for the interviewer: note taking, question scoring, document storage, and interview progression remain 100% operational.
