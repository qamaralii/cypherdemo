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

/** Incident alert: a clear but calm rising three-note chime, played twice (second time softer).
 *  Urgent enough to notice at a busy booth without sounding like an alarm. */
export function playAlarm() {
  try {
    if (!audio) return;
    void audio.resume();
    const now = audio.currentTime;
    const notes = [659.25, 830.61, 987.77]; // E5, G#5, B5
    [{ at: 0, level: 0.16 }, { at: 0.75, level: 0.1 }].forEach(({ at, level }) => {
      notes.forEach((frequency, i) => {
        const start = now + at + i * 0.13;
        const osc = audio!.createOscillator();
        const gain = audio!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(level, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
        osc.connect(gain).connect(audio!.destination);
        osc.start(start);
        osc.stop(start + 0.5);
      });
    });
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
