import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { WebSocketMessage } from '../../../shared/types/index.js';

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private onClientConnectCallback?: (ws: WebSocket) => void;

  public init(server: HttpServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      // Heartbeat message handler (handles application-level ping from frontend)
      ws.on('message', (data) => {
        try {
          const str = data.toString();
          if (str === 'ping' || str.includes('"ping"')) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // ignore non-json messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Lỗi kết nối client:', err.message);
        this.clients.delete(ws);
      });

      if (this.onClientConnectCallback) {
        this.onClientConnectCallback(ws);
      }
    });

    // Server-side ping heartbeat every 15 seconds to keep edge proxies alive
    const interval = setInterval(() => {
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.ping();
          } catch {
            this.clients.delete(client);
          }
        } else {
          this.clients.delete(client);
        }
      }
    }, 15000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    console.log('[WebSocketManager] Đã khởi tạo WebSocket server tại đường dẫn /ws với keep-alive');
  }

  public onClientConnect(cb: (ws: WebSocket) => void) {
    this.onClientConnectCallback = cb;
  }

  public sendTo(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcast(message: WebSocketMessage) {
    const raw = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}
