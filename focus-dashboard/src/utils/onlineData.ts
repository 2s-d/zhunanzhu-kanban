// 在线获取数据 - WebSocket版（支持自动重连/重订阅）

const WS_URL = 'ws://108.160.131.86:8080';

type Status = 'connected' | 'disconnected' | 'reconnecting';
type StatusCallback = (status: Status, info?: { attempt?: number; reason?: string }) => void;

let ws: WebSocket | null = null;
let onMessageCallback: ((data: any) => void) | null = null;
let onErrorCallback: ((error: any) => void) | null = null;
let onCloseCallback: (() => void) | null = null;
let onStatusCallback: StatusCallback | null = null;

let lastPhone: string | null = null;
let lastKey: string | null = null;
let shouldReconnect = false;
let reconnectAttempt = 0;
let reconnectTimer: number | null = null;
let isExplicitDisconnect = false;

function setStatus(status: Status, info?: { attempt?: number; reason?: string }) {
  onStatusCallback?.(status, info);
}

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function cleanupSocket() {
  if (!ws) return;
  ws.onopen = null;
  ws.onmessage = null;
  ws.onerror = null;
  ws.onclose = null;
  ws = null;
}

// WebSocket连接状态
export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

function scheduleReconnect(reason?: string) {
  if (!shouldReconnect) return;
  if (!lastPhone || !lastKey) return;
  if (reconnectTimer !== null) return;

  reconnectAttempt += 1;
  const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(5, reconnectAttempt - 1))); // 1,2,4,8,16,30
  setStatus('reconnecting', { attempt: reconnectAttempt, reason });

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect(lastPhone!, lastKey!, { isReconnect: true }).catch(() => {
      // connect 内部会触发下一轮 scheduleReconnect
    });
  }, delay);
}

// 连接到WebSocket服务器（含重连）
export function connect(
  phone: string,
  key: string,
  options?: { isReconnect?: boolean },
): Promise<{ data: any; updatedAt?: string | null }> {
  lastPhone = phone;
  lastKey = key;
  shouldReconnect = true;
  isExplicitDisconnect = false;

  if (ws && !options?.isReconnect) {
    try {
      ws.close();
    } catch (_) {
      /* ignore */
    }
    cleanupSocket();
  }

  clearReconnectTimer();

  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(WS_URL);

      // 连接超时
      const timeout = window.setTimeout(() => {
        reject(new Error('连接超时，请检查服务器是否启动'));
        try {
          ws?.close();
        } catch (_) {
          /* ignore */
        }
      }, 10000);

      ws.onopen = () => {
        // 发送订阅消息
        ws?.send(
          JSON.stringify({
            type: 'subscribe',
            phone,
            key,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'subscribed') {
            // 订阅成功，返回历史数据
            window.clearTimeout(timeout);
            reconnectAttempt = 0;
            setStatus('connected');

            const payload = {
              data: data.data ?? null,
              updatedAt: data.updatedAt ?? null,
            };

            // 重连成功时也主动用最新数据刷新一次 UI
            if (options?.isReconnect && payload.data != null && onMessageCallback) {
              onMessageCallback(payload.data);
            }

            resolve(payload);
            return;
          }

          if (data.type === 'realtime') {
            // 实时数据推送
            onMessageCallback?.(data.data);
            return;
          }

          if (data.type === 'error') {
            // 错误
            window.clearTimeout(timeout);
            // key 错误等不可恢复错误：停止自动重连
            shouldReconnect = false;
            const errorMsg = data.message || '订阅失败';
            const errorCode = data.errorCode || '';

            // 密钥过期：特殊提示
            if (errorCode === 'KEY_EXPIRED' || errorMsg.includes('过期')) {
              setStatus('disconnected', { reason: '密钥已过期，请重新认证' });
              reject(new Error('密钥已过期（30天有效期），请在APP中重新进行号码认证'));
            } else {
              setStatus('disconnected', { reason: errorMsg });
              reject(new Error(errorMsg));
            }
            return;
          }
        } catch (e) {
          console.error('解析消息失败:', e);
        }
      };

      ws.onerror = (error) => {
        window.clearTimeout(timeout);
        onErrorCallback?.(error);
        cleanupSocket();
        setStatus('disconnected', { reason: 'WebSocket错误' });
        reject(new Error('连接失败，请检查服务器是否启动'));
      };

      ws.onclose = () => {
        window.clearTimeout(timeout);
        cleanupSocket();
        onCloseCallback?.();

        if (isExplicitDisconnect) {
          setStatus('disconnected', { reason: '主动断开' });
          return;
        }

        setStatus('disconnected', { reason: '连接断开' });
        scheduleReconnect('连接断开');
      };
    } catch (e) {
      cleanupSocket();
      reject(e);
    }
  });
}

// 监听实时数据推送
export function onMessage(callback: (data: any) => void) {
  onMessageCallback = callback;
}

// 监听错误
export function onError(callback: (error: any) => void) {
  onErrorCallback = callback;
}

// 监听关闭
export function onClose(callback: () => void) {
  onCloseCallback = callback;
}

export function onStatus(callback: StatusCallback) {
  onStatusCallback = callback;
}

// 断开连接
export function disconnect() {
  shouldReconnect = false;
  isExplicitDisconnect = true;
  clearReconnectTimer();

  if (ws) {
    try {
      ws.close();
    } catch (_) {
      /* ignore */
    }
    cleanupSocket();
  }
  onMessageCallback = null;
  onErrorCallback = null;
  onCloseCallback = null;
  onStatusCallback = null;

  lastPhone = null;
  lastKey = null;
  reconnectAttempt = 0;
}

// 检查手机连接状态（通过WebSocket）
export async function checkPhoneStatus(_phone: string): Promise<boolean> {
  return isConnected();
}
