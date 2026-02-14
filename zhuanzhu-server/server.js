/**
 * 专注APP数据中转服务器
 * 
 * 功能：
 * 1. WebSocket服务器 - 接收手机连接
 * 2. HTTP服务器 - 接收网页数据请求
 * 3. 转发逻辑 - 将网页请求转发给对应手机
 */

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

// ==================== 配置 ====================
const HTTP_PORT = 3007;      // HTTP服务器端口（网页请求）
const WS_PORT = 8080;        // WebSocket端口（手机连接）

// ==================== 数据存储 ====================
// 存储所有连接的手机
// 格式: { phone: { ws: websocket连接, key: 密钥, connectedAt: 时间 } }
const connections = new Map();

// ==================== HTTP服务器 ====================
const app = express();
app.use(cors());
app.use(express.json());

// 根路径 - 返回服务器状态
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '专注数据中转服务器运行中',
    connections: connections.size,
    devices: Array.from(connections.keys())
  });
});

// 获取数据接口 - 网页请求数据
// 格式: GET /api/data?phone=xxx&key=xxx
app.get('/api/data', (req, res) => {
  const { phone, key } = req.query;
  
  console.log(`收到数据请求: phone=${phone}`);
  
  // 1. 验证参数
  if (!phone || !key) {
    return res.status(400).json({ 
      success: false, 
      error: '缺少必要参数 phone 或 key' 
    });
  }
  
  // 2. 查找对应的手机连接
  const connection = connections.get(phone);
  
  if (!connection) {
    return res.status(404).json({ 
      success: false, 
      error: '手机未连接，请确保APP已启动并连接服务器' 
    });
  }
  
  // 3. 验证密钥
  if (connection.key !== key) {
    return res.status(401).json({ 
      success: false, 
      error: '密钥不匹配' 
    });
  }
  
  // 4. 发送请求给手机，等待响应
  sendRequestToPhone(connection.ws, 'get_data')
    .then(data => {
      res.json({
        success: true,
        data: data
      });
    })
    .catch(error => {
      res.status(500).json({ 
        success: false, 
        error: '手机响应失败: ' + error.message 
      });
    });
});

// 检查手机连接状态
app.get('/api/status', (req, res) => {
  const { phone } = req.query;
  
  if (!phone) {
    return res.status(400).json({ 
      success: false, 
      error: '缺少 phone 参数' 
    });
  }
  
  const connection = connections.get(phone);
  
  if (connection) {
    res.json({
      success: true,
      connected: true,
      connectedAt: connection.connectedAt
    });
  } else {
    res.json({
      success: true,
      connected: false
    });
  }
});

// 创建HTTP服务器
const httpServer = app.listen(HTTP_PORT, () => {
  console.log(`🌐 HTTP服务器已启动: http://0.0.0.0:${HTTP_PORT}`);
  console.log(`   网页请求地址: http://你的服务器IP:${HTTP_PORT}/api/data`);
});


// ==================== WebSocket服务器 ====================
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`📱 WebSocket服务器已启动: ws://0.0.0.0:${WS_PORT}`);

wss.on('connection', (ws, req) => {
  console.log('📱 收到新的手机连接');
  
  let deviceInfo = null;
  
  // 处理手机发来的消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('收到消息:', data);
      
      // 处理注册消息
      if (data.type === 'register') {
        const { phone, key } = data;
        
        if (!phone || !key) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '缺少 phone 或 key'
          }));
          return;
        }
        
        // 保存连接
        connections.set(phone, {
          ws: ws,
          key: key,
          connectedAt: new Date().toISOString()
        });
        
        deviceInfo = phone;
        
        console.log(`✅ 手机注册成功: ${phone}, 当前连接数: ${connections.size}`);
        
        ws.send(JSON.stringify({
          type: 'registered',
          phone: phone,
          message: '注册成功'
        }));
      }
      
      // 处理数据响应
      else if (data.type === 'response') {
        handlePhoneResponse(data);
      }
      
    } catch (error) {
      console.error('解析消息失败:', error);
    }
  });
  
  // 处理连接关闭
  ws.on('close', () => {
    if (deviceInfo) {
      connections.delete(deviceInfo);
      console.log(`❌ 手机断开连接: ${deviceInfo}, 剩余连接数: ${connections.size}`);
    }
  });
  
  // 处理错误
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});


// ==================== 请求响应管理 ====================
// 存储等待响应的回调
const pendingRequests = new Map();

// 发送请求给手机，并等待响应
function sendRequestToPhone(ws, action) {
  return new Promise((resolve, reject) => {
    // 生成唯一请求ID
    const requestId = Date.now().toString();
    
    // 设置超时（10秒）
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('请求超时'));
    }, 10000);
    
    // 保存回调
    pendingRequests.set(requestId, {
      resolve,
      reject,
      timeout
    });
    
    // 发送请求给手机
    ws.send(JSON.stringify({
      type: 'request',
      requestId: requestId,
      action: action
    }));
  });
}

// 处理手机的响应
function handlePhoneResponse(data) {
  const { requestId, data: responseData, error } = data;
  
  const pending = pendingRequests.get(requestId);
  if (!pending) return;
  
  // 清除超时
  clearTimeout(pending.timeout);
  pendingRequests.delete(requestId);
  
  if (error) {
    pending.reject(new Error(error));
  } else {
    pending.resolve(responseData);
  }
}


// ==================== 优雅关闭 ====================
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  
  // 关闭所有连接
  wss.clients.forEach(client => {
    client.close();
  });
  
  // 关闭服务器
  httpServer.close(() => {
    console.log('HTTP服务器已关闭');
  });
  
  wss.close(() => {
    console.log('WebSocket服务器已关闭');
    process.exit(0);
  });
});

console.log('\n========================================');
console.log('   专注APP数据中转服务器 - 启动完成');
console.log('========================================');
console.log(`HTTP服务器: http://0.0.0.0:${HTTP_PORT}`);
console.log(`WebSocket: ws://0.0.0.0:${WS_PORT}`);
console.log('');
console.log('访问地址:');
console.log(`  - HTTP: http://108.160.131.86:${HTTP_PORT}`);
console.log(`  - WS:   ws://108.160.131.86:${WS_PORT}`);
console.log('========================================\n');
