// Getting the visitor's attention and keeping the phone awake.

let audio: AudioContext | null = null;

/** Call from a tap (Join / Start) so iOS lets us play the approval sound later. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const silent = audio.createBuffer(1, 1, 22_050);
    const source = audio.createBufferSource();
    source.buffer = silent;
    source.connect(audio.destination);
    source.start();
  } catch { /* no Web Audio: the vibration and the laptop cue still work */ }
}

/** A short two-note “knock”, in the spirit of a chat-app notification. */
export function playKnock() {
  try {
    if (!audio) return;
    void audio.resume();
    const now = audio.currentTime;
    [0, 0.14].forEach((offset, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(i === 0 ? 660 : 880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      osc.connect(gain).connect(audio!.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  } catch { /* ignore */ }
}

/** Critical incident alarm: a two-tone siren (high/low, three cycles), loud enough to cut through a busy booth. */
export function playAlarm() {
  try {
    if (!audio) return;
    void audio.resume();
    const now = audio.currentTime;
    for (let i = 0; i < 6; i += 1) {
      const offset = i * 0.24;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(i % 2 === 0 ? 988 : 740, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.14, now + offset + 0.015);
      gain.gain.setValueAtTime(0.14, now + offset + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.23);
    }
  } catch { /* ignore */ }
}

export function buzz(pattern: number[] = [90, 60, 90]) {
  try { navigator.vibrate?.(pattern); } catch { /* iOS Safari has no vibration API */ }
}

/** Keeps the screen on while the demo runs. Re-acquired whenever the page becomes visible again. */
export function keepAwake(): () => void {
  let lock: WakeLockSentinel | null = null;
  let disposed = false;
  const request = async () => {
    try {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      lock = await navigator.wakeLock.request('screen');
      if (disposed) void lock.release();
    } catch { /* low battery mode or unsupported: reconnect-on-visible covers us */ }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') void request(); };
  void request();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    disposed = true;
    document.removeEventListener('visibilitychange', onVisible);
    void lock?.release();
  };
}
