# 专注APP数据大屏看板设计方案

## 项目概述

基于您的Flutter专注学习应用，我将为您创建一个全功能的数据大屏看板，展示学习数据、运获得统计、学习习惯分析等核心指标。

## 技术架构

### 前端技术栈
- **框架**: React + TypeScript
- **UI库**: Ant Design / Material-UI
- **图表库**: ECharts / Chart.js
- **状态管理**: Redux Toolkit
- **数据获取**: Axios

### 数据处理
- **JSON解析**: 自定义Flutter数据模型映射
- **实时更新**: WebSocket/轮询机制
- **数据缓存**: 本地存储优化

## 看板功能模块

### 1. 全局概览仪表板
```typescript
interface GlobalOverview {
  totalPoints: number;        // 全局总运 (globalPointsTenths / 10)
  totalProjects: number;      // 项目总数 (projects.length)
  totalStudyMinutes: number;  // 总学习时长 (所有项目累计)
  consecutiveCheckIns: number; // 连续签到天数
  currentStreak: number;      // 当前学习连续天数
}
```

**展示组件**:
- 总运数大数字展示（环形进度条）
- 项目总数卡片
- 总学习时长统计
- 连续签到天数
- 当前运势状态显示

### 2. 项目分析模块
```typescript
interface ProjectAnalytics {
  id: string;
  name: string;
  totalStudyMinutes: number;
  totalPointsTenths: number;
  createdAt: string;
  lastActiveDate: string;
  activityLevel: 'high' | 'medium' | 'low';
  completionRate: number;
}
```

**可视化**:
- 项目列表表格（可排序、筛选）
- 项目学习时长对比柱状图
- 项目运获得对比图
- 项目活跃度热力图
- 项目创建时间趋势

### 3. 时间趋势分析
```typescript
interface TimeTrendData {
  dailyData: {
    date: string;
    studyMinutes: number;
    pointsEarned: number;
    projectCount: number;
  }[];
  weeklyData: {
    week: string;
    totalMinutes: number;
    totalPoints: number;
    averageDailyMinutes: number;
  }[];
  monthlyData: {
    month: string;
    totalMinutes: number;
    totalPoints: number;
    projectCount: number;
  }[];
}
```

**图表类型**:
- 每日学习时长趋势线图
- 每周学习统计柱状图
- 每月学习进度对比
- 学习时段分布饼图（上午/下午/晚上）
- 工作日 vs 周末学习对比

### 4. 奖励来源分析
```typescript
interface RewardAnalysis {
  sources: {
    studyReward: number;      // 学习每分钟奖励
    shortRestReward: number;  // 短休息奖励
    longRestReward: number;   // 长休息奖励
    presetCompletionReward: number; // 预设完成奖励
    checkInReward: number;    // 签到奖励
  };
  totals: {
    totalEarned: number;
    bySource: { [key: number]: number };
  };
}
```

**可视化**:
- 奖励来源分布饼图
- 运获得趋势图
- 休息次数统计
- 奖励配置使用情况雷达图

### 5. 学习习惯分析
```typescript
interface LearningHabits {
  averageSessionDuration: number; // 平均单次学习时长
  longestSession: number;         // 最长连续学习时长
  restFrequency: number;          // 休息频率（每小时次数）
  preferredMode: 'free' | 'preset'; // 偏好模式
  peakHours: number[];            // 高效学习时段
  weeklyPattern: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
}
```

**分析维度**:
- 学习会话时长分布直方图
- 休息频率趋势
- 学习模式偏好对比
- 一周学习模式热力图
- 学习效率评分

## 数据模型映射

### Flutter数据结构 → Web看板
```typescript
// Flutter AppData 转换为看板数据
interface DashboardData {
  appData: {
    globalPointsTenths: number;
    projects: Project[];
    lastCheckInDate: string | null;
    todayFortune: DailyFortune | null;
  };
  analytics: {
    globalOverview: GlobalOverview;
    projectAnalytics: ProjectAnalytics[];
    timeTrendData: TimeTrendData;
    rewardAnalysis: RewardAnalysis;
    learningHabits: LearningHabits;
  };
}
```

### 数据处理逻辑
```typescript
class DataProcessor {
  static processAppData(rawData: any): DashboardData {
    return {
      appData: rawData,
      analytics: {
        globalOverview: this.calculateGlobalOverview(rawData),
        projectAnalytics: this.analyzeProjects(rawData.projects),
        timeTrendData: this.analyzeTimeTrends(rawData),
        rewardAnalysis: this.analyzeRewards(rawData),
        learningHabits: this.analyzeHabits(rawData)
      }
    };
  }
}
```

## 界面布局设计

### 主布局结构
```
┌─────────────────────────────────────────────────────────────┐
│                    专注APP数据看板                          │
├─────────────────────────────────────────────────────────────┤
│  全局概览仪表板                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 总运数  │ │ 项目数  │ │总学习时长│ │连续签到 │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│  项目分析         │          时间趋势分析                   │
│  ┌─────────────┐  │  ┌─────────────────────────────┐        │
│  │ 项目列表    │  │  │ 每日/每周/每月趋势图表      │        │
│  │ 柱状图对比  │  │  │                             │        │
│  └─────────────┘  │  └─────────────────────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  奖励来源分析         │          学习习惯分析               │
│  ┌─────────────────┐  │  ┌─────────────────────────┐        │
│  │ 奖励分布饼图    │  │  │ 学习习惯雷达图          │        │
│  │ 趋势统计        │  │  │ 时段分析                │        │
│  └─────────────────┘  │  └─────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 响应式设计
- **大屏模式**: 1920x1080 全屏展示
- **桌面模式**: 1200x800 标准浏览器
- **平板模式**: 768x1024 适配iPad
- **移动模式**: 375x667 手机浏览

## 核心功能特性

### 1. 实时数据更新
- 自动读取 app_data.json 文件
- 增量数据更新机制
- 数据变化实时通知

### 2. 交互式操作
- 时间范围筛选（今天/本周/本月/自定义）
- 项目筛选和排序
- 数据钻取和回溯
- 导出功能（PDF/Excel/CSV）

### 3. 个性化配置
- 主题色配置（同步Flutter app的themeSeedColorValue）
- 布局自定义
- 图表类型选择
- 数据更新频率设置

### 4. 数据洞察
- 学习效率评分
- 习惯养成建议
- 目标达成预测
- 异常数据提醒

## 技术实现要点

### 数据读取机制
```typescript
// 读取Flutter JSON数据
class FlutterDataReader {
  async readAppData(jsonFilePath: string): Promise<AppData> {
    const response = await fetch(jsonFilePath);
    const rawData = await response.json();
    return this.validateAndParse(rawData);
  }
}
```

### 数据同步策略
- **轮询模式**: 每30秒检查一次文件变化
- **WebSocket**: 实时推送更新（如果集成后端）
- **手动刷新**: 用户主动刷新数据

### 性能优化
- 数据缓存和虚拟化
- 图表懒加载
- 内存使用优化
- 响应式渲染

## 部署方案

### 本地部署
- 静态网站部署
- 数据文件同步
- 浏览器访问

### 云端部署
- GitHub Pages
- Netlify/Vercel
- 自定义域名

## 后续扩展功能

1. **多用户支持**: 支持多个专注APP用户数据
2. **数据分析**: AI驱动的学习建议
3. **社交功能**: 学习成果分享
4. **目标管理**: 学习目标设定和追踪
5. **通知系统**: 学习提醒和激励通知

## 预期效果

这个数据大屏看板将帮助您：
- **直观了解**整体学习状况
- **深入分析**学习习惯和效率
- **优化配置**奖励机制和休息频率
- **追踪目标**达成进度
- **激励持续**学习动机

通过可视化的数据展示，您将能够更好地理解自己的学习模式，从而优化学习策略，提高学习效率！