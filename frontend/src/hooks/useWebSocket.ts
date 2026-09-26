import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MqttStatusPayload,
  WebSocketMessage,
} from '../types/index.js';

interface UseWebSocketOptions {
  onMessage?: (msg: WebSocketMessage) => void;
}

export function useWebSocket({ onMessage }: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState<boolean>(true); // start optimistic to prevent initial flash
  const [mqttStatus, setMqttStatus] = useState<MqttStatusPayload>({
    connected: true,
    broker: 'mqtt://broker.emqx.io:1883',
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectGraceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDestroyedRef = useRef<boolean>(false);

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || isDestroyedRef.current) return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disconnectGraceTimerRef.current) {
          clearTimeout(disconnectGraceTimerRef.current);
          disconnectGraceTimerRef.current = null;
        }
        setIsConnected(true);

        // Start client heartbeat ping every 5 seconds to keep Cloud Run proxy from timing out
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {}
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Ignore pong heartbeats
          if (data.type === 'pong') return;

          if (data.type === 'mqtt-status') {
            setMqttStatus(data.payload);
          }

          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (err) {
          console.error('[WebSocket Client] Lỗi parse tin nhắn:', err);
        }
      };

      ws.onclose = () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Apply 3.5-second grace period before switching UI to "Mất kết nối",
        // preventing rapid 1-second visual stutter during quick socket re-handshakes
        if (!disconnectGraceTimerRef.current) {
          disconnectGraceTimerRef.current = setTimeout(() => {
            if (isDestroyedRef.current) return;
            setIsConnected(false);
          }, 3500);
        }

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isDestroyedRef.current) {
            connect();
          }
        }, 1000);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    } catch {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isDestroyedRef.current) {
          connect();
        }
      }, 1500);
    }
  }, []);

  useEffect(() => {
    isDestroyedRef.current = false;
    connect();

    return () => {
      isDestroyedRef.current = true;
      if (disconnectGraceTimerRef.current) clearTimeout(disconnectGraceTimerRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, [connect]);

  return {
    isServerConnected: isConnected,
    mqttStatus,
  };
}
