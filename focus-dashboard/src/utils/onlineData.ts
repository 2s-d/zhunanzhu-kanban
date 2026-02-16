// 在线获取数据 - WebSocket版

const WS_URL = 'ws://108.160.131.86:8080';

let ws: WebSocket | null = null;
let onMessageCallback: ((data: any) => void) | null = null;
let onErrorCallback: ((error: any) => void) | null = null;
let onCloseCallback: (() => void) | null = null;

// WebSocket连接状态
export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

// 连接到WebSocket服务器
export function connect(phone: string, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // 如果已连接，先断开
    if (ws) {
      ws.close();
    }

    try {
      ws = new WebSocket(WS_URL);

      // 连接超时
      const timeout = setTimeout(() => {
        reject(new Error('连接超时，请检查服务器是否启动'));
        if (ws) ws.close();
      }, 10000);

      ws.onopen = () => {
        console.log('WebSocket连接成功');
        clearTimeout(timeout);

        // 发送订阅消息
        ws?.send(JSON.stringify({
          type: 'subscribe',
          phone: phone,
          key: key
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('收到消息:', data.type);

          if (data.type === 'subscribed') {
            // 订阅成功，返回历史数据
            clearTimeout(timeout);
            resolve({
              data: data.data,
              updatedAt: data.updatedAt
            });
          } else if (data.type === 'realtime') {
            // 实时数据推送
            if (onMessageCallback) {
              onMessageCallback(data.data);
            }
          } else if (data.type === 'error') {
            // 错误
            clearTimeout(timeout);
            reject(new Error(data.message || '订阅失败'));
          }
        } catch (e) {
          console.error('解析消息失败:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        clearTimeout(timeout);
        if (onErrorCallback) {
          onErrorCallback(error);
        }
        reject(new Error('连接失败，请检查服务器是否启动'));
      };

      ws.onclose = () => {
        console.log('WebSocket连接关闭');
        if (onCloseCallback) {
          onCloseCallback();
        }
      };

    } catch (e) {
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

// 断开连接
export function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
  onMessageCallback = null;
  onErrorCallback = null;
  onCloseCallback = null;
}

// 检查手机连接状态（通过WebSocket）
export async function checkPhoneStatus(phone: string): Promise<boolean> {
  // WebSocket方式下，状态通过连接和订阅来确认
  return isConnected();
}
