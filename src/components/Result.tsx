import React from 'react';
import { GameResult, Difficulty } from '../types';
import { RotateCcw, Home, Sparkles } from 'lucide-react';

interface ResultProps {
  result: GameResult;
  onReplay: () => void;
  onMenu: () => void;
  songTitle: string;
  songArtist: string;
  difficulty: Difficulty;
}

// 夢幻卡比黃色五角星
const KirbyStar = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="#FFE169" className={`${className} filter drop-shadow-[0_0_8px_rgba(255,225,105,0.7)]`}>
    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z"/>
  </svg>
);

export function Result({ result, onReplay, onMenu, songTitle, songArtist, difficulty }: ResultProps) {
  const totalNotes = result.perfects + result.greats + result.goods + result.misses;
  const accuracyNum = totalNotes > 0 
    ? ((result.perfects + result.greats * 0.8 + result.goods * 0.5) / totalNotes * 100)
    : 0;
  const accuracy = accuracyNum.toFixed(2);

  // 根據準確率計算評級 (S, A, B, C, F)
  let grade = 'F';
  let gradeColor = 'text-kirby-pink-dark glow-text-red';
  let comment = '生日演奏完成！卡比會一直為你加油！';
  
  if (accuracyNum >= 95) {
    grade = 'S';
    gradeColor = 'text-kirby-yellow glow-text-yellow'; 
    comment = '卡比為你瘋狂撒花！🎂 NANA 果然是全宇宙最無敵的音GAME大師！';
  } else if (accuracyNum >= 88) {
    grade = 'A';
    gradeColor = 'text-kirby-pink-dark glow-text-red'; 
    comment = '太厲害了！卡比送你一顆超大生日蛋糕！🎂 祝 NANA 永遠美麗動人！';
  } else if (accuracyNum >= 75) {
    grade = 'B';
    gradeColor = 'text-kirby-blue glow-text-green'; 
    comment = '超棒的律動！跟著卡比一起隨音樂快樂搖擺吧！✨';
  } else if (accuracyNum >= 60) {
    grade = 'C';
    gradeColor = 'text-kirby-border';
    comment = '演出成功！卡比給你一個溫暖的擁抱，再試一次吧！💕';
  } else {
    grade = 'F';
    gradeColor = 'text-kirby-border opacity-70';
    comment = '拍子跑掉啦，卡比用吸入超能力幫你把節奏吸回來！生日快樂！';
  }

  // 比例條計算
  const getPercent = (val: number) => {
    return totalNotes > 0 ? (val / totalNotes) * 100 : 0;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[640px] p-6 select-none bg-white relative overflow-hidden">
      
      {/* 背景大星星 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <KirbyStar className="w-[500px] h-[500px] animate-star-rotate" />
      </div>

      <div className="max-w-xl w-full bg-white p-8 md:p-10 rounded-3xl border-4 border-kirby-border text-center y2k-shadow-black relative overflow-hidden glow-border-red">
        
        {/* 卡比星星裝飾 */}
        <div className="absolute top-4 left-4 animate-star-pulse">
          <KirbyStar className="w-8 h-8" />
        </div>
        <div className="absolute bottom-4 right-4 animate-star-pulse">
          <KirbyStar className="w-8 h-8 animate-star-rotate-fast" />
        </div>

        {/* 結算報告標題 */}
        <div className="mb-6">
          <span className="text-[10px] font-mono font-bold tracking-widest text-kirby-pink-dark uppercase bg-kirby-pink-light px-3 py-1 rounded border-2 border-kirby-border y2k-shadow-black">
            🎂 NANA 生日演奏會報告 🎂
          </span>
          <h2 className="text-3xl font-black mt-3 text-kirby-border uppercase italic tracking-tight">
            HAPPY BIRTHDAY NANA
          </h2>
        </div>

        {/* 本關卡歌曲卡片 */}
        <div className="bg-white p-4 rounded-2xl border-2 border-kirby-border y2k-shadow-black mb-8 text-left">
          <div className="text-[9px] font-mono text-gray-400 uppercase">挑戰曲目</div>
          <h3 className="font-black text-lg text-kirby-border truncate uppercase">{songTitle}</h3>
          <p className="text-gray-500 text-xs truncate">{songArtist}</p>
          <div className="mt-2 text-[10px] font-mono text-kirby-pink-dark font-bold flex justify-between">
            <span>難度: {difficulty}</span>
            <span>TOTAL STARS: {totalNotes}</span>
          </div>
        </div>

        {/* 等級評價 & 分數 */}
        <div className="grid grid-cols-2 gap-4 items-center justify-center mb-8 border-b-2 border-kirby-border pb-8">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase block font-bold">RATING GRADE</span>
            <div className={`text-8xl font-black font-mono leading-none tracking-tighter select-none ${gradeColor}`}>
              {grade}
            </div>
          </div>
          <div className="text-left border-l-2 border-kirby-border pl-6">
            <span className="text-[10px] font-mono text-gray-500 uppercase block font-bold">TOTAL SCORE</span>
            <div className="text-3xl font-black text-kirby-border tracking-tight glow-text-red">
              {result.score.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 font-mono mt-1">
              ACCURACY: <span className="text-kirby-border font-bold">{accuracy}%</span>
            </div>
          </div>
        </div>

        {/* 詳細數據統計 */}
        <div className="space-y-4 mb-8 text-left">
          <div className="flex justify-between items-center text-xs font-mono font-bold">
            <span className="text-kirby-border">MAX COMBO 連擊</span>
            <span className="text-kirby-pink-dark glow-text-red font-black text-base">{result.maxCombo}</span>
          </div>

          {/* 各項判定數據比例條 */}
          <div className="bg-white p-4 rounded-2xl border-2 border-kirby-border space-y-3 shadow-inner">
            {/* Perfect */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-kirby-pink-dark">
                <span>NANA! (PERFECT)</span>
                <span>{result.perfects} ({Math.round(getPercent(result.perfects))}%)</span>
              </div>
              <div className="h-2 bg-kirby-pink-light rounded-full overflow-hidden">
                <div className="h-full bg-kirby-yellow rounded-full" style={{ width: `${getPercent(result.perfects)}%` }}></div>
              </div>
            </div>

            {/* Great */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-kirby-pink-dark">
                <span>KIRBY! (GREAT)</span>
                <span>{result.greats} ({Math.round(getPercent(result.greats))}%)</span>
              </div>
              <div className="h-2 bg-kirby-pink-light rounded-full overflow-hidden">
                <div className="h-full bg-kirby-pink-dark rounded-full" style={{ width: `${getPercent(result.greats)}%` }}></div>
              </div>
            </div>

            {/* Good */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-kirby-border">
                <span>CUTE! (GOOD)</span>
                <span>{result.goods} ({Math.round(getPercent(result.goods))}%)</span>
              </div>
              <div className="h-2 bg-kirby-pink-light rounded-full overflow-hidden">
                <div className="h-full bg-kirby-blue rounded-full" style={{ width: `${getPercent(result.goods)}%` }}></div>
              </div>
            </div>

            {/* Miss */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-gray-400">
                <span>WHOOPS (MISS)</span>
                <span>{result.misses} ({Math.round(getPercent(result.misses))}%)</span>
              </div>
              <div className="h-2 bg-kirby-pink-light rounded-full overflow-hidden">
                <div className="h-full bg-gray-300 rounded-full" style={{ width: `${getPercent(result.misses)}%` }}></div>
              </div>
            </div>
          </div>

          {/* 生日評短評 */}
          <div className="p-3 bg-kirby-pink-light rounded-xl border-2 border-kirby-border text-center font-bold text-xs text-kirby-pink-dark italic">
            &quot;{comment}&quot;
          </div>
        </div>

        {/* 按鈕控制列 */}
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <button 
            onClick={onReplay}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-kirby-pink-dark text-white font-black rounded-2xl text-sm uppercase border-2 border-kirby-border y2k-shadow-black hover:bg-kirby-pink hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex-1"
          >
            <RotateCcw size={16} />
            重新挑戰
          </button>
          
          <button 
            onClick={onMenu}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-kirby-yellow text-kirby-border font-black rounded-2xl text-sm uppercase border-2 border-kirby-border y2k-shadow-black hover:bg-yellow-300 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex-1"
          >
            <Home size={16} />
            返回大廳
          </button>
        </div>
      </div>
    </div>
  );
}
