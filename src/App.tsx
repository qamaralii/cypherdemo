import { useState, useCallback } from 'react';
import { useSceneController } from './hooks/useSceneController';
import { OpeningScreen } from './components/OpeningScreen';
import { VideoScene } from './components/VideoScene';
import { SocialPost } from './components/SocialPost';
import { AgentRace } from './components/AgentRace';
import { HostControls } from './components/HostControls';
import { config } from './config';

export default function App() {
  const {
    scene,
    paused,
    nextScene,
    registerNextHandler,
    registerPrevHandler,
    goToScene,
    replay,
    showHelp,
    toggleHelp,
    hopTarget,
  } = useSceneController();

  const [lastFrameCanvas, setLastFrameCanvas] = useState<HTMLCanvasElement | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [showCta, setShowCta] = useState(false);

  const handleF3LastFrame = useCallback((canvas: HTMLCanvasElement) => {
    setLastFrameCanvas(canvas);
  }, []);

  const handleReplay = useCallback(() => {
    setLastFrameCanvas(null);
    setShowReplay(false);
    setShowCta(false);
    replay();
  }, [replay]);


  const handleF2AEnd = useCallback(() => {
    goToScene('f2b');
  }, [goToScene]);

  const handleF2BEnd = useCallback(() => {
    goToScene('f2c');
  }, [goToScene]);

  const handlePostAnimationComplete = useCallback(() => {
    setShowReplay(true);
    setShowCta(true);
  }, []);

  const handleFindStores = useCallback(() => {
    goToScene('agentRace');
  }, [goToScene]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-navy">
      {/* ── Opening Screen ── */}
      {scene === 'opening' && (
        <OpeningScreen onStart={nextScene} />
      )}

      {/* ── F1: Factory ── */}
      {scene === 'f1' && (
        <VideoScene
          key="f1"
          src={config.assets.frame1}
           nextSrc={config.assets.frame2A}
          overlays={config.f1.overlays}
          annotations={config.f1.annotations}
          playbackRate={config.f1.playbackRate}
          paused={paused}
           onEnd={nextScene}
        />
      )}

      {/* ── F2: Distribution ── */}
      {scene === 'f2a' && (
          <VideoScene
           key="f2a"
           src={config.assets.frame2A}
           nextSrc={config.assets.frame2B}
           loop={config.f2.loop}
           overlays={config.f2.overlays}
           annotations={config.f2.annotations.slice(0, 2)}
           registerNextHandler={registerNextHandler}
           paused={paused}
           onEnd={handleF2AEnd}
         />
      )}

      {/* ── F2B: Store delivery ── */}
      {scene === 'f2b' && (
        <VideoScene
          key="f2b"
          src={config.assets.frame2B}
          nextSrc={config.assets.frame2C}
          loop={config.f2.loop}
          overlays={config.f2.overlays}
          annotations={config.f2.annotations.slice(2)}
          paused={paused}
          onEnd={handleF2BEnd}
        />
      )}

      {/* ── F2C: Final distribution segment ── */}
      {scene === 'f2c' && (
        <VideoScene
          key="f2c"
          src={config.assets.frame2C}
          nextSrc={config.assets.frame3}
          loop={config.f2.loop}
          overlays={config.f2.overlays}
          paused={paused}
          onEnd={nextScene}
        />
      )}

      {/* ── F3: Discovery ── */}
      {scene === 'f3' && (
        <VideoScene
          key="f3"
          src={config.assets.frame3}
          loop={config.f3.loop}
          overlays={config.f3.overlays}
          annotations={config.f3.annotations}
          paused={paused}
           onEnd={nextScene}
          onLastFrame={handleF3LastFrame}
        />
      )}

      {/* ── Social Post ── */}
      {(scene === 'socialPost' || scene === 'end') && (
        <SocialPost
          lastFrameCanvas={lastFrameCanvas}
          paused={paused}
          onAnimationComplete={handlePostAnimationComplete}
          onFindStores={showCta ? handleFindStores : undefined}
        />
      )}

      {/* ── Agent Race ── */}
      {(scene === 'agentRace' || scene === 'resolution') && (
          <AgentRace
            paused={paused}
            onReplay={handleReplay}
            hopTarget={hopTarget}
            registerNextHandler={registerNextHandler}
            registerPrevHandler={registerPrevHandler}
          />
      )}

      {/* ── Floating Replay button (only on socialPost, before CTA appears) ── */}
      {(scene === 'socialPost' || scene === 'end') && showReplay && !showCta && (
        <button
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-2.5
                     bg-white/10 backdrop-blur-md border border-white/20
                     text-cream/90 text-sm font-medium rounded-full
                     hover:bg-white/20 hover:text-cream active:scale-95
                     transition-all duration-200 cursor-pointer
                     focus:outline-none focus:ring-2 focus:ring-teal/50"
          onClick={handleReplay}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Replay
        </button>
      )}

      {/* ── Host Controls ── */}
      <HostControls visible={showHelp} onClose={toggleHelp} />

      {/* ── Pause indicator ── */}
      {paused && scene !== 'opening' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-navy/70 backdrop-blur-sm text-cream/80 px-4 py-1.5 rounded-full text-sm font-medium pointer-events-none">
          PAUSED
        </div>
      )}

      {/* ── Help hint ── */}
      {!showHelp && scene !== 'opening' && (
        <div className="fixed bottom-4 left-4 z-30 text-cream/30 text-xs font-mono pointer-events-none">
          Press ? for controls
        </div>
      )}
    </div>
  );
}
