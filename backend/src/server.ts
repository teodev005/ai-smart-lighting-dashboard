import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { DeviceStorage } from './database/storage.js';
import { WebSocketManager } from './websocket/ws-manager.js';
import { MqttManager } from './mqtt/mqtt-manager.js';
import { DeviceController } from './controllers/device-controller.js';
import { createApiRouter } from './routes/api.js';

dotenv.config();

export function createBackendApp() {
  const app = express();
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

  const storage = new DeviceStorage();
  const wsManager = new WebSocketManager();
  const mqttManager = new MqttManager(storage, wsManager);
  const deviceController = new DeviceController(storage, mqttManager, wsManager);

  app.use('/api', createApiRouter(deviceController));

  return { app, storage, wsManager, mqttManager, deviceController };
}

if (process.env.RUN_STANDALONE === 'true') {
  const PORT = Number(process.env.PORT) || 3001;
  const { app, storage, wsManager, mqttManager } = createBackendApp();
  const server = http.createServer(app);

  wsManager.init(server);
  mqttManager.init();

  wsManager.onClientConnect((ws) => {
    wsManager.sendTo(ws, {
      type: 'mqtt-status',
      payload: mqttManager.getMqttStatus(),
    });
    const devices = storage.getAll();
    wsManager.sendTo(ws, {
      type: 'devices-list',
      payload: { devices, activeDeviceId: devices.length > 0 ? devices[0].deviceId : null },
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Standalone Backend] Running at http://0.0.0.0:${PORT}`);
  });
}
