import { useEffect, useRef } from 'react';
import './FireAlertOverlay.css';

// ─── Pre-warm audio playback ─────────────────────────────────────────────
// Browsers block audio until a user gesture occurs. We pre-load the siren
// audio file on the very first click/tap/keypress so it's ready to play
// instantly when a fire alert arrives.
let sirenAudio = null;

function getOrCreateSirenAudio() {
  if (!sirenAudio) {
    sirenAudio = new Audio('/fire-siren.mpeg');
    sirenAudio.loop = true;
    sirenAudio.volume = 1.0;
    // Pre-load the audio data so playback starts without delay
    sirenAudio.load();
  }
  return sirenAudio;
}

// Pre-warm: attach a one-time listener to the document so the very first
// user interaction pre-loads the audio — even minutes before a fire alert.
if (typeof document !== 'undefined') {
  const warmUp = () => {
    getOrCreateSirenAudio();
    document.removeEventListener('click', warmUp);
    document.removeEventListener('touchstart', warmUp);
    document.removeEventListener('keydown', warmUp);
  };
  document.addEventListener('click', warmUp, { once: true });
  document.addEventListener('touchstart', warmUp, { once: true });
  document.addEventListener('keydown', warmUp, { once: true });
}

/**
 * FireAlertOverlay — Full-screen emergency alert overlay.
 * Renders on top of EVERYTHING when a fire is detected.
 * Plays the custom fire-siren.mpeg audio on loop while active.
 */
export default function FireAlertOverlay({ active }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (active) {
      // ── Start custom siren audio ──────────────────────────────────────
      try {
        const siren = getOrCreateSirenAudio();
        siren.currentTime = 0;
        siren.play().catch((e) => {
          console.warn('[FireAlert] Audio playback blocked:', e);
        });
        audioRef.current = siren;
      } catch (e) {
        console.warn('[FireAlert] Audio not available:', e);
      }
    }

    return () => {
      // ── Stop siren audio ──────────────────────────────────────────────
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fire-alert-overlay" role="alert" aria-live="assertive">
      {/* Animated background layers */}
      <div className="fire-alert-bg-pulse" />
      <div className="fire-alert-bg-pulse fire-alert-bg-pulse--delayed" />

      <div className="fire-alert-content">
        {/* Fire icon with glow */}
        <div className="fire-alert-icon-container">
          <span className="fire-alert-icon">🔥</span>
          <div className="fire-alert-icon-ring" />
          <div className="fire-alert-icon-ring fire-alert-icon-ring--delayed" />
        </div>

        <h1 className="fire-alert-title">FIRE DETECTED</h1>
        <p className="fire-alert-subtitle">
          🚨 EMERGENCY — Fire detected in the garden!
        </p>
        <p className="fire-alert-instruction">
          Evacuate immediately and call emergency services
        </p>

        <div className="fire-alert-timestamp">
          Alert triggered at {new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
