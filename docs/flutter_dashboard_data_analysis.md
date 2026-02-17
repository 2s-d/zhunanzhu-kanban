# Flutter 应用与大数据看板数据差异分析报告

## 一、数据模型对比总览

### 1.1 Flutter 应用（zhuanzhu-app）实际数据模型

根据对 Flutter 应用源码的分析，其数据模型定义在以下文件中：

- `lib/services/data_repository.dart` - 应用主数据模型
- `lib/models/project.dart` - 项目模型
- `lib/models/log_entry.dart` - 日志条目模型
- `lib/models/fortune.dart` - 运势模型

Flutter 应用实际存储的数据结构如下：

```typescript
// AppData - 应用全局数据
{
  schemaVersion: number,           // 数据版本号，当前为 1
  globalPointsTenths: number,      // 全局总运（以 0.1 为单位）
  projects: Project[],              // 项目列表
  lastCheckInDate: DateTime?,       // 上次签到日期
  lastFortuneDate: DateTime?,       // 上次抽运势日期
  todayFortune: DailyFortune?,      // 今日运势
  themeSeedColorValue: number?     // 主题色值
}

// Project - 学习项目
{
  id: string,                       // 项目唯一标识
  name: string,                     // 项目名称
  createdAt: DateTime,              // 创建时间
  totalStudyMinutes: number,        // 累计学习时长（分钟）
  totalPointsTenths: number,        // 累计运（以 0.1 为单位）
  logs: LogEntry[],                 // 项目日志列表（最多 500 条）
  rewardShortRest: number?,         // 短休息奖励（1-10）
  rewardLongRest: number?,          // 长休息奖励（20-100）
  rewardPerMinuteTenths: number?    // 每分钟奖励（1-30 tenths）
}

// LogEntry - 日志条目
{
  message: string,                  // 日志消息
  timestamp: DateTime,              // 时间戳
  type: 'info' | 'success' | 'warning' | 'rest'  // 日志类型
}

// DailyFortune - 今日运势
{
  level: 'ping' | 'xiaoJi' | 'daJi', // 运势等级
  date: DateTime,                    // 日期
  message: string                     // 运势消息
}
```

### 1.2 大数据看板（focus-dashboard）数据需求

大数据看板的 TypeScript 类型定义在 `focus-dashboard/src/types/index.ts` 中，其核心数据结构与 Flutter 应用一致，但额外定义了以下计算类型：

```typescript
// 核心数据结构（与 Flutter 一致）
interface AppData {
  schemaVersion: number;
  globalPointsTenths: number;
  projects: Project[];
  lastCheckInDate?: string;
  lastFortuneDate?: string;
  todayFortune?: DailyFortune;
  themeSeedColorValue?: number;
}

// 统计接口（计算得出）
interface Statistics {
  totalPoints: number;                  // 总运数
  totalProjects: number;                // 项目总数
  totalStudyMinutes: number;           // 总学习时长
  consecutiveCheckInDays: number;       // 连续签到天数 ⚠️
  averageDailyStudyMinutes: number;    // 平均每日学习时长
}

// 项目统计（计算得出）
interface ProjectStats {
  id: string;
  name: string;
  totalStudyMinutes: number;
  totalPoints: number;
  createdAt: string;
  lastActivity?: string;               // 最后活动时间 ⚠️
  studySessions: number;               // 学习次数 ⚠️
}

// 时间趋势数据
interface TimeTrendData {
  date: string;
  minutes: number;
  points: number;
}

// 奖励来源数据
interface RewardSource {
  type: string;
  amount: number;
  percentage: number;
}

// 学习会话
interface StudySession {
  projectId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  points: number;
}
```

## 二、关键差异分析

### 2.1 连续签到天数字段缺失 ⚠️ 严重问题

**问题描述：**
大数据看板的 `Statistics` 接口中定义了 `consecutiveCheckInDays`（连续签到天数）字段，这是用户在查看看板时非常关注的一个指标。然而，Flutter 应用的数据模型中**只存储了 `lastCheckInDate`（上次签到日期）**，并没有直接存储连续签到天数。

**当前实现状态：**
在 `focus-dashboard/src/utils/dataProcessor.ts` 中，连续签到天数的计算逻辑如下：

```typescript
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
```

**存在的问题：**
1. 该计算逻辑只是简单地判断上次签到是否在今天或昨天，如果是则返回 1，否则返回 0
2. 这并不是真正的"连续签到天数"，而是"最近是否签到"
3. 如果用户昨天签到了，今天没签到，显示的是 0 天，但实际上用户昨天确实签到了
4. 无法正确处理补签的情况（用户漏签一天后补签，连续签到应该中断）

**Flutter 应用签到逻辑分析：**
在 `home_screen.dart` 中，签到功能实现了以下逻辑：
- 检查 `_lastCheckInDate` 是否为今天
- 如果是今天，显示"今日已签到"
- 如果不是今天，计算与上次签到的天数差
- 如果是昨天，签到成功并记录"签到 1 天"
- 如果间隔超过 1 天，触发补签逻辑，记录"补签 X 天"

这说明 Flutter 应用**记录了历史签到信息**（通过 `_lastCheckInDate` 的更新），但**没有直接存储连续签到天数**。

**建议解决方案：**

方案一（推荐 - 修改 Flutter 应用）：
在 Flutter 应用的 `AppData` 类中添加 `consecutiveCheckInDays` 字段，每次签到时根据以下逻辑更新：
- 如果是连续签到（今天和昨天都有签到），天数 +1
- 如果是补签（漏签了天数），天数重置为 1
- 如果超过 2 天没签到，天数重置为 1

方案二（修改看板计算逻辑）：
从项目日志中提取所有签到相关的日志记录，解析出历史签到日期，然后计算真正的连续签到天数。这需要修改 `calculateConsecutiveCheckInDays` 函数的实现。

### 2.2 最后活动时间字段

**字段说明：**
看板的 `ProjectStats` 接口中包含 `lastActivity` 字段，表示项目的最后活动时间。

**当前实现状态：**
该字段在 `dataProcessor.ts` 中通过以下逻辑计算：

```typescript
const lastActivityLog = project.logs.length > 0
  ? project.logs[project.logs.length - 1]
  : null;

return {
  // ...
  lastActivity: lastActivityLog?.timestamp,
  // ...
};
```

**结论：**
该字段是**从项目日志列表中动态计算得出的**，取最后一条日志的时间戳。Flutter 应用的项目日志中确实包含了各种活动的记录，因此该字段可以正确显示。

### 2.3 学习次数字段

**字段说明：**
看板的 `ProjectStats` 接口中包含 `studySessions` 字段，表示项目的学习次数。

**当前实现状态：**
该字段在 `dataProcessor.ts` 中通过以下逻辑计算：

```typescript
studySessions: project.logs.filter(log => log.type === 'success').length,
```

**结论：**
该字段是**通过统计项目中类型为 'success' 的日志数量得出的**。在 Flutter 应用中，当用户完成学习任务时，会记录一条 `type: 'success'` 的日志。因此该字段可以正确计算。

### 2.4 时间趋势数据

**字段说明：**
看板定义了 `TimeTrendData` 接口，用于显示每日学习时长趋势图。

**当前实现状态：**
该数据是**通过分析所有项目日志动态计算得出的**，需要解析日志中的时间戳信息。

**结论：**
Flutter 应用的项目日志中包含了各种活动的时间戳，看板可以从中提取每日的学习数据。但需要确保日志中有足够的学习相关记录。

### 2.5 奖励来源分析

**字段说明：**
看板定义了 `RewardSource` 接口，用于分析运的获得来源。

**当前实现状态：**
该数据需要**通过分析日志消息内容来识别不同类型的奖励**（签到奖励、学习奖励、休息奖励等）。

**结论：**
Flutter 应用在获得奖励时会记录相应的日志，例如：
- 签到：`'签到成功，获得 +30 运'`
- 补签：`'补签 X 天，获得 +X 运'`
- 学习：`'获得 +X 运'`

看板可以通过解析这些日志消息来统计奖励来源。

## 三、数据字段完整对照表

| 字段路径 | Flutter 应用 | 大数据看板 | 状态 |
|---------|-------------|-----------|------|
| **AppData** | | | |
| schemaVersion | ✅ 存储 | ✅ 使用 | 一致 |
| globalPointsTenths | ✅ 存储 | ✅ 使用 | 一致 |
| projects | ✅ 存储 | ✅ 使用 | 一致 |
| lastCheckInDate | ✅ 存储 | ✅ 使用 | 一致 |
| lastFortuneDate | ✅ 存储 | ✅ 使用 | 一致 |
| todayFortune | ✅ 存储 | ✅ 使用 | 一致 |
| themeSeedColorValue | ✅ 存储 | ✅ 使用 | 一致 |
| **Project** | | | |
| id | ✅ 存储 | ✅ 使用 | 一致 |
| name | ✅ 存储 | ✅ 使用 | 一致 |
| createdAt | ✅ 存储 | ✅ 使用 | 一致 |
| totalStudyMinutes | ✅ 存储 | ✅ 使用 | 一致 |
| totalPointsTenths | ✅ 存储 | ✅ 使用 | 一致 |
| logs | ✅ 存储 | ✅ 使用 | 一致 |
| rewardShortRest | ✅ 存储 | ✅ 使用 | 一致 |
| rewardLongRest | ✅ 存储 | ✅ 使用 | 一致 |
| rewardPerMinuteTenths | ✅ 存储 | ✅ 使用 | 一致 |
| **LogEntry** | | | |
| message | ✅ 存储 | ✅ 使用 | 一致 |
| timestamp | ✅ 存储 | ✅ 使用 | 一致 |
| type | ✅ 存储 | ✅ 使用 | 一致 |
| **DailyFortune** | | | |
| level | ✅ 存储 | ✅ 使用 | 一致 |
| date | ✅ 存储 | ✅ 使用 | 一致 |
| message | ✅ 存储 | ✅ 使用 | 一致 |
| **Computed Fields** | | | |
| Statistics.consecutiveCheckInDays | ❌ 未存储 | ⚠️ 计算错误 | **需修复** |
| Statistics.averageDailyStudyMinutes | ❌ 未存储 | ✅ 正确计算 | 正常 |
| ProjectStats.lastActivity | ❌ 未存储 | ✅ 正确计算 | 正常 |
| ProjectStats.studySessions | ❌ 未存储 | ✅ 正确计算 | 正常 |

## 四、总结与建议

### 4.1 数据一致性总结

经过详细分析，Flutter 应用和大数据看板之间的数据模型**基本一致**。核心数据字段都得到了正确的存储和传输。唯一的严重问题是**连续签到天数的计算逻辑有误**。

### 4.2 必须修复的问题

**连续签到天数计算错误：**

当前实现只是简单地判断上次签到是否在今天或昨天，这不能正确反映用户的连续签到情况。建议按照以下优先级修复：

**优先级 1（推荐）：修改 Flutter 应用**
在 Flutter 应用的 `AppData` 类中添加 `consecutiveCheckInDays` 字段，在签到逻辑中正确计算并更新该字段。这样可以确保数据的准确性，并且减轻看板的计算负担。

**优先级 2：修改看板计算逻辑**
如果暂时不想修改 Flutter 应用，需要重写 `calculateConsecutiveCheckInDays` 函数，从项目日志中解析历史签到记录，然后计算真正的连续签到天数。这需要查找日志中包含"签到成功"或"补签"关键字的记录。

### 4.3 其他建议

1. **日志记录规范**：建议在 Flutter 应用中保持一致的日志记录格式，便于看板进行数据解析和统计。

2. **数据验证**：建议在大数据看板中添加数据验证逻辑，当发现数据异常时给出提示。

3. **版本兼容性**：建议在数据结构中添加版本号字段（已有 schemaVersion），便于后续数据结构变更时的迁移处理。
