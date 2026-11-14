// Universal Sound Engine for ATLAS Arena (Dual Engine: HTML5 Native Audio WAV + Web Audio API)

// Generates an uncompressed 16-bit PCM WAV Data URI in pure JavaScript (0ms latency, 100% device compatible)
function createWavDataUri(notes: { freq: number; duration: number }[], sampleRate = 44100): string {
  try {
    let totalSamples = 0;
    notes.forEach((n) => (totalSamples += Math.floor(n.duration * sampleRate)));
    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // 'RIFF'
    view.setUint32(4, 36 + totalSamples * 2, true);
    view.setUint32(8, 0x57415645, false); // 'WAVE'

    // 'fmt ' sub-chunk
    view.setUint32(12, 0x666d7420, false); // 'fmt '
    view.setUint32(16, 16, true); // Subchunk size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, 1, true); // Channels (1 = Mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample

    // 'data' sub-chunk
    view.setUint32(36, 0x64617461, false); // 'data'
    view.setUint32(40, totalSamples * 2, true);

    let offset = 44;
    notes.forEach((note) => {
      const numSamples = Math.floor(note.duration * sampleRate);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 9);
        const sample = Math.sin(2 * Math.PI * note.freq * t) * env * 0.9;
        const s = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    });

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  } catch {
    return '';
  }
}

// Pre-synthesize high-quality sounds once on module load
const CHIME_WAV = createWavDataUri([
  { freq: 784, duration: 0.12 }, // G5
  { freq: 1046.5, duration: 0.28 }, // C6
]);

const POP_WAV = createWavDataUri([
  { freq: 440, duration: 0.05 },
  { freq: 880, duration: 0.06 },
]);

const SUCCESS_WAV = createWavDataUri([
  { freq: 523.25, duration: 0.08 },
  { freq: 659.25, duration: 0.08 },
  { freq: 783.99, duration: 0.16 },
]);

class SoundEngine {
  private enabled: boolean = true;
  private ctx: AudioContext | null = null;

  constructor() {
    const saved = localStorage.getItem('atlas_sound_effects');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enable: boolean) {
    this.enabled = enable;
    localStorage.setItem('atlas_sound_effects', enable ? 'true' : 'false');
  }

  // Pre-warm on user interaction
  public unlock() {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {}
  }

  private playWav(wavUri: string) {
    if (!this.enabled || !wavUri) return;

    try {
      const audio = new Audio(wavUri);
      audio.volume = 1.0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback to Web Audio oscillator if HTML5 Audio has any gesture restrictions
          this.playFallbackOscillator(784, 1046.5);
        });
      }
    } catch {
      this.playFallbackOscillator(784, 1046.5);
    }
  }

  private playFallbackOscillator(freq1: number, freq2: number) {
    try {
      this.unlock();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq1, now);
      osc.frequency.setValueAtTime(freq2, now + 0.1);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  // 1. Incoming Bot Announcement / Matchday Goal Chime
  public playChime() {
    this.playWav(CHIME_WAV);
  }

  // 2. Outgoing message pop
  public playSend() {
    this.playWav(POP_WAV);
  }

  // 3. Reaction tap / button click
  public playPop() {
    this.playWav(POP_WAV);
  }

  public playReaction() {
    this.playWav(POP_WAV);
  }

  // 4. Success action (e.g. Starred league change)
  public playSuccess() {
    this.playWav(SUCCESS_WAV);
  }

  // 5. Clash / Rival select
  public playClash() {
    this.playWav(POP_WAV);
  }
}

export const sounds = new SoundEngine();
