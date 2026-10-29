import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type LANConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface LANEvent {
  type: string;
  payload: any;
  timestamp: string;
}

interface LANContextType {
  status: LANConnectionStatus;
  latencyMs: number | null;
  lastEvent: LANEvent | null;
  subscribe: (eventType: string, callback: (payload: any) => void) => () => void;
  reconnect: () => void;
}

const LANContext = createContext<LANContextType | undefined>(undefined);

export const LANProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<LANConnectionStatus>('reconnecting');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState<LANEvent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const pingSentTimeRef = useRef<number>(0);
  const backoffRef = useRef<number>(1000); // 1s initial, doubles up to 10s
  const subscribersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map());

  const connect = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {
        // ignore
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    setStatus('reconnecting');

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        backoffRef.current = 1000; // Reset backoff

        // Start ping interval to test latency and keep-alive
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingSentTimeRef.current = Date.now();
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') {
            if (pingSentTimeRef.current > 0) {
              setLatencyMs(Date.now() - pingSentTimeRef.current);
            }
            return;
          }

          setLastEvent(data);

          // Notify subscribers
          const callbacks = subscribersRef.current.get(data.type);
          if (callbacks) {
            callbacks.forEach((cb) => cb(data.payload));
          }
          // Also wildcard subscribers
          const allCallbacks = subscribersRef.current.get('*');
          if (allCallbacks) {
            allCallbacks.forEach((cb) => cb(data));
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        clearInterval(pingIntervalRef.current);
        setLatencyMs(null);

        // Schedule reconnect with backoff
        clearTimeout(reconnectTimeoutRef.current);
        const delay = Math.min(backoffRef.current, 10000);
        backoffRef.current *= 1.5;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = () => {
        setStatus('disconnected');
      };
    } catch {
      setStatus('disconnected');
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((eventType: string, callback: (payload: any) => void) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set());
    }
    subscribersRef.current.get(eventType)!.add(callback);

    return () => {
      const set = subscribersRef.current.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          subscribersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  const reconnect = useCallback(() => {
    backoffRef.current = 1000;
    connect();
  }, [connect]);

  return (
    <LANContext.Provider
      value={{
        status,
        latencyMs,
        lastEvent,
        subscribe,
        reconnect,
      }}
    >
      {children}
    </LANContext.Provider>
  );
};

export function useLAN() {
  const context = useContext(LANContext);
  if (!context) {
    throw new Error('useLAN must be used within a LANProvider');
  }
  return context;
}
