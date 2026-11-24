import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Captions,
  Download,
  Maximize2,
  Mic,
  MicOff,
  Music,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  VolumeX,
} from 'lucide-react';

interface PromoScene {
  id: number;
  title: string;
  start: number;
  end: number;
  narration: string;
  accent: string;
}

const TOTAL_DURATION = 52.0;

const SCENES: PromoScene[] = [
  {
    id: 0,
    title: '01 · Fısıltı',
    start: 0,
    end: 7.0,
    accent: '#00A884',
    narration:
      'İnternette kimliğini paylaşmadan, özgürce sohbet edebileceğin bir yer hayal et. Fısıltı ile tanış: Kayıt yok, iz yok, yalnızca anlık kelimeler.',
  },
  {
    id: 1,
    title: '02 · Tam Anonimlik',
    start: 7.0,
    end: 16.0,
    accent: '#25D366',
    narration:
      'Burada gerçek adın, telefonun, konumun veya IP adresin karşı tarafa asla gösterilmez. Her eşleşmede sana yepyeni bir takma ad atanır; sohbet bittiği an tüm geçmiş ekrandan ve cihazından anında silinir.',
  },
  {
    id: 2,
    title: '03 · Onay & Eşleşme',
    start: 16.0,
    end: 23.0,
    accent: '#12B886',
    narration:
      'Başlamadan önce 18 yaş ve KVKK onayları kaydedilir. İster ilgi alanlarını seç ister rastgele başla; Fısıltı seni saniyeler içinde çevrimiçi yeni biriyle buluşturur.',
  },
  {
    id: 3,
    title: '04 · Canlı Sohbet',
    start: 23.0,
    end: 33.5,
    accent: '#53BDEB',
    narration:
      'Anlık yazıyor göstergesi, mavi okundu tikleri, emojiler ve buz kırıcı sorularla akıcı bir sohbet yaşarsın. Kişisel veri içeren mesajlar otomatik gizlenir; görsel ve dosya gönderimi güvenlik için kapalıdır.',
  },
  {
    id: 4,
    title: '05 · Şikayet & Engelle',
    start: 33.5,
    end: 44.0,
    accent: '#F59E0B',
    narration:
      'Rahatsız edici biriyle karşılaşırsan tek dokunuşla sessizce engelleyebilir, bildirim gitmeden bir daha eşleşmeyi önleyebilirsin. İki tıkla şikayet ettiğinde sohbet dökümü dondurulup moderasyona iletilir; şikayet edenin kimliği kesinlikle gizli kalır.',
  },
  {
    id: 5,
    title: '06 · Banlama & Güvenlik',
    start: 44.0,
    end: 52.0,
    accent: '#F43F5E',
    narration:
      'Tekrarlayan şikayetler, tehditler veya reşit olmama şüphesi anında hız sınırına takılır ve hesaplar otomatik ya da moderatör kararıyla geçici veya kalıcı olarak banlanır. Güvenli ve iz bırakmayan sohbet için Fısıltı şimdi hazır.',
  },
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawShushLogoCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  pulse: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  const scale = size / 64;
  ctx.scale(scale, scale);
  ctx.translate(-32, -32);

  // Outer emerald squircle
  const g = ctx.createLinearGradient(8, 6, 56, 58);
  g.addColorStop(0, '#25D366');
  g.addColorStop(0.55, '#00A884');
  g.addColorStop(1, '#005C4B');
  drawRoundedRect(ctx, 3, 3, 58, 58, 18);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Whisper arcs
  const waveAlpha = 0.5 + 0.45 * Math.sin(pulse * 3);
  ctx.strokeStyle = `rgba(231, 252, 227, ${waveAlpha})`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(14.5, 23.5);
  ctx.quadraticCurveTo(11.5, 29, 14.5, 34.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(49.5, 23.5);
  ctx.quadraticCurveTo(52.5, 29, 49.5, 34.5);
  ctx.stroke();

  // Shoulders
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(15.5, 52.5);
  ctx.quadraticCurveTo(18, 39.2, 32, 39.2);
  ctx.quadraticCurveTo(46, 39.2, 48.5, 52.5);
  ctx.quadraticCurveTo(32, 59, 15.5, 52.5);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(32, 24, 10.6, 11.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Calm eyes
  ctx.strokeStyle = '#005C4B';
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.moveTo(25.4, 22.8);
  ctx.quadraticCurveTo(27.2, 21.5, 28.9, 22.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(35.1, 22.8);
  ctx.quadraticCurveTo(36.9, 21.5, 38.6, 22.8);
  ctx.stroke();

  // Index finger shush
  drawRoundedRect(ctx, 29.7, 25.8, 4.6, 14.5, 2.3);
  ctx.fillStyle = '#005C4B';
  ctx.fill();
  drawRoundedRect(ctx, 30.7, 26.8, 2.6, 14, 1.3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Hand palm
  drawRoundedRect(ctx, 26.2, 38.2, 11.6, 8.4, 4.2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#005C4B';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.restore();
}

function getSceneAt(time: number): PromoScene {
  for (let i = SCENES.length - 1; i >= 0; i--) {
    if (time >= SCENES[i].start) return SCENES[i];
  }
  return SCENES[0];
}

export function PromoVideoView({
  onStartApp,
}: {
  onStartApp: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const [hasTurkishVoice, setHasTurkishVoice] = useState<boolean>(true);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const lastFrameTsRef = useRef<number | null>(null);
  const lastSpokenSceneRef = useRef<number>(-1);
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;
  const musicEnabledRef = useRef(musicEnabled);
  musicEnabledRef.current = musicEnabled;

  // Web Audio nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const mediaDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const padOscsRef = useRef<OscillatorNode[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Check available Turkish voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setHasTurkishVoice(false);
      return;
    }
    const inspect = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      const trMatch = voices.some((v) =>
        v.lang.toLowerCase().startsWith('tr'),
      );
      setHasTurkishVoice(trMatch);
    };
    inspect();
    window.speechSynthesis.addEventListener?.('voiceschanged', inspect);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', inspect);
    };
  }, []);

  const ensureAudioEngine = useCallback(() => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.8;

    const musicGain = ctx.createGain();
    musicGain.gain.value = musicEnabledRef.current ? 0.14 : 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    // Warm cinematic pad chord (Em9 texture)
    const freqs = [82.41, 123.47, 164.81, 246.94];
    const oscs: OscillatorNode[] = [];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = f < 100 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f < 100 ? 0.35 : 0.18;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      oscs.push(osc);
    }

    filter.connect(musicGain);
    musicGain.connect(master);
    master.connect(ctx.destination);

    try {
      const dest = ctx.createMediaStreamDestination();
      master.connect(dest);
      mediaDestRef.current = dest;
    } catch {
      // MediaStreamDestination optional
    }

    audioCtxRef.current = ctx;
    masterGainRef.current = master;
    musicGainRef.current = musicGain;
    padOscsRef.current = oscs;
  }, []);

  const playSceneChime = useCallback((sceneIdx: number) => {
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master || !musicEnabledRef.current) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    const baseFreqs = [523.25, 587.33, 659.25, 698.46, 440, 392];
    const freq = baseFreqs[sceneIdx % baseFreqs.length];

    osc.type = sceneIdx >= 4 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(
      sceneIdx === 5 ? freq * 0.72 : freq * 1.18,
      now + 0.28,
    );

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.16, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.45);
  }, []);

  const speakScene = useCallback((scene: PromoScene) => {
    if (
      !voiceEnabledRef.current ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(scene.narration);
      utter.lang = 'tr-TR';
      utter.rate = 1.03;
      utter.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const turkishVoice =
        voices.find((v) => v.lang.toLowerCase() === 'tr-tr') ||
        voices.find((v) => v.lang.toLowerCase().startsWith('tr'));
      if (turkishVoice) {
        utter.voice = turkishVoice;
      }
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore synthesis error
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }, []);

  // Sync music volume when toggled or paused
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const mg = musicGainRef.current;
    if (!ctx || !mg) return;
    const target = isPlaying && musicEnabled ? 0.14 : 0;
    mg.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
  }, [isPlaying, musicEnabled]);

  // Clean up audio & speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      for (const osc of padOscsRef.current) {
        try {
          osc.stop();
        } catch {
          // ignore
        }
      }
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [stopSpeech]);

  // Canvas 60fps scene renderer
  const renderCanvasAt = useCallback((t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1280;
    const H = 720;
    const scene = getSceneAt(t);
    const sceneDur = scene.end - scene.start;
    const localT = clamp01((t - scene.start) / sceneDur);
    const localSec = Math.max(0, t - scene.start);

    // Background deep gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#071116');
    bg.addColorStop(0.55, '#0B141A');
    bg.addColorStop(1, '#091B18');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle animated grid / ambient aura
    const auraX = W * (0.5 + 0.12 * Math.cos(t * 0.4));
    const auraY = H * (0.45 + 0.08 * Math.sin(t * 0.35));
    const aura = ctx.createRadialGradient(auraX, auraY, 20, auraX, auraY, 560);
    aura.addColorStop(
      0,
      scene.id === 5
        ? 'rgba(244, 63, 94, 0.18)'
        : scene.id === 4
        ? 'rgba(245, 158, 11, 0.14)'
        : 'rgba(0, 168, 132, 0.20)',
    );
    aura.addColorStop(1, 'rgba(11, 20, 26, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, W, H);

    // Drifting emerald particles across all scenes
    for (let i = 0; i < 28; i++) {
      const px = ((i * 197 + t * (18 + (i % 5) * 6)) % (W + 80)) - 40;
      const py = ((i * 113 + Math.sin(t * 0.7 + i) * 32) % (H - 40)) + 20;
      const r = 1.5 + (i % 3);
      ctx.fillStyle =
        scene.id === 5 && i % 4 === 0
          ? 'rgba(244, 63, 94, 0.35)'
          : 'rgba(37, 211, 102, 0.26)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top-left subtle scene chapter indicator on canvas
    ctx.fillStyle = 'rgba(233, 237, 239, 0.65)';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(scene.title.toUpperCase(), 52, 54);

    // Top-right "FISILTI" mini watermark
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0, 168, 132, 0.85)';
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('FISILTI', W - 52, 54);

    // === SCENE 0: Opening & Brand Emblem ===
    if (scene.id === 0) {
      const enter = easeOutBack(localSec / 1.1);
      const textAlpha = easeOutCubic((localSec - 0.5) / 0.8);

      // Expanding acoustic rings
      for (let i = 0; i < 3; i++) {
        const waveP = ((t * 0.45 + i * 0.33) % 1);
        ctx.strokeStyle = `rgba(0, 168, 132, ${(1 - waveP) * 0.45})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(W / 2, 265, 76 + waveP * 190, 0, Math.PI * 2);
        ctx.stroke();
      }

      drawShushLogoCanvas(ctx, W / 2, 265, 136 * enter, t);

      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '800 64px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Fısılda.', W / 2, 435);

      ctx.fillStyle = '#25D366';
      ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('İz bırakmadan konuş.', W / 2, 495);

      ctx.fillStyle = '#9CB0BA';
      ctx.font = '500 22px "DM Sans", sans-serif';
      ctx.fillText(
        'Kayıtsız  ·  Gerçek Zamanlı  ·  Uçtan Uca Anonim',
        W / 2,
        552,
      );
      ctx.restore();
    }

    // === SCENE 1: Complete Anonymity ===
    else if (scene.id === 1) {
      const barrierX = W / 2;
      const slideIn = easeOutCubic(localSec / 1.0);

      // Headline
      ctx.textAlign = 'center';
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '800 42px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Kimliğin Asla Paylaşılmaz', W / 2, 118);

      // Left column: Private info blocked & dissolved
      const piiItems = [
        'Gerçek Ad ve Soyad',
        'Telefon Numarası',
        'IP Adresi & Konum',
        'Sosyal Medya & Fotoğraf',
      ];
      piiItems.forEach((label, idx) => {
        const itemP = easeOutCubic((localSec - idx * 0.35) / 0.8);
        const startX = 110 + itemP * 110;
        const y = 200 + idx * 78;
        const fadeOut = clamp01(1 - (localSec - 4.2 - idx * 0.25) / 1.0);

        ctx.save();
        ctx.globalAlpha = itemP * (0.25 + 0.75 * fadeOut);
        drawRoundedRect(ctx, startX, y, 330, 56, 14);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#FDA4AF';
        ctx.textAlign = 'left';
        ctx.font = '600 19px "DM Sans", sans-serif';
        ctx.fillText(`✕  ${label}`, startX + 20, y + 35);
        ctx.restore();
      });

      // Center laser privacy barrier
      const beamGrad = ctx.createLinearGradient(0, 175, 0, 535);
      beamGrad.addColorStop(0, 'rgba(0, 168, 132, 0)');
      beamGrad.addColorStop(0.5, '#25D366');
      beamGrad.addColorStop(1, 'rgba(0, 168, 132, 0)');
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(barrierX, 170);
      ctx.lineTo(barrierX, 540);
      ctx.stroke();

      // Barrier shield icon
      ctx.beginPath();
      ctx.arc(barrierX, 355, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#0B141A';
      ctx.fill();
      ctx.strokeStyle = '#25D366';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#25D366';
      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('GİZLİ', barrierX, 361);

      // Right card: Ephemeral assigned identity
      ctx.save();
      ctx.globalAlpha = slideIn;
      const cardX = 720;
      const cardY = 195;
      drawRoundedRect(ctx, cardX, cardY, 440, 290, 24);
      ctx.fillStyle = 'rgba(32, 44, 51, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(37, 211, 102, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Avatar circle
      ctx.beginPath();
      ctx.arc(cardX + 76, cardY + 76, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#00A884';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('GD', cardX + 76, cardY + 86);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Gizemli Deniz #84A', cardX + 132, cardY + 68);
      ctx.fillStyle = '#25D366';
      ctx.font = '500 17px "DM Sans", sans-serif';
      ctx.fillText('Her eşleşmede geçici kimlik', cardX + 132, cardY + 98);

      // Ephemeral wipe bar inside card
      const wipeProgress = easeOutCubic((localSec - 3.0) / 2.5);
      drawRoundedRect(ctx, cardX + 28, cardY + 150, 384, 108, 16);
      ctx.fillStyle = 'rgba(11, 20, 26, 0.75)';
      ctx.fill();

      ctx.fillStyle = '#9CB0BA';
      ctx.font = '500 16px "DM Sans", sans-serif';
      ctx.fillText('Sohbet sonlandığı anda:', cardX + 48, cardY + 185);
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '700 19px "DM Sans", sans-serif';
      ctx.fillText('Geçmiş & Takma Ad Anında Silinir', cardX + 48, cardY + 216);

      drawRoundedRect(ctx, cardX + 48, cardY + 234, 344 * wipeProgress, 6, 3);
      ctx.fillStyle = '#25D366';
      ctx.fill();
      ctx.restore();
    }

    // === SCENE 2: Consent & Instant Radar Matching ===
    else if (scene.id === 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '800 40px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('18+ Onaylı Giriş & Anlık Eşleşme', W / 2, 112);

      // Left: 4 Checkboxes snapping green
      const checks = [
        '18 yaşından büyüğüm (Zorunlu)',
        'Kullanım ve Topluluk Kuralları',
        'Gizlilik Politikası ve KVKK',
        'Güvenli oturum çerez onayı',
      ];
      checks.forEach((txt, i) => {
        const cP = easeOutBack((localSec - i * 0.45) / 0.5);
        const y = 185 + i * 86;
        drawRoundedRect(ctx, 110, y, 470, 64, 16);
        ctx.fillStyle = 'rgba(32, 44, 51, 0.9)';
        ctx.fill();
        ctx.strokeStyle = cP > 0.5 ? '#00A884' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Check box
        drawRoundedRect(ctx, 132, y + 17, 30, 30, 8);
        ctx.fillStyle = cP > 0.5 ? '#00A884' : '#111B21';
        ctx.fill();
        if (cP > 0.5) {
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.font = '700 18px sans-serif';
          ctx.fillText('✓', 147, y + 38);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = '#E9EDEF';
        ctx.font = '500 19px "DM Sans", sans-serif';
        ctx.fillText(txt, 180, y + 39);
      });

      // Right: Spinning radar + interest tags
      const rCx = 910;
      const rCy = 355;
      for (let ring = 1; ring <= 3; ring++) {
        ctx.strokeStyle = `rgba(0, 168, 132, ${0.42 - ring * 0.08})`;
        ctx.lineWidth = 2;
        ctx.setLineDash(ring === 2 ? [8, 8] : []);
        ctx.beginPath();
        ctx.arc(rCx, rCy, ring * 68, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Sweep line
      const angle = t * 2.4;
      const sweepGrad = ctx.createLinearGradient(
        rCx,
        rCy,
        rCx + Math.cos(angle) * 204,
        rCy + Math.sin(angle) * 204,
      );
      sweepGrad.addColorStop(0, 'rgba(37, 211, 102, 0.85)');
      sweepGrad.addColorStop(1, 'rgba(37, 211, 102, 0)');
      ctx.strokeStyle = sweepGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(rCx, rCy);
      ctx.lineTo(
        rCx + Math.cos(angle) * 204,
        rCy + Math.sin(angle) * 204,
      );
      ctx.stroke();

      // Orbiting user dots
      const orbX = rCx + Math.cos(angle + 1.4) * 136;
      const orbY = rCy + Math.sin(angle + 1.4) * 136;
      ctx.beginPath();
      ctx.arc(orbX, orbY, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#38BDF8';
      ctx.fill();

      drawShushLogoCanvas(ctx, rCx, rCy, 76, t);

      // Interest pills
      const tags = ['Müzik', 'Yazılım', 'Sinema'];
      tags.forEach((tg, i) => {
        const tx = 755 + i * 110;
        drawRoundedRect(ctx, tx, 565, 98, 36, 18);
        ctx.fillStyle = 'rgba(0, 168, 132, 0.22)';
        ctx.fill();
        ctx.strokeStyle = '#00A884';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#D9FDD3';
        ctx.font = '600 15px "DM Sans", sans-serif';
        ctx.fillText(tg, tx + 49, 588);
      });
    }

    // === SCENE 3: Live WhatsApp Messaging Showcase + Auto PII Masking ===
    else if (scene.id === 3) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Canlı Sohbet · Okundu Bilgisi & Veri Koruması', W / 2, 102);

      // Chat container card
      const cx = 210;
      const cy = 136;
      const cw = 860;
      const ch = 485;
      drawRoundedRect(ctx, cx, cy, cw, ch, 26);
      ctx.fillStyle = '#0B141A';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Chat top bar inside preview
      drawRoundedRect(ctx, cx, cy, cw, 74, 26);
      ctx.fillStyle = '#202C33';
      ctx.fill();

      // Partner avatar dot
      ctx.beginPath();
      ctx.arc(cx + 48, cy + 37, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#00A884';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('SR', cx + 48, cy + 43);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Sakin Rüzgar #21F', cx + 82, cy + 33);
      ctx.fillStyle = localSec < 1.3 ? '#25D366' : '#8696A0';
      ctx.font = '500 14px "DM Sans", sans-serif';
      ctx.fillText(
        localSec < 1.3 ? 'yazıyor...' : 'Ortak ilgi · Müzik · Sinema',
        cx + 82,
        cy + 55,
      );

      // Header action buttons: Engelle & Şikayet Et
      drawRoundedRect(ctx, cx + cw - 262, cy + 19, 102, 36, 18);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.fillStyle = '#E9EDEF';
      ctx.textAlign = 'center';
      ctx.font = '600 14px "DM Sans", sans-serif';
      ctx.fillText('Engelle', cx + cw - 211, cy + 42);

      drawRoundedRect(ctx, cx + cw - 148, cy + 19, 118, 36, 18);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
      ctx.fill();
      ctx.fillStyle = '#FDA4AF';
      ctx.font = '700 14px "DM Sans", sans-serif';
      ctx.fillText('Şikayet Et', cx + cw - 89, cy + 42);

      // Step 1 (0..1.3s): 3-dot bouncing typing bubble
      if (localSec < 1.3) {
        drawRoundedRect(ctx, cx + 32, cy + 100, 96, 44, 16);
        ctx.fillStyle = '#202C33';
        ctx.fill();
        for (let d = 0; d < 3; d++) {
          const bounce = Math.sin(t * 9 - d * 1.1) * 4;
          ctx.beginPath();
          ctx.arc(cx + 60 + d * 20, cy + 122 + bounce, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#25D366';
          ctx.fill();
        }
      }

      // Bubble 1 (partner appears at 1.2s)
      if (localSec >= 1.2) {
        const b1 = easeOutBack((localSec - 1.2) / 0.5);
        ctx.save();
        ctx.globalAlpha = clamp01(b1);
        drawRoundedRect(ctx, cx + 32, cy + 98, 430, 56, 16);
        ctx.fillStyle = '#202C33';
        ctx.fill();
        ctx.fillStyle = '#E9EDEF';
        ctx.textAlign = 'left';
        ctx.font = '500 18px "DM Sans", sans-serif';
        ctx.fillText('Selam! Hangi müzikleri dinlersin? 🎧', cx + 52, cy + 132);
        ctx.fillStyle = '#8696A0';
        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.fillText('21:42', cx + 408, cy + 144);
        ctx.restore();
      }

      // Bubble 2 (self appears at 2.4s, read receipt turns blue at 3.8s!)
      if (localSec >= 2.4) {
        const b2 = easeOutBack((localSec - 2.4) / 0.5);
        const isRead = localSec >= 3.8;
        ctx.save();
        ctx.globalAlpha = clamp01(b2);
        drawRoundedRect(ctx, cx + cw - 420, cy + 168, 388, 56, 16);
        ctx.fillStyle = '#005C4B';
        ctx.fill();
        ctx.fillStyle = '#E9EDEF';
        ctx.textAlign = 'left';
        ctx.font = '500 18px "DM Sans", sans-serif';
        ctx.fillText('Synthwave & caz favorim! ✨', cx + cw - 398, cy + 202);
        ctx.fillStyle = '#99BEB7';
        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.fillText('21:42', cx + cw - 116, cy + 214);
        ctx.fillStyle = isRead ? '#53BDEB' : '#99BEB7';
        ctx.font = '700 15px sans-serif';
        ctx.fillText(isRead ? '✓✓' : '✓', cx + cw - 64, cy + 214);
        ctx.restore();
      }

      // Icebreaker spark card at 4.3s
      if (localSec >= 4.3) {
        const ib = easeOutCubic((localSec - 4.3) / 0.5);
        ctx.save();
        ctx.globalAlpha = ib;
        drawRoundedRect(ctx, cx + cw - 510, cy + 236, 478, 50, 14);
        ctx.fillStyle = 'rgba(0, 168, 132, 0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 168, 132, 0.5)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#D9FDD3';
        ctx.font = '600 15px "DM Sans", sans-serif';
        ctx.fillText(
          '✦ Buz Kırıcı: "En son seni şaşırtan film hangisiydi?"',
          cx + cw - 490,
          cy + 266,
        );
        ctx.restore();
      }

      // Bubble 3 (PII scanner masking demo at 5.7s -> masked at 7.4s)
      if (localSec >= 5.7) {
        const b3 = easeOutCubic((localSec - 5.7) / 0.5);
        const masked = localSec >= 7.4;
        ctx.save();
        ctx.globalAlpha = b3;
        drawRoundedRect(ctx, cx + 32, cy + 300, 500, 66, 16);
        ctx.fillStyle = masked ? '#182A26' : '#2D1A20';
        ctx.fill();
        ctx.strokeStyle = masked ? '#00A884' : '#F43F5E';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = masked ? '#25D366' : '#FDA4AF';
        ctx.font = '600 18px "JetBrains Mono", monospace';
        ctx.fillText(
          masked
            ? 'Numaram [TELEFON GİZLENDİ]'
            : 'Numaram 0532 111 22 33',
          cx + 54,
          cy + 340,
        );
        ctx.restore();
      }

      // Bottom WhatsApp Composer Bar inside preview
      drawRoundedRect(ctx, cx + 18, cy + ch - 76, cw - 36, 56, 28);
      ctx.fillStyle = '#202C33';
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8696A0';
      ctx.font = '500 16px "DM Sans", sans-serif';
      ctx.fillText('☺   ✦   Bir mesaj yazın... (Yalnızca metin & emoji)', cx + 44, cy + ch - 42);

      // Send button circle inside preview
      ctx.beginPath();
      ctx.arc(cx + cw - 52, cy + ch - 48, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#00A884';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = '700 18px sans-serif';
      ctx.fillText('➤', cx + cw - 50, cy + ch - 42);
    }

    // === SCENE 4: Highlight — Two-Click Reporting & Silent Blocking ===
    else if (scene.id === 4) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '800 40px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('İki Tıkla Şikayet Et · Sessizce Engelle', W / 2, 108);

      // Left Panel: 2-Click Report Flow
      const lp = easeOutCubic(localSec / 0.8);
      ctx.save();
      ctx.globalAlpha = lp;
      drawRoundedRect(ctx, 90, 152, 530, 445, 24);
      ctx.fillStyle = 'rgba(32, 44, 51, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#FBBF24';
      ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('⚑  ŞİKAYET SİSTEMİ', 124, 204);

      const reasons = [
        'Taciz, tehdit veya hakaret',
        'Cinsel içerik veya istek',
        'Reşit olmadığını düşündüren davranış',
        'Dolandırıcılık / kişisel bilgi isteme',
      ];
      const activeIdx = Math.min(3, Math.floor(localSec / 1.8));
      reasons.forEach((r, idx) => {
        const ry = 232 + idx * 54;
        const sel = idx === activeIdx;
        drawRoundedRect(ctx, 124, ry, 462, 44, 12);
        ctx.fillStyle = sel ? 'rgba(0, 168, 132, 0.25)' : 'rgba(17, 27, 33, 0.7)';
        ctx.fill();
        ctx.strokeStyle = sel ? '#25D366' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = sel ? '#FFFFFF' : '#AEBAC1';
        ctx.font = sel ? '600 17px "DM Sans", sans-serif' : '500 17px "DM Sans", sans-serif';
        ctx.fillText(sel ? `●  ${r}` : `○  ${r}`, 144, ry + 28);
      });

      // Confirmation stamp
      const confP = easeOutBack((localSec - 3.0) / 0.8);
      drawRoundedRect(ctx, 124, 468, 462, 98, 16);
      ctx.fillStyle = 'rgba(0, 92, 75, 0.5)';
      ctx.fill();
      ctx.fillStyle = '#D9FDD3';
      ctx.font = '700 19px "DM Sans", sans-serif';
      ctx.fillText('✓  "Şikayetin alındı, incelenecek."', 146, 505);
      ctx.fillStyle = '#99BEB7';
      ctx.font = '500 15px "DM Sans", sans-serif';
      ctx.fillText(
        confP > 0.2
          ? 'Sohbet dökümü donduruldu · Şikayet eden kimliği gizli'
          : '',
        146,
        537,
      );
      ctx.restore();

      // Right Panel: Silent Block Flow
      const rp = easeOutCubic((localSec - 0.6) / 0.8);
      ctx.save();
      ctx.globalAlpha = rp;
      drawRoundedRect(ctx, 660, 152, 530, 445, 24);
      ctx.fillStyle = 'rgba(32, 44, 51, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(37, 211, 102, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#25D366';
      ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('⊘  SESSİZ ENGELLEME', 694, 204);

      // Visual separation barrier between two avatars
      ctx.beginPath();
      ctx.arc(800, 325, 42, 0, Math.PI * 2);
      ctx.fillStyle = '#00A884';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = '700 22px sans-serif';
      ctx.fillText('SEN', 800, 333);

      ctx.beginPath();
      ctx.arc(1050, 325, 42, 0, Math.PI * 2);
      ctx.fillStyle = '#374854';
      ctx.fill();
      ctx.fillStyle = '#9CB0BA';
      ctx.fillText('DİĞER', 1050, 333);

      // Shield wall slamming in middle
      const wallH = easeOutCubic((localSec - 2.2) / 0.7) * 120;
      drawRoundedRect(ctx, 921, 325 - wallH / 2, 8, wallH, 4);
      ctx.fillStyle = '#F43F5E';
      ctx.fill();

      drawRoundedRect(ctx, 694, 430, 462, 136, 16);
      ctx.fillStyle = 'rgba(17, 27, 33, 0.75)';
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#E9EDEF';
      ctx.font = '700 19px "DM Sans", sans-serif';
      ctx.fillText('• Karşı tarafa bildirim gönderilmez', 720, 470);
      ctx.fillText('• Aynı kişiyle bir daha eşleşmezsiniz', 720, 506);
      ctx.fillStyle = '#25D366';
      ctx.font = '600 16px "DM Sans", sans-serif';
      ctx.fillText('Ekranındaki sohbet geçmişi anında temizlenir.', 720, 542);
      ctx.restore();
    }

    // === SCENE 5: Highlight — Auto-Ban, Moderation & Outro ===
    else {
      const outroMix = clamp01((localSec - 5.2) / 1.4);

      if (outroMix < 0.85) {
        ctx.save();
        ctx.globalAlpha = 1 - outroMix;

        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDA4AF';
        ctx.font = '800 40px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Otomatik Koruma & Kalıcı Banlama', W / 2, 110);

        // Strike escalation meter
        const strikes = Math.min(3, 1 + Math.floor(localSec / 1.2));
        drawRoundedRect(ctx, 180, 165, 920, 145, 22);
        ctx.fillStyle = 'rgba(32, 44, 51, 0.92)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#E9EDEF';
        ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('İhlal Eşiği & Anlık Yaptırım Motoru', 220, 214);

        for (let s = 1; s <= 3; s++) {
          const bx = 220 + (s - 1) * 290;
          const hit = s <= strikes;
          drawRoundedRect(ctx, bx, 236, 265, 48, 12);
          ctx.fillStyle = hit ? '#E11D48' : '#111B21';
          ctx.fill();
          ctx.textAlign = 'center';
          ctx.fillStyle = hit ? '#FFFFFF' : '#8696A0';
          ctx.font = '700 17px "DM Sans", sans-serif';
          ctx.fillText(
            s === 1
              ? '1. Uyarı · Hız Sınırı'
              : s === 2
              ? '2. İhlal · Acil Kuyruk'
              : '3. İhlal · OTOMATİK BAN',
            bx + 132,
            266,
          );
        }

        // Three sanction badges
        const sanctions = [
          { title: 'Geçici Kısıtlama', sub: 'Tekrarlı şikayetlerde anında duraklatma' },
          { title: 'Kalıcı Ban', sub: 'Ağır ihlalde oturum & özet engelleme' },
          { title: '18 Yaş Altı Kapatma', sub: 'Şüphe halinde anında kalıcı sonlandırma' },
        ];
        sanctions.forEach((sc, idx) => {
          const sx = 180 + idx * 316;
          drawRoundedRect(ctx, sx, 345, 290, 200, 20);
          ctx.fillStyle = 'rgba(17, 27, 33, 0.9)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = '#FB7185';
          ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(sc.title, sx + 145, 420);
          ctx.fillStyle = '#9CB0BA';
          ctx.font = '500 16px "DM Sans", sans-serif';
          ctx.fillText(sc.sub.slice(0, 26), sx + 145, 466);
          ctx.fillText(sc.sub.slice(26).trim(), sx + 145, 492);
        });

        ctx.restore();
      }

      if (outroMix > 0.05) {
        ctx.save();
        ctx.globalAlpha = outroMix;
        drawShushLogoCanvas(ctx, W / 2, 260, 130, t);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 54px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Güvenle Fısılda.', W / 2, 415);
        ctx.fillStyle = '#25D366';
        ctx.font = '600 28px "DM Sans", sans-serif';
        ctx.fillText('Anonim  ·  Korumalı  ·  Moderasyonlu', W / 2, 468);
        ctx.restore();
      }
    }

    // Bottom subtle progress line inside video frame
    const pct = clamp01(t / TOTAL_DURATION);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, H - 5, W, 5);
    ctx.fillStyle = '#00A884';
    ctx.fillRect(0, H - 5, W * pct, 5);
  }, []);

  // Draw initial frame
  useEffect(() => {
    renderCanvasAt(timeRef.current);
  }, [renderCanvasAt]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTsRef.current = null;
      return;
    }

    let rafId = 0;
    const step = (ts: number) => {
      if (!playingRef.current) return;
      if (lastFrameTsRef.current === null) {
        lastFrameTsRef.current = ts;
      }
      const dt = Math.min(0.1, (ts - lastFrameTsRef.current) / 1000);
      lastFrameTsRef.current = ts;

      const nextT = timeRef.current + dt;
      if (nextT >= TOTAL_DURATION) {
        timeRef.current = TOTAL_DURATION;
        setCurrentTime(TOTAL_DURATION);
        renderCanvasAt(TOTAL_DURATION);
        playingRef.current = false;
        setIsPlaying(false);
        stopSpeech();
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
        return;
      }

      timeRef.current = nextT;
      setCurrentTime(nextT);
      renderCanvasAt(nextT);

      const scene = getSceneAt(nextT);
      if (scene.id !== lastSpokenSceneRef.current) {
        lastSpokenSceneRef.current = scene.id;
        playSceneChime(scene.id);
        speakScene(scene);
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [playSceneChime, renderCanvasAt, speakScene, stopSpeech, isPlaying]);

  function handlePlayPause() {
    ensureAudioEngine();
    if (isPlaying) {
      playingRef.current = false;
      setIsPlaying(false);
      stopSpeech();
    } else {
      if (timeRef.current >= TOTAL_DURATION - 0.1) {
        timeRef.current = 0;
        setCurrentTime(0);
        lastSpokenSceneRef.current = -1;
      }
      playingRef.current = true;
      setIsPlaying(true);
      const scene = getSceneAt(timeRef.current);
      lastSpokenSceneRef.current = scene.id;
      playSceneChime(scene.id);
      speakScene(scene);
    }
  }

  function handleReplay() {
    ensureAudioEngine();
    stopSpeech();
    timeRef.current = 0;
    setCurrentTime(0);
    lastSpokenSceneRef.current = 0;
    playingRef.current = true;
    setIsPlaying(true);
    playSceneChime(0);
    speakScene(SCENES[0]);
  }

  function handleJumpScene(scene: PromoScene) {
    ensureAudioEngine();
    timeRef.current = scene.start;
    setCurrentTime(scene.start);
    renderCanvasAt(scene.start);
    lastSpokenSceneRef.current = scene.id;
    playingRef.current = true;
    setIsPlaying(true);
    playSceneChime(scene.id);
    speakScene(scene);
  }

  function handleDownloadVideo() {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') {
      setDownloadMessage('Tarayıcınız video kaydını desteklemiyor.');
      return;
    }

    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      return;
    }

    ensureAudioEngine();
    setDownloadMessage(
      'Video baştan sona kaydediliyor... Tamamlandığında otomatik indirilecek.',
    );

    const canvasStream = canvas.captureStream(30);
    const tracks = [...canvasStream.getVideoTracks()];
    if (mediaDestRef.current) {
      tracks.push(...mediaDestRef.current.stream.getAudioTracks());
    }
    const combined = new MediaStream(tracks);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(combined, { mimeType });
    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };
    recorder.onstop = () => {
      setRecording(false);
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fisilti-tanitim.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setDownloadMessage(
        'Animasyon ve arka plan müziği "fisilti-tanitim.webm" olarak indirildi.',
      );
    };

    recorderRef.current = recorder;
    setRecording(true);
    recorder.start(500);
    handleReplay();
  }

  function handleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }

  const activeScene = getSceneAt(currentTime);
  const progressPct = clamp01(currentTime / TOTAL_DURATION) * 100;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111B21] dark:text-[#E9EDEF]">
              Fısıltı — Sesli &amp; Animasyonlu Tanıtım Filmi
            </h1>
            <p className="text-xs sm:text-sm text-[#54656F] dark:text-[#8696A0]">
              Anonimlik, akıllı veri maskeleme, iki tıkla şikayet ve otomatik banlama sistemine hızlı bakış
            </p>
          </div>

          <button
            type="button"
            onClick={onStartApp}
            className="min-h-[42px] px-5 py-2 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <span>Hemen Eşleşmeye Başla</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Cinematic Video Stage */}
        <div
          ref={stageRef}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-black/15 dark:border-white/12 bg-[#0B141A] shadow-2xl"
        >
          <div className="relative aspect-video w-full">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              onClick={handlePlayPause}
              className="w-full h-full block cursor-pointer"
            />

            {/* Synchronized Subtitles */}
            {subtitlesEnabled && (
              <div className="pointer-events-none absolute bottom-5 sm:bottom-8 inset-x-4 sm:inset-x-12 flex justify-center">
                <p className="max-w-2xl text-center rounded-xl bg-black/75 backdrop-blur-md px-4 py-2 text-xs sm:text-sm md:text-base font-medium text-white leading-snug shadow-lg">
                  {activeScene.narration}
                </p>
              </div>
            )}

            {/* Initial Overlay Start Trigger */}
            {!isPlaying && currentTime === 0 && (
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-4">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="min-h-[56px] px-7 py-3.5 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white font-semibold text-sm sm:text-base inline-flex items-center gap-2.5 shadow-[0_16px_40px_rgba(0,168,132,0.5)]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Sesli Tanıtımı Başlat ({TOTAL_DURATION} sn)</span>
                </button>
                <span className="text-xs text-white/80">
                  Türkçe sesli anlatım, efektler ve 6 animasyonlu sahne
                </span>
              </div>
            )}
          </div>

          {/* Transport Controls Bar */}
          <div className="bg-[#111B21] border-t border-white/10 px-3 sm:px-5 py-3 space-y-2.5">
            {/* Scrubber Bar */}
            <input
              type="range"
              min={0}
              max={TOTAL_DURATION}
              step={0.1}
              value={currentTime}
              aria-label="Video zaman çubuğu"
              onChange={(e) => {
                const val = Number(e.target.value);
                timeRef.current = val;
                setCurrentTime(val);
                renderCanvasAt(val);
                const nextScene = getSceneAt(val);
                if (isPlaying && nextScene.id !== lastSpokenSceneRef.current) {
                  lastSpokenSceneRef.current = nextScene.id;
                  speakScene(nextScene);
                }
              }}
              className="w-full accent-[#00A884] h-1.5 cursor-pointer"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReplay}
                  aria-label="Baştan Oynat"
                  title="Baştan Oynat"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono tabular-nums text-[#9CB0BA] px-1">
                  {Math.floor(currentTime)}s / {TOTAL_DURATION}s
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    if (!next) stopSpeech();
                    else if (isPlaying) speakScene(activeScene);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    voiceEnabled
                      ? 'bg-[#00A884]/25 text-[#25D366]'
                      : 'bg-white/10 text-[#9CB0BA]'
                  }`}
                >
                  {voiceEnabled ? (
                    <Mic className="w-3.5 h-3.5" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5" />
                  )}
                  <span>Sesli Anlatım</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMusicEnabled((v) => !v)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    musicEnabled
                      ? 'bg-[#00A884]/25 text-[#25D366]'
                      : 'bg-white/10 text-[#9CB0BA]'
                  }`}
                >
                  {musicEnabled ? (
                    <Music className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Müzik</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubtitlesEnabled((v) => !v)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    subtitlesEnabled
                      ? 'bg-[#00A884]/25 text-[#25D366]'
                      : 'bg-white/10 text-[#9CB0BA]'
                  }`}
                >
                  <Captions className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Altyazı</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    recording
                      ? 'bg-rose-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{recording ? 'Kaydı Durdur' : 'İndir (.webm)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFullscreen}
                  aria-label="Tam Ekran"
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Chapter Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SCENES.map((s) => {
            const active = activeScene.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleJumpScene(s)}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-left text-xs font-medium transition-all ${
                  active
                    ? 'border-[#00A884] bg-[#E7FCE3] dark:bg-[#005C4B]/40 text-[#008069] dark:text-[#25D366]'
                    : 'border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] text-[#54656F] dark:text-[#9CB0BA] hover:border-[#00A884]'
                }`}
              >
                {s.title}
              </button>
            );
          })}
        </div>

        {!hasTurkishVoice && (
          <p className="text-xs text-[#54656F] dark:text-[#8696A0] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00A884] shrink-0" />
            <span>
              Not: Tarayıcınızda yüklü Türkçe ses paketi bulunmazsa sistem varsayılan sesi veya senkronize altyazılar kullanılır.
            </span>
          </p>
        )}

        {downloadMessage && (
          <p className="text-xs text-[#008069] dark:text-[#25D366] font-medium">
            {downloadMessage}
          </p>
        )}

        {/* Hidden progress aria */}
        <span className="sr-only">İlerleme %{Math.round(progressPct)}</span>
      </motion.div>
    </div>
  );
}
