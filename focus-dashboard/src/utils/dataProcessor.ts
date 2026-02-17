import dayjs from 'dayjs';
import { AppData, Project, Statistics, TimeTrendData, ProjectStats, RewardSource, LogEntry } from '../types';

// 计算全局统计数据
export const calculateStatistics = (data: AppData | null): Statistics => {
  if (!data) {
    return {
      totalPoints: 0,
      totalProjects: 0,
      totalStudyMinutes: 0,
      consecutiveCheckInDays: 0,
      averageDailyStudyMinutes: 0,
    };
  }

  const totalStudyMinutes = data.projects.reduce((sum, p) => sum + p.totalStudyMinutes, 0);
  
  // 优先使用 App 直接提供的连续签到天数，否则使用计算值
  const consecutiveCheckInDays = data.consecutiveCheckInDays !== undefined 
    ? data.consecutiveCheckInDays 
    : calculateConsecutiveCheckInDays(data.lastCheckInDate);

  // 计算平均每日学习时长
  const firstProjectDate = data.projects.length > 0
    ? Math.min(...data.projects.map(p => new Date(p.createdAt).getTime()))
    : Date.now();
  const daysSinceStart = Math.max(1, dayjs().diff(dayjs(firstProjectDate), 'day'));
  const averageDailyStudyMinutes = totalStudyMinutes / daysSinceStart;

  return {
    totalPoints: data.globalPointsTenths / 10,
    totalProjects: data.projects.length,
    totalStudyMinutes,
    consecutiveCheckInDays,
    averageDailyStudyMinutes,
  };
};

// 计算连续签到天数
const calculateConsecutiveCheckInDays = (lastCheckInDate?: string): number => {
  if (!lastCheckInDate) return 0;

  const last = dayjs(lastCheckInDate);
  const now = dayjs();
  const diffDays = now.diff(last, 'day');

  // 如果上次签到是今天或昨天，算作连续
  if (diffDays <= 1) {
    return 1; // 简化处理，实际应该从日志中计算
  }

  return 0;
};

// 提取时间趋势数据
export const extractTimeTrendData = (data: AppData | null, timeRange: string): TimeTrendData[] => {
  if (!data || !data.projects.length) return [];

  const trendMap = new Map<string, { minutes: number; points: number }>();

  data.projects.forEach(project => {
    project.logs.forEach(log => {
      const date = dayjs(log.timestamp).format('YYYY-MM-DD');

      // 根据时间范围过滤
      if (!isInTimeRange(log.timestamp, timeRange)) return;

      const existing = trendMap.get(date) || { minutes: 0, points: 0 };

      // 从日志消息中提取时长和运
      const minutesMatch = log.message.match(/(\d+(?:\.\d+)?)\s*分钟/);
      const pointsMatch = log.message.match(/(\d+(?:\.\d+)?)\s*运/);

      if (minutesMatch) {
        existing.minutes += parseFloat(minutesMatch[1]);
      }
      if (pointsMatch) {
        existing.points += parseFloat(pointsMatch[1]);
      }

      trendMap.set(date, existing);
    });
  });

  return Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      minutes: Math.round(data.minutes * 100) / 100,
      points: Math.round(data.points * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// 检查时间戳是否在指定范围内
const isInTimeRange = (timestamp: string, timeRange: string): boolean => {
  const date = dayjs(timestamp);
  const now = dayjs();

  switch (timeRange) {
    case 'today':
      return date.isSame(now, 'day');
    case 'week':
      return date.isAfter(now.subtract(7, 'day'));
    case 'month':
      return date.isAfter(now.subtract(30, 'day'));
    case 'all':
    default:
      return true;
  }
};

// 提取项目统计数据
export const extractProjectStats = (data: AppData | null): ProjectStats[] => {
  if (!data || !data.projects.length) return [];

  return data.projects.map(project => {
    const lastActivityLog = project.logs.length > 0
      ? project.logs[project.logs.length - 1]
      : null;

    return {
      id: project.id,
      name: project.name,
      totalStudyMinutes: project.totalStudyMinutes,
      totalPoints: project.totalPointsTenths / 10,
      createdAt: project.createdAt,
      lastActivity: lastActivityLog?.timestamp,
      studySessions: project.logs.filter(log => log.type === 'success').length,
    };
  }).sort((a, b) => b.totalStudyMinutes - a.totalStudyMinutes);
};

// 分析奖励来源
export const analyzeRewardSources = (data: AppData | null): RewardSource[] => {
  if (!data || !data.projects.length) return [];

  let checkInPoints = 0;
  let studyPoints = 0;
  let restPoints = 0;

  data.projects.forEach(project => {
    project.logs.forEach(log => {
      const pointsMatch = log.message.match(/\+\s*(\d+(?:\.\d+)?)\s*运/);
      if (!pointsMatch) return;

      const points = parseFloat(pointsMatch[1]);

      if (log.message.includes('签到')) {
        checkInPoints += points;
      } else if (log.message.includes('休息')) {
        restPoints += points;
      } else {
        studyPoints += points;
      }
    });
  });

  const total = checkInPoints + studyPoints + restPoints || 1;

  return [
    { type: '签到奖励', amount: checkInPoints, percentage: (checkInPoints / total) * 100 },
    { type: '学习奖励', amount: studyPoints, percentage: (studyPoints / total) * 100 },
    { type: '休息奖励', amount: restPoints, percentage: (restPoints / total) * 100 },
  ].filter(source => source.amount > 0);
};

// 分析学习时段分布
export const analyzeStudyPeriodDistribution = (data: AppData | null): { period: string; minutes: number }[] => {
  if (!data || !data.projects.length) return [];

  const distribution = {
    morning: 0,   // 6-12
    afternoon: 0, // 12-18
    evening: 0,   // 18-24
    night: 0,     // 0-6
  };

  data.projects.forEach(project => {
    project.logs.forEach(log => {
      const hour = dayjs(log.timestamp).hour();
      const minutesMatch = log.message.match(/(\d+(?:\.\d+)?)\s*分钟/);
      const minutes = minutesMatch ? parseFloat(minutesMatch[1]) : 0;

      if (hour >= 6 && hour < 12) {
        distribution.morning += minutes;
      } else if (hour >= 12 && hour < 18) {
        distribution.afternoon += minutes;
      } else if (hour >= 18 && hour < 24) {
        distribution.evening += minutes;
      } else {
        distribution.night += minutes;
      }
    });
  });

  return [
    { period: '上午 (6-12点)', minutes: Math.round(distribution.morning) },
    { period: '下午 (12-18点)', minutes: Math.round(distribution.afternoon) },
    { period: '晚上 (18-24点)', minutes: Math.round(distribution.evening) },
    { period: '深夜 (0-6点)', minutes: Math.round(distribution.night) },
  ].filter(item => item.minutes > 0);
};

// 计算平均学习会话时长
export const calculateAverageSessionDuration = (data: AppData | null): number => {
  if (!data || !data.projects.length) return 0;

  let totalMinutes = 0;
  let sessionCount = 0;

  data.projects.forEach(project => {
    project.logs.forEach(log => {
      if (log.type === 'success') {
        const minutesMatch = log.message.match(/(\d+(?:\.\d+)?)\s*分钟/);
        if (minutesMatch) {
          totalMinutes += parseFloat(minutesMatch[1]);
          sessionCount++;
        }
      }
    });
  });

  return sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;
};

// 格式化时长
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (mins === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${mins} 分钟`;
};

// 格式化运数
export const formatPoints = (points: number): string => {
  return points.toFixed(1);
};
