import React, { useState, useEffect } from 'react';
import { Menu } from './components/Menu';
import { Game } from './components/Game';
import { Result } from './components/Result';
import { Note, GameResult, Difficulty } from './types';
import { LibrarySong, loadLibrarySongs } from './game/songs';
import { generateBeatmap } from './game/beatDetector';

type AppState = 'menu' | 'loading' | 'playing' | 'result';

export default function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [selectedSong, setSelectedSong] = useState<LibrarySong | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [beatmap, setBeatmap] = useState<Note[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('初始化中...');

  // 元件載入時讀取本地歌曲清單
  useEffect(() => {
    async function initSongs() {
      try {
        const list = await loadLibrarySongs();
        setSongs(list);
      } catch (err) {
        console.error("載入本機歌曲庫失敗:", err);
        setErrorMsg("載入本機歌曲清單失敗，請確認是否已生成 songs.json。");
      }
    }
    initSongs();
  }, []);

  /**
   * 選擇內建歌曲遊玩
   */
  const handleSelectLibrarySong = async (song: LibrarySong, selectedDiff: Difficulty) => {
    console.info("handleSelectLibrarySong called", { songId: song.id, songTitle: song.title, diff: selectedDiff });
    setSelectedSong(song);
    setDifficulty(selectedDiff);
    setAppState('loading');
    setErrorMsg(null);

    try {
      setLoadingStep('正在讀取本機慶生歌單...');
      const response = await fetch(song.audioUrl);
      if (!response.ok) {
        throw new Error(`無法載入音訊檔案: ${response.statusText}`);
      }
      
      setLoadingStep('正在解析音軌的甜度與糖分 (PCM)...');
      const arrayBuffer = await response.arrayBuffer();
      
      setLoadingStep('正在初始化卡比音樂解碼器...');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      setLoadingStep('卡比正在吸入節奏波形 (Onset)...');
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      setLoadingStep('正在播撒彩虹五角星譜面...');
      const generatedBeatmap = generateBeatmap(audioBuffer, selectedDiff);
      
      if (generatedBeatmap.length === 0) {
        throw new Error("本機音訊分析失敗，無法產生有效節奏點。");
      }

      setAudioUrl(song.audioUrl);
      // 過濾掉前 3 秒以內（符合原本遊戲邏輯）
      const filteredBeatmap = generatedBeatmap.filter(n => n.time >= 3);
      setBeatmap(filteredBeatmap);
      
      setLoadingStep('傳送之星已就緒！無敵星模式即將開啟！');
      setTimeout(() => {
        setAppState('playing');
      }, 800);
      
    } catch (error) {
      console.error("Error loading library song:", error);
      setErrorMsg('解析音訊失敗: ' + (error as Error).message);
      setAppState('menu');
    }
  };

  /**
   * 選擇自訂上傳歌曲遊玩
   */
  const handleSelectCustomSong = async (file: File, selectedDiff: Difficulty) => {
    console.info("handleSelectCustomSong called", { fileName: file.name, diff: selectedDiff });
    
    // 如果有先前的自訂歌曲 URL，先釋放以防洩漏
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    const customSongName = file.name.replace(/\.[^/.]+$/, ""); // 去掉副檔名

    const customSong: LibrarySong = {
      id: 'custom-' + Date.now(),
      index: 'CUSTOM',
      title: customSongName,
      artist: '自訂上傳歌曲',
      audioUrl: objectUrl,
      fileName: file.name,
      defaultDifficulty: selectedDiff
    };

    setSelectedSong(customSong);
    setDifficulty(selectedDiff);
    setAppState('loading');
    setErrorMsg(null);

    try {
      setLoadingStep('正在讀取上傳音軌檔案...');
      const arrayBuffer = await file.arrayBuffer();
      
      setLoadingStep('正在初始化卡比音樂解碼器...');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      setLoadingStep('卡比正在吸入節奏波形 (Onset)...');
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      setLoadingStep('正在播撒彩虹五角星譜面...');
      const generatedBeatmap = generateBeatmap(audioBuffer, selectedDiff);
      
      if (generatedBeatmap.length === 0) {
        throw new Error("自訂音訊分析失敗，無法產生有效節奏點。");
      }

      setAudioUrl(objectUrl);
      // 過濾掉前 3 秒以內（符合原本遊戲邏輯）
      const filteredBeatmap = generatedBeatmap.filter(n => n.time >= 3);
      setBeatmap(filteredBeatmap);
      
      setLoadingStep('自訂音軌吸收成功！無敵星即將開啟！');
      setTimeout(() => {
        setAppState('playing');
      }, 800);
      
    } catch (error) {
      console.error("Error processing custom song:", error);
      setErrorMsg('解析自訂音訊失敗: ' + (error as Error).message);
      // 如果失敗，釋放剛剛建立的 URL
      URL.revokeObjectURL(objectUrl);
      setAppState('menu');
    }
  };

  /**
   * 遊戲完成時處理
   */
  const handleGameComplete = (result: GameResult) => {
    console.info("handleGameComplete called", { result });
    setGameResult({
      ...result,
      beatmap: beatmap
    });
    setAppState('result');
  };

  /**
   * 重新遊玩
   */
  const handleReplay = () => {
    console.info("handleReplay called");
    const resetBeatmap = beatmap.map(note => ({ ...note, hit: false, missed: false }));
    setBeatmap(resetBeatmap);
    setGameResult(null);
    setAppState('playing');
  };

  /**
   * 返回主選單
   */
  const handleRestart = () => {
    console.info("handleRestart called");
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAppState('menu');
    setAudioUrl(null);
    setBeatmap([]);
    setGameResult(null);
  };

  return (
    <div className="min-h-screen bg-kirby-pink-light y2k-grid-bg text-black flex items-center justify-center p-4 md:p-8 crt-scanlines">
      {/* 夢幻天空彩虹飄浮 */}
      <div className="y2k-perspective-grid"></div>
      
      {/* 卡比夢幻視窗外框 */}
      <div className="relative w-full max-w-6xl bg-white border-4 border-kirby-border rounded-3xl overflow-hidden y2k-shadow-red z-10 flex flex-col glow-border-red">
        {/* macOS Traffic Lights 標題欄 */}
        <div className="mac-title-bar px-4 py-3 flex items-center justify-between z-20 select-none">
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#FF85B3] border border-[#FF73A5] shadow-sm inline-block"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-[#FFE169] border border-[#FFE169] shadow-sm inline-block"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-[#84D9FF] border border-[#84D9FF] shadow-sm inline-block"></span>
          </div>
          <div className="text-xs font-mono font-bold tracking-widest text-kirby-border flex items-center gap-2">
            <span className="text-kirby-pink-dark animate-pulse">🌸</span>
            ONLY-音GAME大師-NANA.app
            <span className="text-kirby-pink-dark animate-pulse">🌸</span>
          </div>
          <div className="w-16"></div> {/* 排版平衡 */}
        </div>

        {/* 主視窗容器 */}
        <div className="flex-1 bg-white overflow-y-auto no-scrollbar relative min-h-[640px] max-h-[85vh]">
          {appState === 'menu' && (
            <Menu 
              songs={songs} 
              onSelectLibrarySong={handleSelectLibrarySong} 
              onSelectCustomSong={handleSelectCustomSong}
              errorMsg={errorMsg} 
            />
          )}
          
          {appState === 'loading' && (
            <div className="flex flex-col items-center justify-center min-h-[640px] p-8 text-center bg-white relative overflow-hidden select-none">
              {/* 大星星背景 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
                <svg viewBox="0 0 24 24" fill="#FFE169" className="w-96 h-96 animate-star-rotate">
                  <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z"/>
                </svg>
              </div>

              <div className="relative z-10 space-y-10 max-w-sm w-full">
                {/* 提取的 Logo 圖片 */}
                <div className="relative inline-block mx-auto border-4 border-kirby-border y2k-shadow-black rounded-3xl overflow-hidden glow-border-red bg-white p-2 max-w-[220px]">
                  <img src="/logo.jpg" alt="Logo" className="w-full h-auto rounded-2xl" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 text-kirby-yellow animate-star-pulse">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z"/>
                    </svg>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-black tracking-widest text-kirby-pink-dark uppercase glow-text-red">
                    正在召喚傳送之星...
                  </h2>
                  <div className="font-mono text-xs text-kirby-pink-dark bg-kirby-pink-light border-2 border-kirby-border p-4 rounded-2xl text-left h-20 flex items-center shadow-inner">
                    <span className="animate-pulse mr-2">🌸</span> {loadingStep}
                  </div>
                </div>

                {/* 跳動的卡比色調音量波形條 */}
                <div className="flex items-end justify-center gap-2 h-16">
                  <span className="w-3 bg-kirby-pink-dark rounded-full animate-bar-1 glow-border-red"></span>
                  <span className="w-3 bg-kirby-yellow rounded-full animate-bar-2"></span>
                  <span className="w-3 bg-kirby-blue rounded-full animate-bar-3 glow-border-blue"></span>
                  <span className="w-3 bg-kirby-pink rounded-full animate-bar-4"></span>
                  <span className="w-3 bg-kirby-yellow rounded-full animate-bar-5"></span>
                  <span className="w-3 bg-kirby-pink-dark rounded-full animate-bar-6 glow-border-red"></span>
                </div>
                
                <p className="text-[10px] text-kirby-border font-mono uppercase tracking-widest font-bold">
                  🌸 HAPPY BIRTHDAY NANA • KIRBY SOUND LABORATORY 🌸
                </p>
              </div>
            </div>
          )}
          
          {appState === 'playing' && audioUrl && (
            <Game 
              audioUrl={audioUrl} 
              beatmap={beatmap} 
              onComplete={handleGameComplete} 
              songTitle={selectedSong?.title || "未知歌曲"}
              songArtist={selectedSong?.artist || "未知歌手"}
              difficulty={difficulty}
            />
          )}
          
          {appState === 'result' && gameResult && (
            <Result 
              result={gameResult} 
              onReplay={handleReplay} 
              onMenu={handleRestart} 
              songTitle={selectedSong?.title || "未知歌曲"}
              songArtist={selectedSong?.artist || "未知歌手"}
              difficulty={difficulty}
            />
          )}
        </div>
      </div>
    </div>
  );
}

