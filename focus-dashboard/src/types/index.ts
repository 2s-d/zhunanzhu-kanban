// 日志类型
export type LogType = 'info' | 'success' | 'warning' | 'rest';

// 运势等级
export type FortuneLevel = 'ping' | 'xiaoJi' | 'daJi';

// 日志条目
export interface LogEntry {
  message: string;
  timestamp: string;
  type: LogType;
}

// 今日运势
export interface DailyFortune {
  level: FortuneLevel;
  date: string;
  message: string;
}

// 学习项目
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  totalStudyMinutes: number;
  totalPointsTenths: number; // 累计运（以0.1为单位）
  logs: LogEntry[];
  rewardShortRest?: number; // 短休息奖励（1-10）
  rewardLongRest?: number; // 长休息奖励（20-100）
  rewardPerMinuteTenths?: number; // 每分钟奖励（1-30 tenths）
}

// 应用数据
export interface AppData {
  schemaVersion: number;
  globalPointsTenths: number; // 全局总运（以0.1为单位）
  projects: Project[];
  lastCheckInDate?: string;
  lastFortuneDate?: string;
  todayFortune?: DailyFortune;
  themeSeedColorValue?: number;
  consecutiveCheckInDays?: number; // 连续签到天数（APP直接提供）
}

// 时间范围类型
export type TimeRange = 'today' | 'week' | 'month' | 'all';

// 统计数据接口
export interface Statistics {
  totalPoints: number;
  totalProjects: number;
  totalStudyMinutes: number;
  consecutiveCheckInDays: number;
  averageDailyStudyMinutes: number;
}

// 时间趋势数据
export interface TimeTrendData {
  date: string;
  minutes: number;
  points: number;
}

// 项目统计数据
export interface ProjectStats {
  id: string;
  name: string;
  totalStudyMinutes: number;
  totalPoints: number;
  createdAt: string;
  lastActivity?: string;
  studySessions: number;
}

// 奖励来源数据
export interface RewardSource {
  type: string;
  amount: number;
  percentage: number;
}

// 学习会话
export interface StudySession {
  projectId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  points: number;
}
