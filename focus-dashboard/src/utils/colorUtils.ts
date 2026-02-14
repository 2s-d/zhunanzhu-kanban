// 将Flutter的Color值转换为十六进制颜色字符串
export const colorFromFlutterValue = (colorValue: number): string => {
  // Flutter的Color值是ARGB格式的32位整数
  // 例如: 4280391411 = 0xFF4CAF4F
  const hex = colorValue.toString(16).padStart(8, '0');
  // 提取RGB值（忽略Alpha通道）
  const r = parseInt(hex.substring(2, 4), 16);
  const g = parseInt(hex.substring(4, 6), 16);
  const b = parseInt(hex.substring(6, 8), 16);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// 根据主色生成配色方案
export const generateColorPalette = (primaryColor: string) => {
  // 简单的颜色变换，生成一套配色
  return {
    primary: primaryColor,
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
    info: primaryColor,
  };
};
