let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function playCardMove() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const duration = 0.12;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.pow(1 - t, 2.5);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 800;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(3000, ctx.currentTime);
    lowpass.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);

    source.start(ctx.currentTime);
  } catch {
    // silently fail
  }
}
