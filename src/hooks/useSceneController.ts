import { useCallback, useEffect, useRef, useState } from 'react';

export type Scene = 'opening' | 'f1' | 'f2a' | 'f2b' | 'f2c' | 'f3' | 'socialPost' | 'agentRace' | 'resolution' | 'end';
export type HopTarget =
  | 'humanStart'
  | 'humanEnd'
  | 'unstructuredStart'
  | 'analysisStart'
  | 'resolutionGate'
  | 'diagnosis'
  | 'decision'
  | 'execution'
  | 'outcome';

const SCENE_ORDER: Scene[] = ['opening', 'f1', 'f2a', 'f2b', 'f2c', 'f3', 'socialPost', 'agentRace', 'resolution', 'end'];

interface SceneController {
  scene: Scene;
  paused: boolean;
  goToScene: (s: Scene) => void;
  nextScene: () => void;
  registerNextHandler: (handler: (() => boolean) | null) => void;
  registerPrevHandler: (handler: (() => boolean) | null) => void;
  prevScene: () => void;
  togglePause: () => void;
  replay: () => void;
  toggleFullscreen: () => void;
  showHelp: boolean;
  toggleHelp: () => void;
  hopTarget: { target: HopTarget; id: number } | null;
  hop: (target: HopTarget) => void;
}

export function useSceneController(): SceneController {
  const [scene, setScene] = useState<Scene>('opening');
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hopTarget, setHopTarget] = useState<{ target: HopTarget; id: number } | null>(null);
  const pausedRef = useRef(paused);
  const nextHandlerRef = useRef<(() => boolean) | null>(null);
  const prevHandlerRef = useRef<(() => boolean) | null>(null);
  pausedRef.current = paused;

  const registerNextHandler = useCallback((handler: (() => boolean) | null) => {
    nextHandlerRef.current = handler;
  }, []);

  const registerPrevHandler = useCallback((handler: (() => boolean) | null) => {
    prevHandlerRef.current = handler;
  }, []);

  const goToScene = useCallback((s: Scene) => {
    setPaused(false);
    setHopTarget(null);
    setScene(s);
  }, []);

  const nextScene = useCallback(() => {
    if (nextHandlerRef.current?.()) return;
    setScene((cur) => {
      const idx = SCENE_ORDER.indexOf(cur);
      if (idx < SCENE_ORDER.length - 1) return SCENE_ORDER[idx + 1]!;
      return cur;
    });
    setPaused(false);
  }, []);

  const prevScene = useCallback(() => {
    if (prevHandlerRef.current?.()) return;
    setScene((cur) => {
      const idx = SCENE_ORDER.indexOf(cur);
      if (idx > 0) return SCENE_ORDER[idx - 1]!;
      return cur;
    });
    setPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const replay = useCallback(() => {
    setPaused(false);
    setHopTarget(null);
    setScene('opening');
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const toggleHelp = useCallback(() => {
    setShowHelp((h) => !h);
  }, []);

  const hop = useCallback((target: HopTarget) => {
    setScene('agentRace');
    setPaused(false);
    setHopTarget((current) => ({ target, id: (current?.id ?? 0) + 1 }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          // Preserve native keyboard activation for approval and replay buttons.
          if (e.target instanceof HTMLElement && e.target.closest('button')) return;
          e.preventDefault();
          togglePause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextScene();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevScene();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          replay();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case '1':
          e.preventDefault();
          hop('humanStart');
          break;
        case '2':
          e.preventDefault();
          hop('humanEnd');
          break;
        case '3':
          e.preventDefault();
          hop('unstructuredStart');
          break;
        case '4':
          e.preventDefault();
          hop('analysisStart');
          break;
        case '5':
          e.preventDefault();
          hop('resolutionGate');
          break;
        case '6':
          e.preventDefault();
          hop('diagnosis');
          break;
        case '7':
          e.preventDefault();
          hop('decision');
          break;
        case '8':
          e.preventDefault();
          hop('execution');
          break;
        case '9':
          e.preventDefault();
          hop('outcome');
          break;
        case '?':
          e.preventDefault();
          toggleHelp();
          break;
        case 'Escape':
          setShowHelp(false);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePause, nextScene, prevScene, replay, toggleFullscreen, toggleHelp, hop]);

  return {
    scene,
    paused,
    goToScene,
    nextScene,
    registerNextHandler,
    registerPrevHandler,
    prevScene,
    togglePause,
    replay,
    toggleFullscreen,
    showHelp,
    toggleHelp,
    hopTarget,
    hop,
  };
}
