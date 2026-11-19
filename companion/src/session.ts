// Phone side of the session: join (or resume) as the decider, receive the laptop's state, send actions.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { EVENTS, applySelection, channelName, initialDemoState, type DemoState, type PhoneAction, type SessionStatus } from '../../shared/protocol';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;

export type Phase =
  | { kind: 'misconfigured' }
  | { kind: 'no-session' }
  | { kind: 'checking' }
  | { kind: 'join' }
  | { kind: 'joining' }
  | { kind: 'refused'; reason: 'taken' | 'ended' | 'not_found' | 'error' }
  | { kind: 'ready' };

interface JoinResult { ok: boolean; reason?: 'taken' | 'ended' | 'not_found'; token?: string; name?: string; state?: Partial<DemoState>; status?: SessionStatus }

const sessionId = new URLSearchParams(location.search).get('s');
const tokenKey = `cypher-companion:${sessionId}`;
const readSaved = (): { token: string; name: string } | null => {
  try { const raw = localStorage.getItem(tokenKey); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const save = (value: { token: string; name: string }) => { try { localStorage.setItem(tokenKey, JSON.stringify(value)); } catch { /* private mode: resume just won't survive a reload */ } };

const normalise = (state: Partial<DemoState> | undefined): DemoState => ({ ...initialDemoState, ...(state && Object.keys(state).length ? state : {}) });

export function useCompanionSession() {
  const [phase, setPhase] = useState<Phase>(() => !supabase ? { kind: 'misconfigured' } : !sessionId ? { kind: 'no-session' } : readSaved() ? { kind: 'checking' } : { kind: 'join' });
  const [state, setState] = useState<DemoState>(initialDemoState);
  const [status, setStatus] = useState<SessionStatus>('live');
  const [me, setMe] = useState('Guest');
  const [connected, setConnected] = useState(false);
  const token = useRef<string | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);

  const accept = useCallback((result: JoinResult) => {
    if (!result.ok || !result.token) {
      setPhase({ kind: 'refused', reason: result.reason ?? 'error' });
      return;
    }
    token.current = result.token;
    save({ token: result.token, name: result.name ?? 'Guest' });
    setMe(result.name ?? 'Guest');
    setState(normalise(result.state));
    setStatus(result.status ?? 'live');
    setPhase({ kind: 'ready' });
  }, []);

  const call = useCallback(async (name: string, savedToken: string | null) => {
    const { data, error } = await supabase!.rpc('join_demo_session', { p_id: sessionId, p_name: name, p_token: savedToken });
    if (error) return { ok: false, reason: undefined } as JoinResult;
    return data as JoinResult;
  }, []);

  // Resume on reload with the token this phone saved.
  useEffect(() => {
    if (phase.kind !== 'checking') return;
    const saved = readSaved();
    void call(saved?.name ?? '', saved?.token ?? null).then((result) => {
      if (result.ok) accept(result);
      else if (result.reason === 'taken' || result.reason === 'ended' || result.reason === 'not_found') setPhase({ kind: 'refused', reason: result.reason });
      else setPhase({ kind: 'join' });
    });
  }, [phase.kind, call, accept]);

  const join = useCallback(async (name: string) => {
    setPhase({ kind: 'joining' });
    const result = await call(name, null);
    accept(result);
  }, [call, accept]);

  // Live updates from the laptop.
  useEffect(() => {
    if (phase.kind !== 'ready' || !supabase || !sessionId) return;
    const ch = supabase.channel(channelName(sessionId), { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: EVENTS.state }, ({ payload }) => {
      const next = normalise(payload as DemoState);
      setState((current) => next.seq >= current.seq ? next : current);
    })
      .on('broadcast', { event: EVENTS.status }, ({ payload }) => { setStatus((payload as { status: SessionStatus }).status); })
      .subscribe((subscription) => {
        setConnected(subscription === 'SUBSCRIBED');
        if (subscription === 'SUBSCRIBED') {
          ch.send({ type: 'broadcast', event: EVENTS.joined, payload: {} });
          ch.send({ type: 'broadcast', event: EVENTS.hello, payload: {} });
        }
      });
    channel.current = ch;
    return () => { channel.current = null; void supabase.removeChannel(ch); };
  }, [phase.kind]);

  // A phone that was locked or backgrounded asks for the latest state when it comes back.
  useEffect(() => {
    if (phase.kind !== 'ready') return;
    const onVisible = () => { if (document.visibilityState === 'visible') channel.current?.send({ type: 'broadcast', event: EVENTS.hello, payload: {} }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase.kind]);

  // Safety net: if every “ended” message was lost (laptop crashed, network blip), notice it within ~15 s.
  useEffect(() => {
    if (phase.kind !== 'ready' || status === 'ended') return;
    const timer = window.setInterval(async () => {
      const saved = readSaved();
      if (!saved) return;
      const result = await call(saved.name, saved.token);
      if (result.ok && result.status === 'ended') setStatus('ended');
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [phase.kind, status, call]);

  const send = useCallback((action: PhoneAction) => {
    if (!token.current || status !== 'live') return;
    // Selections show instantly; the laptop's next broadcast confirms them.
    setState((current) => applySelection(current, action));
    channel.current?.send({ type: 'broadcast', event: EVENTS.action, payload: { token: token.current, action } });
  }, [status]);

  /** Optional WhatsApp number (E.164), stored on this run's session row (only this phone's decider token can write it). */
  const submitWhatsapp = useCallback(async (number: string): Promise<'ok' | 'invalid' | 'error'> => {
    if (!supabase || !sessionId || !token.current) return 'error';
    const { data, error } = await supabase.rpc('submit_visitor_whatsapp', { p_id: sessionId, p_token: token.current, p_number: number });
    if (error) return 'error';
    return data === true ? 'ok' : 'invalid';
  }, []);

  return { phase, state, status, me, connected, join, send, submitWhatsapp };
}
