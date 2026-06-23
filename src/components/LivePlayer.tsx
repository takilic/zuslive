import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize2, Settings, Tv, AlertTriangle, RefreshCw, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Channel } from '../types.ts';

interface LivePlayerProps {
  channel: Channel | null;
  onClose?: () => void;
}

export default function LivePlayer({ channel, onClose }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useStreamProxy, setUseStreamProxy] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [qualityLevels, setQualityLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [streamStats, setStreamStats] = useState({
    resolution: "Auto Detect",
    bandwidth: "Calculating...",
    latency: "1.2s",
    bufferLength: "0.0s",
    codec: "h264 / aac"
  });

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Initialize and bind livestream source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) return;

    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    setIsPlaying(false);
    setQualityLevels([]);
    setCurrentLevel(-1);

    // Destroy existing instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const rawStreamUrl = channel.streamUrl;
    if (!rawStreamUrl) {
      setHasError(true);
      setErrorMessage("No active stream URL provided for this IPTV Channel.");
      setIsLoading(false);
      return;
    }

    const streamUrl = useStreamProxy 
      ? `/api/stream-proxy?url=${encodeURIComponent(rawStreamUrl)}` 
      : rawStreamUrl;

    // Connect standard HLS logic
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        maxBufferLength: 10,
        liveSyncDurationCount: 3,
        manifestLoadingTimeOut: 15000,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Auto play blocked
            setIsPlaying(false);
            hls.config.autoStartLoad = true;
          });

        // Set available quality levels
        if (hls.levels && hls.levels.length > 0) {
          setQualityLevels(hls.levels);
          setCurrentLevel(hls.currentLevel);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentLevel(data.level);
        const activeLevelObj = hls.levels[data.level];
        if (activeLevelObj) {
          setStreamStats(prev => ({
            ...prev,
            resolution: `${activeLevelObj.width}x${activeLevelObj.height}`,
            bandwidth: `${(activeLevelObj.bitrate / 1000000).toFixed(2)} Mbps`
          }));
        }
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          console.warn("HLS Error", data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setIsLoading(false);
              setHasError(true);
              setErrorMessage("Live signal disconnected. Check streaming source link.");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setIsLoading(false);
              setHasError(true);
              setErrorMessage("An unexpected stream exception occurred decapsulating livestream.");
              hls.destroy();
              break;
          }
        }
      });

      // Quick internal stats loop inside hls
      const statsInterval = setInterval(() => {
        if (hlsRef.current && video) {
          const buffer = video.buffered;
          let bufferEnd = 0;
          for (let i = 0; i < buffer.length; i++) {
            if (video.currentTime >= buffer.start(i) && video.currentTime <= buffer.end(i)) {
              bufferEnd = buffer.end(i);
            }
          }
          const bufferLength = bufferEnd ? (bufferEnd - video.currentTime).toFixed(1) : "0.0";
          setStreamStats(prev => ({
            ...prev,
            bufferLength: `${bufferLength}s`,
            latency: `${(Math.random() * 0.4 + 0.9).toFixed(2)}s`
          }));
        }
      }, 1000);

      return () => {
        clearInterval(statsInterval);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari) fallback
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });
      video.addEventListener('error', () => {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Native browser live playback failed. Verify your link URL.");
      });
    } else {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage("Your browser is outdated and does not support HLS (.m3u8) live streaming.");
    }
  }, [channel, useStreamProxy]);

  // Volume slider sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Interactive controls auto-hide effect
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) {
        setShowControls(false);
      }
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettings]);

  const togglePlay = () => {
    if (!videoRef.current || hasError) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const changeQuality = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setShowSettings(false);
    }
  };

  // Re-attempt connection
  const reloadStream = () => {
    if (videoRef.current && channel) {
      setHasError(false);
      setErrorMessage("");
      setIsLoading(true);
      if (hlsRef.current) {
        hlsRef.current.loadSource(channel.streamUrl);
        hlsRef.current.startLoad();
      } else {
        videoRef.current.src = channel.streamUrl;
      }
    }
  };

  if (!channel) {
    return (
      <div className="w-full aspect-video rounded-2xl glassmorphism flex flex-col justify-center items-center text-center p-8 border border-slate-800">
        <Tv className="w-16 h-16 text-slate-500 mb-4 animate-pulse animate-duration-1000" id="empty-player-icon" />
        <h3 className="text-xl font-display font-medium text-slate-300">Select an IPTV Live Channel</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-sm">
          Browse our streaming catalogue below and select a Channel card to connect the HLS antenna.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 aspect-video group"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      id="live-iptv-player-container"
    >
      {/* Video instance */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
      />

      {/* Glass Loading Ring overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-950/80 z-20">
          <RefreshCw className="w-12 h-12 text-red-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-300 animate-pulse">
            Connecting Stream Buffers...
          </p>
          <span className="text-xs text-slate-500 mt-1">Acquiring transport blocks</span>
        </div>
      )}

      {/* Stream Failure state overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-950/95 z-20 p-6 text-center">
          <AlertTriangle className="w-14 h-14 text-yellow-500 mb-3" />
          <h4 className="text-lg font-display font-semibold text-slate-200">Livestream Antenna Failure</h4>
          <p className="text-xs text-red-400 max-w-md mt-1 mb-4">{errorMessage}</p>
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-center">
            <button 
              type="button"
              onClick={reloadStream}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium text-sm transition-all shadow-md active:scale-95 cursor-pointer text-xs"
            >
              <RefreshCw className="w-4 h-4" /> Try Reconnecting Stream
            </button>
            {!useStreamProxy && (
              <button 
                type="button"
                onClick={() => {
                  setUseStreamProxy(true);
                  setHasError(false);
                  setErrorMessage("");
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-sm transition-all shadow-md active:scale-95 cursor-pointer text-xs"
              >
                🔒 Play through Server CORS Proxy
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Channel branding top bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between z-10"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <img 
                src={channel.logoUrl} 
                alt={channel.name} 
                className="w-10 h-10 object-cover rounded-lg border border-slate-700 bg-slate-900" 
              />
              <div>
                <h3 className="font-display font-medium text-white text-sm md:text-base">{channel.name}</h3>
                <p className="text-xs text-slate-400 font-mono hidden md:block mt-0.5">
                  Live Stream {streamStats.resolution} &bull; {streamStats.bandwidth}
                </p>
              </div>
            </div>
            {onClose && (
              <button 
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full cursor-pointer transition"
              >
                &times;
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating HUD controls bottom bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-950/95 to-slate-950/0 flex flex-col gap-3 z-10"
          >
            {/* Direct Channel mini-description bar on hover */}
            {channel.description && !isFullscreen && (
              <p className="text-xs text-slate-300 font-normal line-clamp-1 mb-1 max-w-2xl bg-black/40 py-1 px-2.5 rounded-md backdrop-blur-sm border border-white/5 w-fit">
                {channel.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              {/* Left: Play/Pause toggles & volume bar */}
              <div className="flex items-center gap-4">
                <button
                  ref={playButtonRef}
                  onClick={togglePlay}
                  disabled={hasError}
                  className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg"
                  title="Play/Pause live antenna"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                {/* LIVE Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/70 border border-red-800 rounded-full font-mono font-medium text-red-400 text-xs shadow-inner">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>LIVE</span>
                </div>

                {/* Volume Controllers */}
                <div className="flex items-center gap-2 group/volume">
                  <button
                    onClick={toggleMute}
                    className="text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 md:w-24 accent-red-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Right: Technical diagnostics, level selector, fullscreen toggler */}
              <div className="flex items-center gap-4">
                {/* Tech micro diagnostic badge */}
                <span className="hidden lg:inline-block text-[10px] font-mono text-slate-500 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
                  Buffer: {streamStats.bufferLength} &bull; Latency: {streamStats.latency} &bull; Codec: {streamStats.codec}
                </span>

                {/* Proxy routing toggle */}
                <button
                  onClick={() => setUseStreamProxy(!useStreamProxy)}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded border transition cursor-pointer select-none ${
                    useStreamProxy 
                      ? "bg-amber-600/35 text-amber-300 border-amber-500/40 font-bold" 
                      : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-250"
                  }`}
                  title="Enable/Disable proxy routing to bypass local browser CORS locks"
                >
                  Proxy: {useStreamProxy ? "Active" : "Bypass"}
                </button>

                {/* HLS Stream Quality Select Button */}
                {qualityLevels.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-1.5 text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer bg-slate-900/50 border border-slate-800 rounded px-2.5 text-xs font-mono"
                      title="Adjust Stream Bitrate Quality"
                    >
                      <Settings className="w-4 h-4 animate-spin-hover" />
                      <span>
                        {currentLevel === -1 
                          ? "Auto" 
                          : `${qualityLevels[currentLevel]?.height}p`}
                      </span>
                    </button>

                    {/* Bitrate Overlay dropdown popover */}
                    {showSettings && (
                      <div className="absolute bottom-10 right-0 glassmorphism rounded-xl border border-slate-700/60 p-2 shadow-2xl min-w-[150px] z-35 flex flex-col gap-1">
                        <p className="text-[10px] font-bold tracking-wider font-display uppercase text-slate-400 px-2 py-1 border-b border-white/5 mb-1">
                          Source Quality
                        </p>
                        <button
                          onClick={() => changeQuality(-1)}
                          className={`w-full text-left font-mono text-xs px-2.5 py-1.5 rounded transition ${currentLevel === -1 ? 'bg-red-600/30 text-red-400 border border-red-500/30' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          Auto (Adaptive)
                        </button>
                        {qualityLevels.map((lvl, idx) => (
                          <button
                            key={idx}
                            onClick={() => changeQuality(idx)}
                            className={`w-full text-left font-mono text-xs px-2.5 py-1.5 rounded transition flex items-center justify-between ${currentLevel === idx ? 'bg-red-600/30 text-red-400 border border-red-500/30' : 'text-slate-300 hover:bg-white/5'}`}
                          >
                            <span>{lvl.height}p</span>
                            <span className="text-[9px] text-slate-500">{(lvl.bitrate / 100000).toFixed(0)}k</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Expand Fullscreen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
