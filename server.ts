import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { DeviceStorage } from './backend/src/database/storage.js';
import { WebSocketManager } from './backend/src/websocket/ws-manager.js';
import { MqttManager } from './backend/src/mqtt/mqtt-manager.js';
import { DeviceController } from './backend/src/controllers/device-controller.js';
import { createApiRouter } from './backend/src/routes/api.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // CORS middleware for API
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Database / Storage
  const storage = new DeviceStorage();

  // WebSocket Manager
  const wsManager = new WebSocketManager();
  wsManager.init(server);

  // MQTT Manager
  const mqttManager = new MqttManager(storage, wsManager);
  mqttManager.init();

  // On client connect to WS, push current state
  wsManager.onClientConnect((ws) => {
    wsManager.sendTo(ws, {
      type: 'mqtt-status',
      payload: mqttManager.getMqttStatus(),
    });

    const devices = storage.getAll();
    wsManager.sendTo(ws, {
      type: 'devices-list',
      payload: {
        devices,
        activeDeviceId: devices.length > 0 ? devices[0].deviceId : null,
      },
    });

    // Also push current known telemetry for each device
    for (const dev of devices) {
      if (dev.lastTelemetry) {
        wsManager.sendTo(ws, {
          type: 'device-telemetry',
          payload: {
            deviceId: dev.deviceId,
            telemetry: dev.lastTelemetry,
          },
        });
      }
    }
  });

  // Device Controller and API routes
  const deviceController = new DeviceController(storage, mqttManager, wsManager);
  app.use('/api', createApiRouter(deviceController));

  // Vite or Static Serving
  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Đang tắt máy chủ an toàn...');
    mqttManager.destroy();
    server.close(() => {
      console.log('[Server] Đã đóng tất cả kết nối.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Hệ thống AI Smart Lighting đang chạy tại http://0.0.0.0:${PORT}`);
    console.log(`[Server] Chế độ: ${isProd ? 'Production' : 'Development (Vite HMR/Middleware)'}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Khởi động thất bại:', err);
  process.exit(1);
});
