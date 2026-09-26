export * from '../../../shared/types/index.js';

export interface ChartDataPoint {
  timeStr: string;
  timestamp: number;
  darkness: number;
  brightness: number;
  temperature: number;
  humidity: number;
  pwmCurrent: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}
