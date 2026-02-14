import { useState, useEffect } from 'react';

/**
 * 移动端检测Hook
 * 用于动态调整移动端布局
 */
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    // 检测函数
    const checkDevice = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      
      // 移动端判断
      setIsMobile(width < 768);
      
      // 平板判断
      setIsTablet(width >= 768 && width < 1024);
      
      // 横竖屏判断
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    // 初始检测
    checkDevice();

    // 监听窗口变化
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    // 清理
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return {
    isMobile,      // 是否移动端 (< 768px)
    isTablet,      // 是否平板 (768px - 1024px)
    isPortrait,    // 是否竖屏
    isDesktop: !isMobile && !isTablet, // 是否桌面端
    screenWidth,   // 屏幕宽度
  };
};

/**
 * 获取图表高度的Hook
 * 根据设备类型返回合适的图表高度
 */
export const useChartHeight = (baseHeight: number = 400) => {
  const { isMobile, isTablet, isPortrait } = useMobile();

  if (isMobile) {
    return isPortrait ? 280 : 220;
  }
  
  if (isTablet) {
    return isPortrait ? 320 : 280;
  }

  return baseHeight;
};

/**
 * 获取栅格配置的Hook
 * 返回适合当前设备的栅格配置
 */
export const useResponsiveGrid = () => {
  const { isMobile, isTablet } = useMobile();

  if (isMobile) {
    return {
      gutter: [8, 8] as [number, number],
      cardGutter: 8,
      statSpan: 24,     // 移动端统计卡片占满一行
      chartSpan: 24,    // 移动端图表占满一行
      tableScrollX: 800,
    };
  }

  if (isTablet) {
    return {
      gutter: [12, 12] as [number, number],
      cardGutter: 12,
      statSpan: 12,     // 平板2列
      chartSpan: 24,    // 图表占满
      tableScrollX: 900,
    };
  }

  // 桌面端
  return {
    gutter: [16, 16] as [number, number],
    cardGutter: 16,
    statSpan: 6,       // 4列
    chartSpan: 12,     // 2列
    tableScrollX: 1000,
  };
};

/**
 * 移动端类型检测
 */
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceType;
};

export default useMobile;
