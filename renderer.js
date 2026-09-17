const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
const info = document.getElementById("info");

/* ------------------------------------------------------------------ *
 *  Themes — cycle with Cmd/Ctrl+Shift+C
 * ------------------------------------------------------------------ */
const themes = [
  { name: 'Ice Blue',     core: [220,240,255], glow: [120,180,255], halo: [100,160,255] },
  { name: 'Neon Purple',  core: [230,220,255], glow: [170,120,255], halo: [140,90,255]  },
  { name: 'Hot Pink',     core: [255,220,240], glow: [255,120,190], halo: [255,90,160]  },
  { name: 'Cyber Green',  core: [220,255,230], glow: [120,255,170], halo: [90,255,140]  },
  { name: 'Sunset',       core: [255,230,210], glow: [255,150,80],  halo: [255,120,50]  },
  { name: 'Crimson',      core: [255,215,215], glow: [255,90,90],   halo: [255,60,60]   },
  { name: 'Gold',         core: [255,245,210], glow: [255,200,80],  halo: [255,180,50]  },
  { name: 'Aqua',         core: [215,255,255], glow: [70,235,235],  halo: [40,200,215]  },
  { name: 'Lava',         core: [255,225,205], glow: [255,110,45],  halo: [225,60,20]   },
  { name: 'Emerald',      core: [215,255,235], glow: [50,220,150],  halo: [20,180,120]  },
  { name: 'Fuchsia',      core: [255,220,250], glow: [235,70,220],  halo: [195,40,190]  },
  { name: 'Lime',         core: [245,255,210], glow: [190,255,70],  halo: [150,225,30]  },
  { name: 'Deep Ocean',   core: [215,225,255], glow: [70,120,255],  halo: [40,80,235]   },
  { name: 'Rose Gold',    core: [255,235,225], glow: [255,165,140], halo: [235,120,105] },
  { name: 'Monochrome',   core: [255,255,255], glow: [220,220,220], halo: [180,180,180] },
];

// Restore last-used theme so it persists across restarts.
let currentTheme = themes[0];
try {
  const saved = localStorage.getItem('mv-theme');
  const match = themes.find(t => t.name === saved);
  if (match) currentTheme = match;
} catch { /* localStorage may be unavailable */ }

// Briefly show the theme name so you know which one you cycled to.
let nameTimer = null;
function flashThemeName(theme) {
  if (!info) return;
  info.textContent = theme.name;
  info.style.color = `rgba(${theme.core.join(',')},0.9)`;
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => { info.textContent = ''; }, 1200);
}

function selectTheme(theme) {
  currentTheme = theme;
  try { localStorage.setItem('mv-theme', theme.name); } catch { /* ignore */ }
  flashThemeName(theme);
}

// Cmd/Ctrl+Shift+C cycles to the next theme.
window.electronAPI.onCycleTheme(() => {
  const next = (themes.indexOf(currentTheme) + 1) % themes.length;
  selectTheme(themes[next]);
});

/* ------------------------------------------------------------------ *
 *  Canvas sizing (DPR-capped for efficiency)
 * ------------------------------------------------------------------ */
let viewW = 0, viewH = 0;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR: keeps it light on Retina
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  canvas.style.width = viewW + 'px';
  canvas.style.height = viewH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
}

/* ------------------------------------------------------------------ *
 *  Signal helpers
 * ------------------------------------------------------------------ */
// Draw a silky curve through the points using Catmull-Rom -> Bézier.
function drawSmoothCurve(points) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.stroke();
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ------------------------------------------------------------------ *
 *  Visualizer state
 * ------------------------------------------------------------------ */
let level = 0;    // overall loudness, smoothed 0..1
let bass = 0;     // low-end energy, smoothed 0..1
const bands = new Float32Array(64); // per-band smoothed magnitudes (the humps)

function visualizer(analyser, timeData, freqData) {
  analyser.getByteTimeDomainData(timeData);
  analyser.getByteFrequencyData(freqData);

  // --- Overall energy (drives glow, thickness, "beat" feel) ---
  let sumSq = 0;
  for (let i = 0; i < timeData.length; i++) {
    const d = (timeData[i] - 128) / 128;
    sumSq += d * d;
  }
  const rms = Math.sqrt(sumSq / timeData.length); // ~0..1
  const targetLevel = clamp(rms * 3.2, 0, 1);
  level += (targetLevel - level) * (targetLevel > level ? 0.5 : 0.08); // fast attack, slow release

  // --- Bass energy from the low frequency bins ---
  const bassBins = Math.max(1, Math.floor(freqData.length * 0.08));
  let bassSum = 0;
  for (let i = 0; i < bassBins; i++) bassSum += freqData[i];
  const targetBass = clamp((bassSum / bassBins) / 255 * 1.4, 0, 1);
  bass += (targetBass - bass) * (targetBass > bass ? 0.6 : 0.12);

  // --- Layout: pinned to a stable bottom band so picker/resize never shifts it ---
  const width = viewW;
  const height = viewH;
  const strip = Math.min(height, 120);
  const centerY = height - strip / 2;
  const maxAmp = (strip / 2) * 0.92;

  // --- Build the spectrum: one hump per frequency band ---
  // The number of humps scales with width so each stays roughly as tall as it
  // is wide. NO scrolling — the humps rise and fall IN PLACE with the music,
  // which is what actually reads as "visualizing".
  const HUMP_PX = 58; // desired hump spacing (tune for taller/shorter humps)
  const N = clamp(Math.round(width / HUMP_PX), 6, bands.length);
  const usableBins = Math.floor(freqData.length * 0.7); // skip near-silent top end
  const FLOOR = 0.14; // noise gate: below this a band drops to zero (contrast)

  for (let k = 0; k < N; k++) {
    // Log-ish mapping so bass isn't crammed into one bin.
    const lo = Math.floor(Math.pow(k / N, 1.7) * usableBins);
    const hi = Math.max(lo + 1, Math.floor(Math.pow((k + 1) / N, 1.7) * usableBins));
    // Use the PEAK in the band, not the average — averaging blurs every band
    // toward the same value ("breathing"); the peak keeps them distinct.
    let peak = 0;
    for (let j = lo; j < hi; j++) if (freqData[j] > peak) peak = freqData[j];
    let v = peak / 255;
    v = clamp((v - FLOOR) / (1 - FLOOR), 0, 1);        // gate + rescale for contrast
    v = Math.pow(v, 0.75);                              // lift the mids so they read
    v = clamp(v * (1 + (k / N) * 1.8), 0, 1);           // treble tilt: highs get a boost
    // Fast rise (snaps up on a hit), quicker fall so it doesn't just "breathe".
    bands[k] += (v - bands[k]) * (v > bands[k] ? 0.7 : 0.22);
  }

  // Alternate humps up/down so the line weaves across the centre like waves,
  // then spline through them for smooth rounded humps.
  const points = [{ x: 0, y: centerY }];
  for (let k = 0; k < N; k++) {
    const nx = (k + 0.5) / N;
    const x = nx * width;
    const envelope = Math.sin(nx * Math.PI); // fade both ends toward the centre line
    const sign = k % 2 === 0 ? 1 : -1;
    const value = bands[k] * envelope * sign;
    const y = clamp(centerY - value * maxAmp, centerY - maxAmp, centerY + maxAmp);
    points.push({ x, y });
  }
  points.push({ x: width, y: centerY });

  // --- Render ---
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const pulse = 1 + level * 0.9 + bass * 0.6; // thickness/energy reaction

  function makeFadeGradient(r, g, b, peakAlpha) {
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0,    `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.12, `rgba(${r},${g},${b},${peakAlpha})`);
    grad.addColorStop(0.88, `rgba(${r},${g},${b},${peakAlpha})`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
    return grad;
  }

  // Outer halo
  ctx.save();
  ctx.strokeStyle = makeFadeGradient(...currentTheme.halo, 0.12 + level * 0.1);
  ctx.lineWidth = 12 * pulse;
  ctx.shadowBlur = 24 + bass * 22;
  ctx.shadowColor = `rgb(${currentTheme.halo.join(',')})`;
  drawSmoothCurve(points);
  ctx.restore();

  // Mid glow
  ctx.save();
  ctx.strokeStyle = makeFadeGradient(...currentTheme.glow, 0.45 + level * 0.2);
  ctx.lineWidth = 5 * pulse;
  ctx.shadowBlur = 14 + level * 10;
  ctx.shadowColor = `rgb(${currentTheme.glow.join(',')})`;
  drawSmoothCurve(points);
  ctx.restore();

  // Bright core
  ctx.save();
  ctx.strokeStyle = makeFadeGradient(...currentTheme.core, 0.95);
  ctx.lineWidth = 2 + pulse * 0.6;
  ctx.shadowBlur = 6;
  ctx.shadowColor = `rgb(${currentTheme.core.join(',')})`;
  drawSmoothCurve(points);
  ctx.restore();

  requestAnimationFrame(() => visualizer(analyser, timeData, freqData));
}

/* ------------------------------------------------------------------ *
 *  Audio input (system audio via BlackHole)
 * ------------------------------------------------------------------ */
async function findBlackholeId() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const blackhole = devices.find(
    d => d.kind === 'audioinput' && d.label.toLowerCase().includes('blackhole')
  );
  return blackhole?.deviceId;
}

async function createAnalyser(stream) {
  const audioContext = new AudioContext();
  if (audioContext.state === 'suspended') await audioContext.resume();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.65; // snappier response (higher = more sluggish/"breathing")
  audioContext.createMediaStreamSource(stream).connect(analyser);
  return analyser;
}

function showMessage(text) {
  if (info) info.textContent = text;
}

async function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  try {
    // 1. Ask for audio permission FIRST — macOS hides device labels until it's
    //    granted, so we can't find BlackHole by name before this. (This is what
    //    previously made a cold first launch miss BlackHole.)
    const permStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 2. Labels are now visible — locate the BlackHole input.
    const blackholeId = await findBlackholeId();

    // 3. Prefer BlackHole; otherwise fall back to the default input we already have.
    let stream = permStream;
    if (blackholeId) {
      permStream.getTracks().forEach(t => t.stop()); // release the temporary stream
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: blackholeId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      showMessage('');
    } else {
      showMessage('BlackHole not found — route system audio through BlackHole to visualize it.');
    }

    const analyser = await createAnalyser(stream);
    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    visualizer(analyser, timeData, freqData);
  } catch (err) {
    showMessage('No audio input available. Grant microphone/audio permission, then relaunch.');
    console.error(err);
  }
}

init();
