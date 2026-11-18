// Laptop side of the Slack companion.
// Owns one Supabase session per demo run: shows its QR, broadcasts the laptop's position, and relays the decider's phone actions.
// Without Supabase env vars, or if the backend is unreachable, everything here is inert and the demo runs laptop-only.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { EVENTS, channelName, initialDemoState, type ActionEnvelope, type DemoState, type PhoneAction, type SessionStatus } from '../../shared/protocol';
import type { Scene } from '../hooks/useSceneController';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const COMPANION_URL = (import.meta.env.VITE_COMPANION_URL as string | undefined) || `${location.protocol}//${location.hostname}:5174/`;

const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;

type ActionListener = (action: PhoneAction) => void;

interface CompanionApi {
  enabled: boolean;
  /** URL the QR code encodes, once a session exists. */
  joinUrl: string | null;
  /** The decider's name while their phone controls approvals. Null when no phone is paired or the session has ended. */
  deciderName: string | null;
  publish: (partial: Partial<DemoState>) => void;
  onAction: (listener: ActionListener) => () => void;
}

const disabledApi: CompanionApi = { enabled: false, joinUrl: null, deciderName: null, publish: () => {}, onAction: () => () => {} };
const CompanionContext = createContext<CompanionApi>(disabledApi);
export const useCompanion = () => useContext(CompanionContext);

interface Session { id: string; secret: string; channel: RealtimeChannel; status: SessionStatus; deciderToken: string | null }

export function CompanionProvider({ scene, children }: { scene: Scene; children: ReactNode }) {
  const [session, setSession] = useState<{ id: string } | null>(null);
  const [deciderName, setDeciderName] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const stateRef = useRef<DemoState>({ ...initialDemoState });
  const listeners = useRef(new Set<ActionListener>());
  const persistTimer = useRef<number | undefined>(undefined);
  const creating = useRef(false);

  const persist = useCallback((status?: SessionStatus) => {
    const current = sessionRef.current;
    if (!supabase || !current) return;
    window.clearTimeout(persistTimer.current);
    const write = () => supabase.rpc('host_update_session', { p_id: current.id, p_secret: current.secret, p_state: stateRef.current, p_status: status ?? null }).then(({ error }) => { if (error) console.warn('[companion] persist failed', error.message); });
    if (status) write();
    else persistTimer.current = window.setTimeout(write, 350);
  }, []);

  const broadcastState = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.status === 'ended') return;
    current.channel.send({ type: 'broadcast', event: EVENTS.state, payload: stateRef.current });
  }, []);

  const refreshDecider = useCallback(async () => {
    const current = sessionRef.current;
    if (!supabase || !current) return;
    const { data, error } = await supabase.rpc('host_get_session', { p_id: current.id, p_secret: current.secret });
    if (error || !data) return;
    const row = (Array.isArray(data) ? data[0] : data) as { decider_token: string | null; decider_name: string | null; status: SessionStatus } | undefined;
    if (!row || sessionRef.current !== current) return;
    current.deciderToken = row.decider_token;
    if (current.status !== 'ended') current.status = row.status;
    setDeciderName(current.status === 'live' ? row.decider_name : null);
  }, []);

  const endSession = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.status === 'ended') return;
    broadcastState();
    current.status = 'ended';
    current.channel.send({ type: 'broadcast', event: EVENTS.status, payload: { status: 'ended' } });
    persist('ended');
    setDeciderName(null);
  }, [broadcastState, persist]);

  const createSession = useCallback(async () => {
    if (!supabase || creating.current) return;
    creating.current = true;
    try {
      const { data, error } = await supabase.rpc('create_demo_session');
      const row = (Array.isArray(data) ? data[0] : data) as { id: string; host_secret: string } | undefined;
      if (error || !row) { console.warn('[companion] could not create a session; running laptop-only', error?.message); return; }
      const channel = supabase.channel(channelName(row.id), { config: { broadcast: { self: false } } });
      const next: Session = { id: row.id, secret: row.host_secret, channel, status: 'open', deciderToken: null };
      channel
        .on('broadcast', { event: EVENTS.joined }, () => { void refreshDecider(); })
        .on('broadcast', { event: EVENTS.hello }, () => { broadcastState(); })
        .on('broadcast', { event: EVENTS.action }, ({ payload }) => {
          const envelope = payload as ActionEnvelope;
          if (sessionRef.current !== next || next.status !== 'live') return;
          if (!next.deciderToken || envelope.token !== next.deciderToken) { void refreshDecider(); return; }
          listeners.current.forEach((listener) => listener(envelope.action));
        })
        .subscribe();
      stateRef.current = { ...initialDemoState };
      sessionRef.current = next;
      setDeciderName(null);
      setSession({ id: row.id });
    } finally {
      creating.current = false;
    }
  }, [broadcastState, refreshDecider]);

  // A fresh session for every run: on first load, and whenever the demo returns to the opening screen after being used.
  useEffect(() => {
    if (scene !== 'opening') return;
    const current = sessionRef.current;
    if (current && current.status !== 'ended' && stateRef.current.scene === 'opening') return;
    if (current) {
      endSession();
      void supabase?.removeChannel(current.channel);
      sessionRef.current = null;
      setSession(null);
    }
    void createSession();
  }, [scene, createSession, endSession]);

  // Fallback for a missed “joined” broadcast while the QR code is up (human-team summary).
  useEffect(() => {
    if (!session || deciderName || scene !== 'agentRace') return;
    const timer = window.setInterval(() => { void refreshDecider(); }, 4000);
    return () => window.clearInterval(timer);
  }, [session, deciderName, scene, refreshDecider]);

  const publish = useCallback((partial: Partial<DemoState>) => {
    const current = sessionRef.current;
    if (!current || current.status === 'ended') return;
    stateRef.current = { ...stateRef.current, ...partial, seq: stateRef.current.seq + 1 };
    broadcastState();
    persist();
    // The session freezes at the outcome: the phone keeps its final channel, and the laptop is free to navigate.
    if (stateRef.current.stage === 'outcome') endSession();
  }, [broadcastState, persist, endSession]);

  useEffect(() => { publish({ scene }); }, [scene, publish, session]);

  // If the laptop page reloads or closes mid-run, end the session so the phone shows “ended” instead of waiting forever.
  // The socket and normal fetches are torn down during unload, so this uses keepalive HTTP requests.
  useEffect(() => {
    const onPageHide = () => {
      const current = sessionRef.current;
      if (!current || current.status === 'ended' || !SUPABASE_URL || !SUPABASE_KEY) return;
      current.status = 'ended';
      const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
      const send = (path: string, body: unknown) => { try { void fetch(`${SUPABASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body), keepalive: true }); } catch { /* best effort */ } };
      send('/rest/v1/rpc/host_update_session', { p_id: current.id, p_secret: current.secret, p_state: stateRef.current, p_status: 'ended' });
      send('/realtime/v1/api/broadcast', { messages: [{ topic: channelName(current.id), event: EVENTS.status, payload: { status: 'ended' }, private: false }] });
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [endSession]);

  useEffect(() => () => {
    const current = sessionRef.current;
    if (current) void supabase?.removeChannel(current.channel);
  }, []);

  const onAction = useCallback((listener: ActionListener) => {
    listeners.current.add(listener);
    return () => { listeners.current.delete(listener); };
  }, []);

  const api = useMemo<CompanionApi>(() => supabase ? {
    enabled: true,
    joinUrl: session ? `${COMPANION_URL}${COMPANION_URL.includes('?') ? '&' : '?'}s=${session.id}` : null,
    deciderName,
    publish,
    onAction,
  } : disabledApi, [session, deciderName, publish, onAction]);

  return <CompanionContext.Provider value={api}>{children}</CompanionContext.Provider>;
}
