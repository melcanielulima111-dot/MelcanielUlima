import { AppSecuritySettings } from '../types';

const SECURITY_STORAGE_KEY = 'calfex_security_settings_v2';

export const getStoredSecuritySettings = (): AppSecuritySettings => {
  try {
    const saved = localStorage.getItem(SECURITY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // If previous version had biometric mode, gracefully normalize to pin or none
      if (parsed.mode === 'biometric') {
        parsed.mode = parsed.pinCode ? 'pin' : 'none';
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading security settings', e);
  }
  return {
    mode: 'none', // Default: Livre (Sem bloqueio)
  };
};

export const saveSecuritySettings = (settings: AppSecuritySettings): void => {
  try {
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving security settings', e);
  }
};

/**
 * Audio feedback for PIN verification and unlock
 */
export const playSecuritySound = (type: 'key' | 'success' | 'error') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'key') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(783.99, now); // G5
      osc1.frequency.setValueAtTime(1046.50, now + 0.12); // C6

      osc2.frequency.setValueAtTime(783.99, now);
      osc2.frequency.setValueAtTime(1046.50, now + 0.12);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } else if (type === 'error') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // Silent on blocked AudioContext
  }
};
