// 在线获取数据API服务

const SERVER_URL = 'http://108.160.131.86:3007';

// 检查手机连接状态
export async function checkPhoneStatus(phone: string): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/api/status?phone=${phone}`);
    const data = await response.json();
    return data.success && data.connected;
  } catch (error) {
    console.error('检查连接状态失败:', error);
    return false;
  }
}

// 从服务器获取数据
export async function fetchDataFromServer(phone: string, key: string): Promise<any> {
  const response = await fetch(`${SERVER_URL}/api/data?phone=${phone}&key=${key}`);
  
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || '获取数据失败');
  }
  
  return result.data;
}
