/**
 * 专注APP数据中转服务器 - 增强版
 * 
 * 原有功能：
 * 1. WebSocket服务器 - 接收手机连接
 * 2. HTTP服务器 - 接收网页数据请求
 * 3. 转发逻辑 - 将网页请求转发给对应手机
 * 
 * 新增功能：
 * 1. 持久化存储 - 数据存入JSON文件，APP不在线也能获取
 * 2. 前端订阅 - 前端通过WebSocket订阅，数据变化实时推送
 * 3. APP推送 - APP数据变化主动推送到服务器
 * 4. 数据清理 - 定时清理7天前的旧数据
 */

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================
const HTTP_PORT = 3007;      // HTTP服务器端口（网页请求）
const WS_PORT = 8080;        // WebSocket端口（手机连接）
const DB_FILE = path.join(__dirname, 'data.json'); // 数据存储文件

// ==================== 数据存储 ====================
// APP连接（手机在线）
// 格式: { phone: { ws: websocket连接, key: 密钥, connectedAt: 时间 } }
const connections = new Map();

// 前端订阅（Dashboard在线）
// 格式: { phone: { ws: websocket连接, key: 密钥 } }
const subscriptions = new Map();

// 内存缓存（从磁盘加载）
let dataCache = loadFromDisk();

// ==================== 持久化函数 ====================
function loadFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载数据失败:', e);
  }
  return {};
}

function saveToDisk() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dataCache, null, 2));
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

// ==================== 数据操作 ====================
// 存数据（覆盖式，只存最新状态）
function saveData(phone, data) {
  dataCache[phone] = {
    data: data,
    updatedAt: new Date().toISOString()
  };
  saveToDisk();
}

// 取数据
function getData(phone) {
  return dataCache[phone] || null;
}

// 取所有数据
function getAllData() {
  return dataCache;
}

// 清理旧数据（每个手机号只保留最新，删除7天前的）
function cleanupOldData() {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
  
  let deletedCount = 0;
  for (const phone in dataCache) {
    const record = dataCache[phone];
    const age = now - new Date(record.updatedAt).getTime();
    
    if (age > maxAge) {
      delete dataCache[phone];
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    saveToDisk();
    console.log(`数据清理完成: 删除 ${deletedCount} 条，当前剩余 ${Object.keys(dataCache).length} 条`);
  }
}

// 每天凌晨3点清理
setInterval(cleanupOldData, 24 * 60 * 60 * 1000);

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
    subscriptions: subscriptions.size,
    hasData: Object.keys(dataCache).length,
    devices: Array.from(connections.keys())
  });
});

// 获取数据接口 - 网页请求数据
// 优先从数据库读取，APP不在线也能获取
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
  
  // 2. 优先从数据库读取（APP不在线也能获取）
  const record = getData(phone);
  
  if (!record) {
    return res.status(404).json({ 
      success: false, 
      error: '暂无数据，请确保APP已同步过数据' 
    });
  }
  
  // 3. 验证密钥（从数据库或APP连接）
  const appConn = connections.get(phone);
  const dbData = record.data;
  
  // 支持两种验证方式：数据库中存了key，或者APP在线
  const validKey = (dbData && dbData.key === key) || (appConn && appConn.key === key);
  
  if (!validKey) {
    return res.status(401).json({ 
      success: false, 
      error: '密钥不匹配' 
    });
  }
  
  // 4. 返回数据
  res.json({
    success: true,
    data: record.data,
    updatedAt: record.updatedAt
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
  const subscription = subscriptions.get(phone);
  const hasData = !!getData(phone);
  
  res.json({
    success: true,
    connected: !!connection,
    subscribed: !!subscription,
    hasData: hasData
  });
});

// 创建HTTP服务器
const httpServer = app.listen(HTTP_PORT, () => {
  console.log(`🌐 HTTP服务器已启动: http://0.0.0.0:${HTTP_PORT}`);
  console.log(`   网页请求地址: http://你的服务器IP:${HTTP_PORT}/api/data`);
  console.log(`   数据文件: ${DB_FILE}`);
});


// ==================== WebSocket服务器 ====================
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`📱 WebSocket服务器已启动: ws://0.0.0.0:${WS_PORT}`);

wss.on('connection', (ws, req) => {
  console.log('📱 收到新的WebSocket连接');
  
  let deviceInfo = null;
  let isApp = false; // true=APP(手机), false=前端(Dashboard)
  
  // 处理发来的消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('收到消息:', data.type);
      
      // ===== APP注册 =====
      if (data.type === 'register') {
        const { phone, key } = data;
        
        if (!phone || !key) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '缺少 phone 或 key'
          }));
          return;
        }
        
        // 保存APP连接
        connections.set(phone, {
          ws: ws,
          key: key,
          connectedAt: new Date().toISOString()
        });
        
        deviceInfo = phone;
        isApp = true;
        
        console.log(`✅ APP注册成功: ${phone}, 当前连接数: ${connections.size}`);
        
        ws.send(JSON.stringify({
          type: 'registered',
          phone: phone,
          message: '注册成功'
        }));
        
        // APP连接时，如果有前端订阅，推送最新数据
        const record = getData(phone);
        const subscription = subscriptions.get(phone);
        if (subscription && record) {
          subscription.ws.send(JSON.stringify({
            type: 'realtime',
            data: record.data,
            updatedAt: record.updatedAt
          }));
          console.log(`📤 APP上线，推送数据给前端: ${phone}`);
        }
      }
      
      // ===== 前端订阅 =====
      else if (data.type === 'subscribe') {
        const { phone, key } = data;
        
        if (!phone || !key) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '缺少 phone 或 key'
          }));
          return;
        }
        
        // 验证key（从数据库或APP连接）
        const appConn = connections.get(phone);
        const record = getData(phone);
        
        const validKey = (record && record.data && record.data.key === key) || 
                        (appConn && appConn.key === key);
        
        if (!validKey) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '密钥错误'
          }));
          return;
        }
        
        // 保存前端订阅
        subscriptions.set(phone, { ws, key });
        deviceInfo = phone;
        isApp = false;
        
        // 返回历史数据（从数据库）
        const dbRecord = getData(phone);
        ws.send(JSON.stringify({
          type: 'subscribed',
          phone: phone,
          data: dbRecord ? dbRecord.data : null,
          updatedAt: dbRecord ? dbRecord.updatedAt : null
        }));
        
        console.log(`✅ 前端订阅成功: ${phone}, 有历史数据: ${!!dbRecord}`);
      }
      
      // ===== APP推送数据 =====
      else if (data.type === 'push') {
        const { phone, data: pushData } = data;
        
        // 存到数据库（覆盖）
        saveData(phone, pushData);
        console.log(`💾 数据已保存: ${phone}`);
        
        // 推送给订阅的前端
        const subscription = subscriptions.get(phone);
        if (subscription) {
          subscription.ws.send(JSON.stringify({
            type: 'realtime',
            data: pushData,
            updatedAt: new Date().toISOString()
          }));
          console.log(`📤 实时推送给前端: ${phone}`);
        }
      }
      
      // ===== APP响应请求 =====
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
      if (isApp) {
        connections.delete(deviceInfo);
        console.log(`❌ APP断开连接: ${deviceInfo}, 剩余APP连接: ${connections.size}`);
      } else {
        subscriptions.delete(deviceInfo);
        console.log(`❌ 前端断开订阅: ${deviceInfo}, 剩余前端订阅: ${subscriptions.size}`);
      }
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
console.log('   专注APP数据中转服务器 - 增强版');
console.log('========================================');
console.log(`HTTP服务器: http://0.0.0.0:${HTTP_PORT}`);
console.log(`WebSocket: ws://0.0.0.0:${WS_PORT}`);
console.log('');
console.log('新增功能:');
console.log('  ✓ 持久化存储 - 数据存入JSON文件');
console.log('  ✓ 前端订阅 - WebSocket订阅机制');
console.log('  ✓ APP推送 - 数据变化主动推送');
console.log('  ✓ 数据清理 - 每天凌晨清理7天前数据');
console.log('');
console.log('访问地址:');
console.log(`  - HTTP: http://108.160.131.86:${HTTP_PORT}`);
console.log(`  - WS:   ws://108.160.131.86:${WS_PORT}`);
console.log('========================================\n');
