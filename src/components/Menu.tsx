import React, { useState, useMemo, useRef } from 'react';
import { Search, Play, Music, ArrowUpDown, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { LibrarySong } from '../game/songs';
import { Difficulty } from '../types';

interface MenuProps {
  songs: LibrarySong[];
  onSelectLibrarySong: (song: LibrarySong, difficulty: Difficulty) => void;
  onSelectCustomSong: (file: File, difficulty: Difficulty) => void;
  errorMsg?: string | null;
}

// 夢幻卡比黃色五角星
const KirbyStar = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="#FFE169" className={`${className} filter drop-shadow-[0_0_8px_rgba(255,225,105,0.7)]`}>
    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z"/>
  </svg>
);

export function Menu({ songs, onSelectLibrarySong, onSelectCustomSong, errorMsg }: MenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'index' | 'title' | 'artist'>('index');
  const [currentPage, setCurrentPage] = useState(1);
  const [globalDifficulty, setGlobalDifficulty] = useState<Difficulty>('normal');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const isAudio = file.type.startsWith('audio/') || 
                    /\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name);
    if (!isAudio) {
      setUploadError("請上傳有效的音訊檔案 (MP3, WAV, M4A, OGG 等)！");
      return;
    }
    onSelectCustomSong(file, globalDifficulty);
  };

  const ITEMS_PER_PAGE = 9;

  // 1. 搜尋與篩選
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const term = searchTerm.toLowerCase();
      return (
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term) ||
        song.index.includes(term)
      );
    });
  }, [songs, searchTerm]);

  // 2. 排序
  const sortedSongs = useMemo(() => {
    const list = [...filteredSongs];
    if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant'));
    } else if (sortBy === 'artist') {
      list.sort((a, b) => a.artist.localeCompare(b.artist, 'zh-Hant'));
    } else {
      list.sort((a, b) => parseInt(a.index, 10) - parseInt(b.index, 10));
    }
    return list;
  }, [filteredSongs, sortBy]);

  // 3. 分頁
  const totalPages = Math.ceil(sortedSongs.length / ITEMS_PER_PAGE) || 1;
  const paginatedSongs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedSongs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedSongs, currentPage]);

  // 重設分頁
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const handleDifficultyChange = (diff: Difficulty) => {
    setGlobalDifficulty(diff);
  };

  return (
    <div className="p-6 md:p-10 select-none">
      {/* 頂部 Header & Logo 區 */}
      <div className="flex flex-col items-center justify-center mb-10 text-center relative">
        {/* 生日祝福條 */}
        <div className="mb-4 px-6 py-2 bg-gradient-to-r from-kirby-pink via-kirby-yellow to-kirby-blue text-kirby-border font-black text-xs md:text-sm rounded-full border-2 border-kirby-border shadow-md animate-bounce flex items-center gap-2">
          🎂 NANA 生日快樂！永遠的音GAME大師！ 🎉
        </div>

        <div className="flex items-center justify-center gap-6 mb-4 relative">
          <div className="absolute -left-16 top-10 animate-star-pulse">
            <KirbyStar className="w-10 h-10 animate-star-rotate" />
          </div>
          
          {/* Logo 圖片與大標題 */}
          <div className="flex flex-col items-center gap-3">
            <div className="border-4 border-kirby-border rounded-3xl overflow-hidden y2k-shadow-black glow-border-red bg-white p-2 max-w-[150px]">
              <img src="/logo.jpg" alt="Logo" className="w-full h-auto rounded-2xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-kirby-border uppercase italic glow-text-red">
              ONLY 音GAME大師 <span className="text-kirby-pink-dark">NANA</span> 🎂
            </h1>
          </div>

          <div className="absolute -right-16 top-10 animate-star-pulse">
            <KirbyStar className="w-10 h-10 animate-star-rotate-fast" />
          </div>
        </div>
        
        <p className="text-xs text-kirby-border font-mono tracking-widest uppercase mt-2 max-w-xl mx-auto font-black">
          ✨ 送給 NANA 的專屬生日禮物 • 挑戰卡比的無敵律動！ ✨
        </p>
      </div>

      {/* 搜尋、排序、難度控制面板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 bg-white border-2 border-kirby-border p-5 rounded-3xl y2k-shadow-black relative">
        {/* 裝飾星星 */}
        <div className="absolute -top-4 -right-4">
          <KirbyStar className="w-8 h-8 animate-star-pulse" />
        </div>

        {/* 搜尋框 */}
        <div className="relative">
          <label className="block text-[10px] font-mono font-bold text-kirby-border uppercase tracking-widest mb-1.5">尋找音軌</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="輸入歌名或歌手..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-kirby-border rounded-2xl text-black placeholder-gray-400 focus:outline-none focus:border-kirby-pink-dark transition-colors text-sm font-bold shadow-inner"
            />
            <Search className="absolute left-3.5 top-3 text-kirby-border w-4.5 h-4.5" />
          </div>
        </div>

        {/* 排序選擇 */}
        <div>
          <label className="block text-[10px] font-mono font-bold text-kirby-border uppercase tracking-widest mb-1.5">排列順序</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setSortBy('index')}
              className={`px-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-kirby-border flex items-center gap-1.5 transition-all cursor-pointer ${
                sortBy === 'index' ? 'bg-kirby-pink-dark text-white y2k-shadow-black translate-x-[-2px] translate-y-[-2px]' : 'bg-white text-kirby-border hover:bg-kirby-pink-light'
              }`}
            >
              <ArrowUpDown size={14} />
              預設
            </button>
            <button 
              onClick={() => setSortBy('title')}
              className={`px-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-kirby-border flex items-center gap-1.5 transition-all cursor-pointer ${
                sortBy === 'title' ? 'bg-kirby-pink-dark text-white y2k-shadow-black translate-x-[-2px] translate-y-[-2px]' : 'bg-white text-kirby-border hover:bg-kirby-pink-light'
              }`}
            >
              歌名
            </button>
            <button 
              onClick={() => setSortBy('artist')}
              className={`px-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-kirby-border flex items-center gap-1.5 transition-all cursor-pointer ${
                sortBy === 'artist' ? 'bg-kirby-pink-dark text-white y2k-shadow-black translate-x-[-2px] translate-y-[-2px]' : 'bg-white text-kirby-border hover:bg-kirby-pink-light'
              }`}
            >
              歌手
            </button>
          </div>
        </div>

        {/* 全域難度設定 */}
        <div>
          <label className="block text-[10px] font-mono font-bold text-kirby-border uppercase tracking-widest mb-1.5">難度調整</label>
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-2xl border-2 border-kirby-border">
            <button 
              onClick={() => handleDifficultyChange('easy')}
              className={`py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                globalDifficulty === 'easy' ? 'bg-kirby-blue text-kirby-border shadow-md' : 'text-gray-400 hover:text-kirby-border'
              }`}
            >
              EASY
            </button>
            <button 
              onClick={() => handleDifficultyChange('normal')}
              className={`py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                globalDifficulty === 'normal' ? 'bg-kirby-yellow text-kirby-border shadow-md' : 'text-gray-400 hover:text-kirby-border'
              }`}
            >
              NORMAL
            </button>
            <button 
              onClick={() => handleDifficultyChange('hard')}
              className={`py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                globalDifficulty === 'hard' ? 'bg-kirby-pink-dark text-white shadow-md' : 'text-gray-400 hover:text-kirby-border'
              }`}
            >
              HARD
            </button>
          </div>
        </div>
      </div>

      {/* 自訂歌曲上傳區塊 */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-10 p-8 border-4 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative select-none ${
          isDragging 
            ? 'border-kirby-pink-dark bg-kirby-pink-light scale-[1.01] shadow-[0_0_15px_rgba(255,115,165,0.25)]' 
            : 'border-kirby-border bg-white hover:border-kirby-pink-dark hover:scale-[1.005] hover:shadow-[0_0_10px_rgba(255,115,165,0.15)]'
        } y2k-shadow-black`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="audio/*" 
          className="hidden" 
        />
        
        {/* 裝飾星星 */}
        <div className="absolute top-3 right-3 animate-star-pulse">
          <KirbyStar className="w-6 h-6" />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`p-4 rounded-full border-2 border-kirby-border bg-white shadow-md transition-transform ${isDragging ? 'rotate-12 scale-110' : ''}`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-kirby-pink-dark' : 'text-kirby-border'}`} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-kirby-border uppercase flex items-center justify-center gap-2">
              <span>★</span> 🎂 NANA 專屬自訂點播模式 🎂 <span>★</span>
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-1 uppercase font-bold tracking-wider">
              將 NANA 喜歡的音訊拖曳至此，或點擊瀏覽
            </p>
            <p className="text-[11px] text-gray-400 mt-2 font-medium">
              支援 MP3, WAV, M4A, OGG 等格式。音軌將在瀏覽器內即時分析，自動生成無敵星譜面！
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 px-4 py-2 bg-kirby-pink-light border-2 border-kirby-pink-dark rounded-2xl text-kirby-pink-dark text-xs font-mono font-bold">
            {uploadError}
          </div>
        )}
      </div>

      {/* 錯誤資訊 */}
      {errorMsg && (
        <div className="mb-8 p-4 bg-kirby-pink-light border-2 border-kirby-pink-dark rounded-3xl text-kirby-pink-dark text-sm max-w-2xl mx-auto text-left shadow-lg glow-border-red">
          <strong className="font-bold block mb-1">發生錯誤:</strong>
          <span className="break-words font-mono text-xs">{errorMsg}</span>
        </div>
      )}

      {/* 歌曲卡片網格 */}
      {paginatedSongs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {paginatedSongs.map((song) => (
            <div 
              key={song.id}
              onClick={() => onSelectLibrarySong(song, globalDifficulty)}
              className="bg-white border-2 border-kirby-border rounded-3xl overflow-hidden hover:border-kirby-pink-dark hover:scale-[1.02] hover:-rotate-1 transition-all group cursor-pointer y2k-shadow-red flex flex-col h-full"
            >
              {/* 卡片唱片視覺特效 */}
              <div className="aspect-video bg-gradient-to-br from-kirby-pink-light to-kirby-purple/30 relative overflow-hidden flex items-center justify-center border-b-2 border-kirby-border">
                {/* 卡比無敵星 CD */}
                <div className="w-24 h-24 rounded-full bg-kirby-border border-2 border-kirby-border flex items-center justify-center shadow-lg relative group-hover:rotate-180 transition-all duration-1000">
                  <div className="w-18 h-18 rounded-full border border-kirby-pink-dark bg-kirby-pink-light flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-kirby-pink via-kirby-yellow to-kirby-blue animate-spin opacity-60"></div>
                  </div>
                  {/* CD 中心孔 */}
                  <div className="absolute w-3 h-3 rounded-full bg-kirby-border"></div>
                </div>

                {/* 漂浮的小五角星 */}
                <div className="absolute top-3 left-3 opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all">
                  <KirbyStar className="w-5 h-5" />
                </div>
                
                {/* 序號標記 */}
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-kirby-pink-dark border border-kirby-border rounded font-mono text-[10px] text-white font-bold">
                  #{song.index}
                </div>

                <div className="absolute inset-0 bg-kirby-pink-dark/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-kirby-yellow border-2 border-kirby-border rounded-full flex items-center justify-center text-kirby-border shadow-lg transform scale-75 group-hover:scale-100 transition-transform pl-1">
                    <Play size={24} className="fill-current" />
                  </div>
                </div>
              </div>

              {/* 歌曲資訊 */}
              <div className="p-4 text-left flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-base text-kirby-border mb-1 truncate group-hover:text-kirby-pink-dark transition-colors uppercase tracking-tight">
                    {song.title}
                  </h3>
                  <p className="text-gray-500 text-xs truncate font-medium">
                    {song.artist}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-4 text-[10px] font-mono">
                  <span className="px-2 py-0.5 bg-kirby-pink-light border border-kirby-border rounded text-kirby-border font-bold flex items-center gap-1">
                    <Music size={10} />
                    LOCAL MP3
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-lg font-black uppercase border border-kirby-border ${
                    globalDifficulty === 'easy' ? 'bg-kirby-blue text-kirby-border' :
                    globalDifficulty === 'normal' ? 'bg-kirby-yellow text-kirby-border' : 'bg-kirby-pink-dark text-white'
                  }`}>
                    {globalDifficulty}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-kirby-border rounded-3xl bg-white mb-8">
          <p className="text-gray-500 font-mono text-sm uppercase">沒有找到任何匹配的音軌...</p>
        </div>
      )}

      {/* 分頁控制列 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="p-2 bg-white border-2 border-kirby-border rounded-2xl text-kirby-border hover:bg-kirby-pink-light transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-md"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="font-mono text-xs font-black tracking-widest text-kirby-border">
            {currentPage} / {totalPages}
          </span>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="p-2 bg-white border-2 border-kirby-border rounded-2xl text-kirby-border hover:bg-kirby-pink-light transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-md"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* 底部按鍵指南 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 text-left bg-white p-6 rounded-3xl border-2 border-kirby-border relative y2k-shadow-yellow">
        {/* 左側說明 */}
        <div>
          <h3 className="font-black text-kirby-pink-dark mb-2 text-sm uppercase tracking-wider flex items-center gap-1.5">
            <KirbyStar className="w-5 h-5 animate-bounce" />
            遊戲玩法說明
          </h3>
          <p className="text-xs text-kirby-border leading-relaxed font-bold">
            音樂播放時，彩虹星星會由上往下落下。當星星落到最底部的圓滾滾判定區時，按下對應的方向鍵。擊打時機越精準，獲得的愛心分數加倍越多！
          </p>
        </div>
        {/* 右側操作 */}
        <div>
          <h3 className="font-black text-kirby-border mb-2 text-sm uppercase tracking-wider">控制按鍵</h3>
          <div className="flex items-center space-x-3 mt-3">
            {['←', '↓', '↑', '→'].map((key) => (
              <kbd key={key} className="px-3.5 py-2 bg-kirby-pink-light text-kirby-border rounded-xl border-2 border-kirby-border font-mono text-base font-black shadow-md">
                {key}
              </kbd>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
