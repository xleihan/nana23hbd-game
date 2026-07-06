import React, { useEffect, useRef, useState } from 'react';
import { Note, GameResult, Difficulty } from '../types';
import { Play, Sparkles } from 'lucide-react';

const TARGET_Y = 120; // 判定線的 Y 座標 (稍為往下留空)
const NOTE_SPEED = 480; // 像素/秒
const HIT_WINDOW = 0.15; // 判定時間差 (秒)

const COLUMNS = 4;
const COLUMN_WIDTH = 72;  // 稍微加寬
const COLUMN_SPACING = 16;

const KEY_MAP = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];

// 卡比馬卡龍配色：卡比深粉、無敵星黃、夢幻粉藍、夢幻紫
const TRACK_COLORS = ['#FF73A5', '#FFE169', '#84D9FF', '#D8B4FE'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 1.0 down to 0.0
}

interface GameProps {
  audioUrl: string;
  beatmap: Note[];
  onComplete: (result: GameResult) => void;
  songTitle: string;
  songArtist: string;
  difficulty: Difficulty;
}

export function Game({ audioUrl, beatmap, onComplete, songTitle, songArtist, difficulty }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [starPowerPercent, setStarPowerPercent] = useState(0);
  const [isStarModeActive, setIsStarModeActive] = useState(false);
  
  const gameState = useRef({
    notes: JSON.parse(JSON.stringify(beatmap)) as Note[],
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfects: 0,
    greats: 0,
    goods: 0,
    misses: 0,
    multiplier: 1,
    keysPressed: [false, false, false, false],
    lastHitText: '',
    lastHitTime: 0,
    lastHitColor: '#FFF',
    
    // 無敵星模式 (Star Mode) 引擎
    starGauge: 0, // 0 to 100
    starTimer: 0, // 剩餘無敵星秒數 (秒)
    
    // 粒子系統
    particles: [] as Particle[],
  });

  // 繪製卡比經典五角星
  const drawKirbyStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        cx + Math.cos(((18 + i * 72) * Math.PI) / 180 - Math.PI / 2) * r,
        cy + Math.sin(((18 + i * 72) * Math.PI) / 180 - Math.PI / 2) * r
      );
      ctx.lineTo(
        cx + Math.cos(((54 + i * 72) * Math.PI) / 180 - Math.PI / 2) * (r * 0.45),
        cy + Math.sin(((54 + i * 72) * Math.PI) / 180 - Math.PI / 2) * (r * 0.45)
      );
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };

  // 生成擊中粒子 (繽紛小星星)
  const spawnHitParticles = (x: number, y: number, color: string) => {
    const num = 12;
    for (let i = 0; i < num; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      gameState.current.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // 偏向上噴灑
        size: 5 + Math.random() * 6,
        color: color,
        life: 1.0
      });
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // 準備期 2 秒後播放
    const timer = setTimeout(() => {
      audio.play().catch(console.error);
      setIsPlaying(true);
    }, 2000);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        if (!gameState.current.keysPressed[col]) {
          gameState.current.keysPressed[col] = true;
          if (!audio.paused) {
            handleHit(col, audio.currentTime);
          }
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        gameState.current.keysPressed[col] = false;
      }
    };
    
    const activeTouches = new Map<number, { startX: number, startY: number, triggered: boolean }>();

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.set(touch.identifier, {
          startX: touch.clientX,
          startY: touch.clientY,
          triggered: false
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!audio || audio.paused) return;
      const SWIPE_THRESHOLD = 30;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchData = activeTouches.get(touch.identifier);
        
        if (touchData && !touchData.triggered) {
          const deltaX = touch.clientX - touchData.startX;
          const deltaY = touch.clientY - touchData.startY;
          
          if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_THRESHOLD) {
            touchData.triggered = true;
            let col = -1;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX < 0) col = 0; // Left
              else col = 3; // Right
            } else {
              if (deltaY > 0) col = 1; // Down
              else col = 2; // Up
            }
            
            if (col !== -1) {
              gameState.current.keysPressed[col] = true;
              setTimeout(() => {
                gameState.current.keysPressed[col] = false;
              }, 150);
              
              handleHit(col, audio.currentTime);
            }
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.delete(touch.identifier);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    
    let lastFrameTime = performance.now();
    let animationFrameId: number;
    
    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      const now = performance.now();
      const dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      
      const currentTime = audio.currentTime;
      const START_X = (canvas.width - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
      
      // 更新無敵星模式計時器
      const state = gameState.current;
      if (state.starTimer > 0) {
        state.starTimer = Math.max(state.starTimer - dt, 0);
        state.starGauge = (state.starTimer / 8) * 100;
        if (state.starTimer === 0) {
          setIsStarModeActive(false);
        }
      }
      setStarPowerPercent(Math.round(state.starGauge));

      // 1. 清空畫布 (卡比粉底)
      ctx.fillStyle = '#FFF5FA'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 無敵星模式專屬背景：夢幻彩虹滑行與飄浮
      const isStarMode = state.starTimer > 0;
      if (isStarMode) {
        // 彩虹動態背景
        const gradBg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const shift = (now / 1500) % 1;
        gradBg.addColorStop(0, `hsla(${(shift * 360) % 360}, 90%, 93%, 0.8)`);
        gradBg.addColorStop(0.5, `hsla(${(shift * 360 + 120) % 360}, 90%, 93%, 0.8)`);
        gradBg.addColorStop(1, `hsla(${(shift * 360 + 240) % 360}, 90%, 93%, 0.8)`);
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 夢幻飄浮小五角星
        ctx.save();
        for (let j = 0; j < 6; j++) {
          const sx = (j * 150 + Math.sin(now / 400 + j) * 30) % canvas.width;
          const sy = (j * 100 + now / 15) % canvas.height;
          drawKirbyStar(ctx, sx, sy, 8 + j, `rgba(255, 225, 105, 0.45)`);
        }
        ctx.restore();
      } else {
        // 普通夢幻粉紅格線
        ctx.strokeStyle = 'rgba(255, 115, 165, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      }
      
      // 2. 繪製 4 條軌道背景
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        
        const grad = ctx.createLinearGradient(x, 0, x + COLUMN_WIDTH, 0);
        grad.addColorStop(0, isStarMode ? 'rgba(255, 183, 213, 0.2)' : '#FFFFFF');
        grad.addColorStop(0.5, isStarMode ? 'rgba(255, 225, 105, 0.15)' : '#FFF9FC');
        grad.addColorStop(1, isStarMode ? 'rgba(255, 183, 213, 0.2)' : '#FFFFFF');
        
        ctx.fillStyle = grad; 
        ctx.fillRect(x, 0, COLUMN_WIDTH, canvas.height);
        
        ctx.strokeStyle = isStarMode ? TRACK_COLORS[i] : 'rgba(108, 66, 88, 0.12)';
        ctx.lineWidth = isStarMode ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.moveTo(x + COLUMN_WIDTH, 0);
        ctx.lineTo(x + COLUMN_WIDTH, canvas.height);
        ctx.stroke();
      }
      
      // 3. 繪製判定線與目標判定點 (雲朵感圓角 Targets)
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        const isPressed = state.keysPressed[i];
        
        if (isPressed || isStarMode) {
          ctx.shadowColor = TRACK_COLORS[i];
          ctx.shadowBlur = isPressed ? 20 : 8;
        }
        
        ctx.fillStyle = isPressed ? TRACK_COLORS[i] : '#FFFFFF';
        ctx.strokeStyle = '#6C4258'; // 經典粉褐色邊框
        ctx.lineWidth = isPressed ? 4.5 : 3;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, TARGET_Y, COLUMN_WIDTH, COLUMN_WIDTH, 18); // 更蓬鬆的圓角
        } else {
          ctx.rect(x, TARGET_Y, COLUMN_WIDTH, COLUMN_WIDTH);
        }
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // 目標提示方向鍵
        ctx.fillStyle = isPressed ? '#FFFFFF' : '#6C4258';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const hint = ['←', '↓', '↑', '→'][i];
        ctx.fillText(hint, x + COLUMN_WIDTH / 2, TARGET_Y + COLUMN_WIDTH / 2 + 1);
      }
      
      // 4. 繪製音符 (Notes) - 可愛卡比五角星
      for (const note of state.notes) {
        if (note.hit || note.missed) continue;
        
        const y = TARGET_Y + (note.time - currentTime) * NOTE_SPEED;
        
        if (currentTime - note.time > HIT_WINDOW) {
          note.missed = true;
          state.combo = 0;
          state.multiplier = 1;
          state.misses++;
          state.lastHitText = 'WHOOPS...';
          state.lastHitColor = '#9A8390';
          state.lastHitTime = performance.now();
          
          state.starGauge = Math.max(state.starGauge - 12, 0);
          continue;
        }
        
        if (y > -COLUMN_WIDTH && y < canvas.height) {
          const x = START_X + note.column * (COLUMN_WIDTH + COLUMN_SPACING);
          const cx = x + COLUMN_WIDTH / 2;
          const cy = y + COLUMN_WIDTH / 2;
          
          ctx.save();
          // 五角星外發光
          ctx.shadowColor = '#FF85B3';
          ctx.shadowBlur = 8;
          
          // 音符底框 (蓬鬆圓角)
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#FF73A5';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, COLUMN_WIDTH, COLUMN_WIDTH, 18);
          } else {
            ctx.rect(x, y, COLUMN_WIDTH, COLUMN_WIDTH);
          }
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // 音符中央黃色卡比五角星
          drawKirbyStar(ctx, cx, cy, 20, '#FFE169');
          // 畫亮白核心
          drawKirbyStar(ctx, cx, cy, 9, '#FFFFFF');
          ctx.restore();
        }
      }
      
      // 5. 更新並繪製擊中粒子系統 (小星星與彩色氣泡)
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // 重力稍微輕飄一點
        p.life -= dt * 2.0;
        
        if (p.life <= 0) {
          state.particles.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = p.life;
        drawKirbyStar(ctx, p.x, p.y, p.size * p.life, p.color);
        ctx.restore();
      }
      
      // 6. 繪製 Hit 判定文字評級 (夢幻可愛大字)
      if (performance.now() - state.lastHitTime < 500) {
        const elapsed = performance.now() - state.lastHitTime;
        const scale = 1.25 - (elapsed / 500) * 0.25;
        const alpha = 1.0 - (elapsed / 500);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = state.lastHitColor;
        ctx.shadowBlur = 20;
        
        ctx.fillStyle = state.lastHitColor;
        ctx.font = 'black 54px Arial Black, Comic Sans MS, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.translate(canvas.width / 2, TARGET_Y + 220);
        ctx.scale(scale, scale);
        ctx.transform(1, 0, -0.05, 1, 0, 0); 
        
        ctx.fillText(state.lastHitText, 0, 0);
        
        // 粉褐色邊框
        ctx.strokeStyle = '#6C4258';
        ctx.lineWidth = 3;
        ctx.strokeText(state.lastHitText, 0, 0);
        
        ctx.restore();
      }
      
      // 7. 繪製準備開始 Countdown (慶生風)
      if (!isPlaying) {
        ctx.fillStyle = 'rgba(255, 240, 245, 0.88)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.globalAlpha = 0.4;
        drawKirbyStar(ctx, canvas.width / 2, canvas.height / 2 - 40, 160, '#FFE169');
        ctx.restore();
        
        ctx.fillStyle = '#FF73A5';
        ctx.font = 'black 48px Comic Sans MS, Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GET READY!', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.fillStyle = '#6C4258';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('🌸 祝 NANA 生日快樂！準備開始演奏會 🌸', canvas.width / 2, canvas.height / 2 + 30);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  const handleHit = (col: number, currentTime: number) => {
    const state = gameState.current;
    
    let closestNote: Note | null = null;
    let minDiff = HIT_WINDOW;
    
    for (const note of state.notes) {
      if (note.column === col && !note.hit && !note.missed) {
        const diff = Math.abs(note.time - currentTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = note;
        }
      }
    }
    
    if (closestNote) {
      closestNote.hit = true;
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;
      
      if (state.combo >= 50) state.multiplier = 4;
      else if (state.combo >= 20) state.multiplier = 3;
      else if (state.combo >= 10) state.multiplier = 2;
      else state.multiplier = 1;
      
      let points = 0;
      let hitRating = 'CUTE!';
      let hitColor = '#84D9FF';
      let addGauge = 2;
      
      if (minDiff < 0.05) {
        points = 300;
        state.perfects++;
        hitRating = 'NANA!';
        hitColor = '#FFE169'; // 黃金無敵星發光
        addGauge = 10;
      } else if (minDiff < 0.10) {
        points = 150;
        state.greats++;
        hitRating = 'KIRBY!';
        hitColor = '#FF73A5'; // 卡比粉紅
        addGauge = 6;
      } else {
        points = 50;
        state.goods++;
        hitRating = 'CUTE!';
        hitColor = '#84D9FF'; // 夢幻藍
        addGauge = 3;
      }
      
      if (state.starTimer === 0) {
        state.starGauge = Math.min(state.starGauge + addGauge, 100);
        
        if (state.starGauge >= 100) {
          state.starTimer = 8.0; 
          setIsStarModeActive(true);
          const START_X = (800 - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
          const hitX = START_X + col * (COLUMN_WIDTH + COLUMN_SPACING) + COLUMN_WIDTH / 2;
          spawnHitParticles(hitX, TARGET_Y + COLUMN_WIDTH / 2, '#FFE169');
        }
      }
      
      const actualMultiplier = state.starTimer > 0 ? state.multiplier * 2 : state.multiplier;
      state.score += points * actualMultiplier;
      
      state.lastHitText = hitRating;
      state.lastHitColor = hitColor;
      state.lastHitTime = performance.now();
      
      const START_X = (800 - (COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING)) / 2;
      const hitX = START_X + col * (COLUMN_WIDTH + COLUMN_SPACING) + COLUMN_WIDTH / 2;
      spawnHitParticles(hitX, TARGET_Y + COLUMN_WIDTH / 2, hitColor);
    }
  };

  const handleAudioEnded = () => {
    const state = gameState.current;
    onComplete({
      score: state.score,
      combo: state.combo,
      maxCombo: state.maxCombo,
      perfects: state.perfects,
      greats: state.greats,
      goods: state.goods,
      misses: state.misses,
    });
  };

  const currentMultiplier = isStarModeActive 
    ? gameState.current.multiplier * 2 
    : gameState.current.multiplier;

  return (
    <div className="flex flex-col md:flex-row items-stretch justify-center bg-white min-h-[640px] text-black w-full select-none overflow-hidden relative">
      <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} />
      
      {/* 遊戲 Canvas 渲染區 */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={680} 
          className="border-4 border-kirby-border rounded-3xl shadow-2xl bg-white max-w-full h-auto max-h-[80vh] glow-border-red" 
        />
      </div>
      
      {/* 右側儀表板面盤 (卡比粉紅夢幻面板) */}
      <div className="w-full md:w-64 bg-kirby-pink-light/30 border-t-4 md:border-t-0 md:border-l-4 border-kirby-border p-6 flex flex-col justify-between relative z-10 text-kirby-border">
        
        {/* 右上角裝飾無敵星 */}
        <div className="absolute top-4 right-4 animate-star-pulse">
          <svg viewBox="0 0 24 24" fill="#FFE169" className="w-8 h-8 filter drop-shadow-md">
            <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z"/>
          </svg>
        </div>

        <div className="space-y-6 text-left">
          {/* 當前歌曲卡片 */}
          <div className="bg-white p-4 rounded-2xl border-2 border-kirby-border y2k-shadow-black">
            <div className="text-[9px] font-mono text-kirby-pink-dark uppercase tracking-widest mb-1">正在播放生日音軌</div>
            <h4 className="font-black text-sm uppercase text-kirby-border truncate">{songTitle}</h4>
            <p className="text-gray-500 text-xs truncate">{songArtist}</p>
            <div className="mt-2 text-[10px] font-mono font-bold text-gray-400 uppercase flex justify-between">
              <span>難度: {difficulty}</span>
              <span className="text-kirby-blue font-black">LOCAL</span>
            </div>
          </div>

          {/* 分數 / Combo 儀表 */}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">SCORE 演奏分數</span>
              <div className="text-3xl font-black text-kirby-border tracking-tighter glow-text-red">
                {gameState.current.score.toLocaleString()}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">COMBO 連擊</span>
                <div className="text-2xl font-black text-kirby-pink-dark tracking-tight glow-text-red">
                  {gameState.current.combo}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">MULTIPLIER</span>
                <div className="text-2xl font-black text-kirby-yellow flex items-center gap-1 glow-text-yellow">
                  x{currentMultiplier}
                  {isStarModeActive && <Sparkles size={16} className="text-kirby-pink-dark animate-pulse" />}
                </div>
              </div>
            </div>
          </div>

          {/* STAR POWER 無敵星計量器 */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-mono font-black tracking-widest text-kirby-pink-dark uppercase flex items-center gap-1">
                ⭐ STAR POWER
              </span>
              <span className={`text-[10px] font-mono font-bold ${isStarModeActive ? 'text-kirby-pink-dark animate-pulse' : 'text-gray-400'}`}>
                {isStarModeActive ? 'STAR MODE ACTIVE' : `${starPowerPercent}%`}
              </span>
            </div>
            
            <div className="h-6 bg-white border-2 border-kirby-border rounded-xl overflow-hidden p-0.5 relative">
              <div 
                className={`h-full rounded-lg transition-all duration-100 ${
                  isStarModeActive 
                    ? 'bg-gradient-to-r from-kirby-pink via-kirby-yellow to-kirby-blue animate-pulse' 
                    : 'bg-kirby-yellow'
                }`}
                style={{ width: `${starPowerPercent}%` }}
              ></div>
              <div className="absolute inset-0 bg-black/5 y2k-noise pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* 底部操作指南 */}
        <div className="mt-8 text-xs text-gray-500 font-mono border-t border-kirby-border pt-4 text-left">
          <p className="font-bold text-kirby-pink-dark uppercase mb-1">小貼士：</p>
          <p className="hidden md:block leading-relaxed">請使用鍵盤 <span className="text-kirby-border font-bold">← ↓ ↑ →</span> 精準敲打星星！</p>
          <p className="md:hidden leading-relaxed">在畫面中上下左右滑動，彈指間擊碎星星！</p>
          
          {isStarModeActive && (
            <div className="mt-3 px-3 py-2 bg-gradient-to-br from-kirby-yellow/20 to-transparent border border-kirby-yellow rounded-xl text-kirby-pink-dark font-black text-center animate-pulse text-[11px]">
              🌟 無敵星發光中！所有得分 x2 倍！
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
