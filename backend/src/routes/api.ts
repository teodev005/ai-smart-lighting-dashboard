import { Router } from 'express';
import { DeviceController } from '../controllers/device-controller.js';

export function createApiRouter(deviceController: DeviceController): Router {
  const router = Router();

  // Devices & Pairing
  router.get('/devices', deviceController.getDevices);
  router.get('/devices/:deviceId', deviceController.getDevice);
  router.post('/pair', deviceController.pair);
  router.delete('/devices/:deviceId', deviceController.deleteDevice);

  // Commands
  router.post('/devices/:deviceId/commands/mode', deviceController.setMode);
  router.post('/devices/:deviceId/commands/brightness', deviceController.setBrightness);
  router.post('/devices/:deviceId/commands/fan/mode', deviceController.setFanMode);
  router.post('/devices/:deviceId/commands/fan/speed', deviceController.setFanSpeed);
  router.post('/devices/:deviceId/commands/ai/reset', deviceController.resetAi);

  return router;
}
