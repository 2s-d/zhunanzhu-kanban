/**
 * 专注APP数据中转服务器 - 纯WebSocket版
 * 
 * 全部通过WebSocket通信，不需要HTTP接口
 * 
 * 功能：
 * 1. 持久化存储 - 数据存入JSON文件，APP不在线也能获取
 * 2. 前端订阅 - 前端通过WebSocket订阅，数据变化实时推送
 * 3. APP推送 - APP数据变化主动推送到服务器
 * 4. 数据清理 - 定时清理7天前的旧数据
 */

const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================
const WS_PORT = 8080;              // WebSocket端口（手机和前端连接）
const DB_FILE = path.join(__dirname, 'data.json'); // 数据存储文件

// ==================== 数据存储 ====================
// APP连接（手机在线）
const connections = new Map();

// 前端订阅（Dashboard在线）
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

// 清理旧数据（删除7天前的）
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

// 每天凌晨清理
setInterval(cleanupOldData, 24 * 60 * 60 * 1000);

// ==================== WebSocket服务器 ====================
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`WebSocket服务器已启动: ws://0.0.0.0:${WS_PORT}`);

wss.on('connection', (ws, req) => {
  console.log('收到新的WebSocket连接');
  
  let deviceInfo = null;
  let isApp = false; // true=APP(手机), false=前端(Dashboard)
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('收到消息:', data.type);
      
      // ===== APP注册 =====
      if (data.type === 'register') {
        const { phone, key } = data;
        
        if (!phone || !key) {
          ws.send(JSON.stringify({ type: 'error', message: '缺少 phone 或 key' }));
          return;
        }
        
        connections.set(phone, { ws, key, connectedAt: new Date().toISOString() });
        deviceInfo = phone;
        isApp = true;
        
        console.log(`APP注册成功: ${phone}, 当前连接数: ${connections.size}`);
        
        ws.send(JSON.stringify({ type: 'registered', phone: phone, message: '注册成功' }));
        
        // APP连接时，如果有前端订阅，推送最新数据
        const record = getData(phone);
        const subscription = subscriptions.get(phone);
        if (subscription && record) {
          subscription.ws.send(JSON.stringify({
            type: 'realtime',
            data: record.data,
            updatedAt: record.updatedAt
          }));
          console.log(`APP上线，推送数据给前端: ${phone}`);
        }
      }
      
      // ===== 前端订阅 =====
      else if (data.type === 'subscribe') {
        const { phone, key } = data;
        
        if (!phone || !key) {
          ws.send(JSON.stringify({ type: 'error', message: '缺少 phone 或 key' }));
          return;
        }
        
        // 验证key
        const appConn = connections.get(phone);
        const record = getData(phone);
        const validKey = (record && record.data && record.data.key === key) || (appConn && appConn.key === key);
        
        if (!validKey) {
          ws.send(JSON.stringify({ type: 'error', message: '密钥错误' }));
          return;
        }
        
        // 保存前端订阅
        subscriptions.set(phone, { ws, key });
        deviceInfo = phone;
        isApp = false;
        
        // 返回历史数据
        const dbRecord = getData(phone);
        ws.send(JSON.stringify({
          type: 'subscribed',
          phone: phone,
          data: dbRecord ? dbRecord.data : null,
          updatedAt: dbRecord ? dbRecord.updatedAt : null
        }));
        
        console.log(`前端订阅成功: ${phone}, 有历史数据: ${!!dbRecord}`);
      }
      
      // ===== APP推送数据 =====
      else if (data.type === 'push') {
        const { phone, data: pushData } = data;
        
        // 存到数据库
        saveData(phone, pushData);
        console.log(`数据已保存: ${phone}`);
        
        // 推送给前端
        const subscription = subscriptions.get(phone);
        if (subscription) {
          subscription.ws.send(JSON.stringify({
            type: 'realtime',
            data: pushData,
            updatedAt: new Date().toISOString()
          }));
          console.log(`实时推送给前端: ${phone}`);
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
  
  ws.on('close', () => {
    if (deviceInfo) {
      if (isApp) {
        connections.delete(deviceInfo);
        console.log(`APP断开连接: ${deviceInfo}, 剩余: ${connections.size}`);
      } else {
        subscriptions.delete(deviceInfo);
        console.log(`前端断开订阅: ${deviceInfo}, 剩余: ${subscriptions.size}`);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});

// ==================== 请求响应管理 ====================
const pendingRequests = new Map();

function sendRequestToPhone(ws, action) {
  return new Promise((resolve, reject) => {
    const requestId = Date.now().toString();
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('请求超时'));
    }, 10000);
    
    pendingRequests.set(requestId, { resolve, reject, timeout });
    ws.send(JSON.stringify({ type: 'request', requestId, action }));
  });
}

function handlePhoneResponse(data) {
  const { requestId, data: responseData, error } = data;
  const pending = pendingRequests.get(requestId);
  if (!pending) return;
  
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
  wss.clients.forEach(client => client.close());
  wss.close(() => { console.log('WebSocket服务器已关闭'); process.exit(0); });
});

console.log('\n========================================');
console.log('   专注APP数据中转服务器 - 纯WebSocket版');
console.log('========================================');
console.log(`WebSocket: ws://0.0.0.0:${WS_PORT}`);
console.log(`数据文件: ${DB_FILE}`);
console.log('');
console.log('新增功能:');
console.log('  ✓ 持久化存储 - 数据存入JSON文件');
console.log('  ✓ 前端订阅 - WebSocket订阅机制');
console.log('  ✓ APP推送 - 数据变化主动推送');
console.log('  ✓ 数据清理 - 每天清理7天前数据');
console.log('========================================\n');
