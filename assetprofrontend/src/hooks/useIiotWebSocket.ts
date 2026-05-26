import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// TYPES
// ============================================================================

export interface TagValueUpdate {
  tagId: number;
  name: string;
  value: number | string | boolean;
  quality: string;
  timestamp: string;
  deviceId: number;
  deviceCode: string;
  unit?: string;
}

export interface DeviceStatusUpdate {
  deviceId: number;
  code: string;
  name: string;
  status: string;
  lastSeenAt: string;
}

export interface AlarmEventUpdate {
  id: number;
  alarmName: string;
  severity: string;
  status: string;
  triggerValue: number;
  deviceName: string;
  tagName: string;
  triggeredAt: string;
}

export interface AlarmNotification {
  severity: string;
  message: string;
  triggeredAt: string;
}

export interface WeightCaptureUpdate {
  scaleProfileId: number;
  grossWeight: number;
  netWeight: number;
  unit: string;
  isStable: boolean;
  timestamp: string;
}

export interface IiotWebSocketState {
  connected: boolean;
  error: string | null;
}

export interface UseIiotWebSocketOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Device IDs to subscribe to for tag value updates */
  deviceIds?: number[];
  /** Subscribe to alarm events */
  subscribeAlarms?: boolean;
  /** Called when tag values are received */
  onTagValues?: (data: { deviceId: number; updates: TagValueUpdate[]; timestamp: string }) => void;
  /** Called when a device status changes */
  onDeviceStatus?: (update: DeviceStatusUpdate) => void;
  /** Called when an alarm event is triggered */
  onAlarmEvent?: (event: AlarmEventUpdate) => void;
  /** Called when an alarm notification is broadcast */
  onAlarmNotification?: (notification: AlarmNotification) => void;
  /** Called when a weight is captured */
  onWeightCapture?: (data: WeightCaptureUpdate) => void;
}

// ============================================================================
// HOOK
// ============================================================================

const WS_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005').replace(/\/api\/v1$/, '');

export function useIiotWebSocket(options: UseIiotWebSocketOptions = {}) {
  const {
    autoConnect = true,
    deviceIds = [],
    subscribeAlarms = false,
    onTagValues,
    onDeviceStatus,
    onAlarmEvent,
    onAlarmNotification,
    onWeightCapture,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<IiotWebSocketState>({
    connected: false,
    error: null,
  });

  // Store callbacks in refs to avoid reconnecting on handler changes
  const callbacksRef = useRef({
    onTagValues,
    onDeviceStatus,
    onAlarmEvent,
    onAlarmNotification,
    onWeightCapture,
  });

  callbacksRef.current = {
    onTagValues,
    onDeviceStatus,
    onAlarmEvent,
    onAlarmNotification,
    onWeightCapture,
  };

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState({ connected: false, error: 'No auth token' });
      return;
    }

    const socket = io(`${WS_BASE_URL}/iiot`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => {
      setState({ connected: true, error: null });
    });

    socket.on('disconnect', (reason) => {
      setState({ connected: false, error: null });

      // If server disconnected us, don't auto-reconnect (likely auth issue)
      if (reason === 'io server disconnect') {
        socket.disconnect();
      }
    });

    socket.on('connect_error', (err) => {
      setState({ connected: false, error: err.message });
    });

    socket.on('error', (data: { message: string }) => {
      setState((prev) => ({ ...prev, error: data.message }));
    });

    // Data event listeners
    socket.on('tag:values', (data) => {
      callbacksRef.current.onTagValues?.(data);
    });

    socket.on('device:status', (data) => {
      callbacksRef.current.onDeviceStatus?.(data);
    });

    socket.on('alarm:event', (data) => {
      callbacksRef.current.onAlarmEvent?.(data);
    });

    socket.on('alarm:notification', (data) => {
      callbacksRef.current.onAlarmNotification?.(data);
    });

    socket.on('weight:capture', (data) => {
      callbacksRef.current.onWeightCapture?.(data);
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState({ connected: false, error: null });
    }
  }, []);

  // Subscribe/unsubscribe to device rooms
  const subscribeDevice = useCallback((deviceId: number) => {
    socketRef.current?.emit('subscribe:device', { deviceId });
  }, []);

  const unsubscribeDevice = useCallback((deviceId: number) => {
    socketRef.current?.emit('unsubscribe:device', { deviceId });
  }, []);

  // Subscribe/unsubscribe to alarms
  const subscribeToAlarms = useCallback(() => {
    socketRef.current?.emit('subscribe:alarms');
  }, []);

  const unsubscribeFromAlarms = useCallback(() => {
    socketRef.current?.emit('unsubscribe:alarms');
  }, []);

  // Request one-time data
  const requestTagValues = useCallback((deviceId: number) => {
    socketRef.current?.emit('request:tagValues', { deviceId });
  }, []);

  const requestAlarmStats = useCallback(() => {
    socketRef.current?.emit('request:alarmStats');
  }, []);

  // Auto-connect and cleanup
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Auto-subscribe to device rooms when connected
  useEffect(() => {
    if (!state.connected || deviceIds.length === 0) return;

    deviceIds.forEach((id) => subscribeDevice(id));

    return () => {
      deviceIds.forEach((id) => unsubscribeDevice(id));
    };
  }, [state.connected, deviceIds, subscribeDevice, unsubscribeDevice]);

  // Auto-subscribe to alarms when connected
  useEffect(() => {
    if (!state.connected || !subscribeAlarms) return;

    subscribeToAlarms();

    return () => {
      unsubscribeFromAlarms();
    };
  }, [state.connected, subscribeAlarms, subscribeToAlarms, unsubscribeFromAlarms]);

  return {
    ...state,
    connect,
    disconnect,
    subscribeDevice,
    unsubscribeDevice,
    subscribeToAlarms,
    unsubscribeFromAlarms,
    requestTagValues,
    requestAlarmStats,
  };
}
