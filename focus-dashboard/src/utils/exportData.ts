import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AppData, Project, LogEntry } from '../types';
import { formatDuration, formatPoints } from './dataProcessor';

// 工具函数：安全格式化日期
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '无';
  try {
    return new Date(dateStr).toLocaleString('zh-CN');
  } catch {
    return dateStr;
  }
};

// 工具函数：安全获取日志消息
const getLogMessage = (log: LogEntry): string => {
  return log.message || log.type || '';
};

// 导出为Excel（完整数据，无乱码）
export const exportToExcel = (data: AppData | null) => {
  if (!data) {
    throw new Error('没有数据可导出');
  }

  const workbook = XLSX.utils.book_new();

  // ========== 工作表1：全局概览（完整） ==========
  const overviewData = [
    ['专注APP数据报告'],
    [`导出时间：${new Date().toLocaleString('zh-CN')}`],
    [],
    ['===== 全局数据 ====='],
    ['字段', '值'],
    ['schemaVersion（版本）', data.schemaVersion || '无'],
    ['globalPointsTenths（总运×10）', data.globalPointsTenths || 0],
    ['实际总运', formatPoints((data.globalPointsTenths || 0) / 10)],
    ['项目总数', data.projects?.length || 0],
    ['最后签到日期', data.lastCheckInDate || '无'],
    ['最后运势日期', data.lastFortuneDate || '无'],
    [],
    ['===== 今日运势 ====='],
    ['运势等级', data.todayFortune?.level || '无'],
    ['运势日期', data.todayFortune?.date || '无'],
    ['运势消息', data.todayFortune?.message || '无'],
    [],
    ['===== 主题设置 ====='],
    ['主题色值', data.themeSeedColorValue || '默认蓝色'],
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, '全局概览');

  // ========== 工作表2：项目数据（完整） ==========
  const projectHeaders = [
    '项目ID', '项目名称', '创建时间', '创建时间(ISO)', 
    '学习时长（分钟）', '累计运×10', '实际累计运',
    '学习次数(成功)', '短休息奖励', '长休息奖励', '每分钟奖励×10', '实际每分钟奖励'
  ];
  const projectRows = (data.projects || []).map((project: Project) => [
    project.id || '',
    project.name || '未命名项目',
    formatDate(project.createdAt),
    project.createdAt || '',
    project.totalStudyMinutes || 0,
    project.totalPointsTenths || 0,
    formatPoints((project.totalPointsTenths || 0) / 10),
    project.logs?.filter((log: LogEntry) => log.type === 'success').length || 0,
    project.rewardShortRest || 0,
    project.rewardLongRest || 0,
    project.rewardPerMinuteTenths || 0,
    project.rewardPerMinuteTenths ? (project.rewardPerMinuteTenths / 10).toFixed(1) : 0,
  ]);
  const projectData = [projectHeaders, ...projectRows];
  const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
  projectSheet['!cols'] = [
    { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 25 },
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, projectSheet, '项目数据');

  // ========== 工作表3：所有学习日志（完整导出，无限制） ==========
  const allLogs: any[] = [];
  (data.projects || []).forEach((project: Project) => {
    if (project.logs && project.logs.length > 0) {
      project.logs.forEach((log: LogEntry) => {
        allLogs.push({
          项目ID: project.id || '',
          项目名称: project.name || '未命名',
          日志时间: formatDate(log.timestamp),
          时间戳ISO: log.timestamp || '',
          类型: log.type || 'unknown',
          消息: getLogMessage(log),
        });
      });
    }
  });
  // 按时间倒序排列
  allLogs.sort((a, b) => {
    const timeA = a.时间戳ISO ? new Date(a.时间戳ISO).getTime() : 0;
    const timeB = b.时间戳ISO ? new Date(b.时间戳ISO).getTime() : 0;
    return timeB - timeA;
  });

  if (allLogs.length > 0) {
    const logSheet = XLSX.utils.json_to_sheet(allLogs);
    logSheet['!cols'] = [
      { wch: 30 }, // 项目ID
      { wch: 20 }, // 项目名称
      { wch: 20 }, // 日志时间
      { wch: 25 }, // 时间戳ISO
      { wch: 10 }, // 类型
      { wch: 60 }, // 消息
    ];
    XLSX.utils.book_append_sheet(workbook, logSheet, '学习日志(全部)');
  }

  // ========== 工作表4：每日统计 ==========
  const dailyStats: { [key: string]: { minutes: number; points: number; count: number; successCount: number } } = {};
  allLogs.forEach(log => {
    const date = log.日志时间.split(' ')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { minutes: 0, points: 0, count: 0, successCount: 0 };
    }
    dailyStats[date].count += 1;
    if (log.类型 === 'success') {
      dailyStats[date].successCount += 1;
      // 从消息中提取时长
      const minutesMatch = log.消息.match(/(\d+)\s*分钟/);
      if (minutesMatch) {
        dailyStats[date].minutes += parseInt(minutesMatch[1], 10);
      }
      const pointsMatch = log.消息.match(/(\d+(?:\.\d+)?)\s*运/);
      if (pointsMatch) {
        dailyStats[date].points += parseFloat(pointsMatch[1]);
      }
    }
  });

  const dailyRows = Object.entries(dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, stats]) => [date, stats.minutes, stats.points.toFixed(1), stats.count, stats.successCount]);

  const dailyData = [['日期', '学习时长（分钟）', '获得运', '总记录数', '成功次数'], ...dailyRows];
  const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
  dailySheet['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, dailySheet, '每日统计');

  // ========== 工作表5：原始数据（完整JSON备份） ==========
  const rawData = [
    ['完整JSON数据（可用于数据恢复）'],
    [JSON.stringify(data, null, 2)]
  ];
  const rawSheet = XLSX.utils.aoa_to_sheet(rawData);
  rawSheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, rawSheet, '原始JSON');

  // 生成文件（UTF-8编码确保中文正常）
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' 
  });
  saveAs(blob, `专注APP数据报告_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// 导出为CSV（项目数据 + 日志数据）
export const exportToCSV = (data: AppData | null) => {
  if (!data) {
    throw new Error('没有数据可导出');
  }

  let csvContent = '';

  // ===== 项目数据 =====
  csvContent += '===== 项目数据 =====\n';
  const projectHeaders = ['项目ID', '项目名称', '创建时间', '学习时长（分钟）', '累计运', '学习次数', '短休息奖励', '长休息奖励', '每分钟奖励'];
  csvContent += projectHeaders.join(',') + '\n';

  (data.projects || []).forEach((project: Project) => {
    const row = [
      project.id || '',
      project.name || '未命名项目',
      formatDate(project.createdAt),
      project.totalStudyMinutes || 0,
      formatPoints((project.totalPointsTenths || 0) / 10),
      project.logs?.filter((log: LogEntry) => log.type === 'success').length || 0,
      project.rewardShortRest || 0,
      project.rewardLongRest || 0,
      project.rewardPerMinuteTenths ? (project.rewardPerMinuteTenths / 10).toFixed(1) : 0,
    ].map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvContent += row.join(',') + '\n';
  });

  // ===== 学习日志 =====
  csvContent += '\n===== 学习日志 =====\n';
  const logHeaders = ['项目名称', '时间', '类型', '消息'];
  csvContent += logHeaders.join(',') + '\n';

  (data.projects || []).forEach((project: Project) => {
    if (project.logs && project.logs.length > 0) {
      project.logs.forEach((log: LogEntry) => {
        const row = [
          project.name || '未命名',
          formatDate(log.timestamp),
          log.type || 'unknown',
          getLogMessage(log),
        ].map(cell => {
          const str = String(cell);
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvContent += row.join(',') + '\n';
      });
    }
  });

  // 添加BOM头，确保Excel打开时中文正常
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `专注APP完整数据_${new Date().toISOString().slice(0, 10)}.csv`);
};

// 导出为JSON（最完整的备份）
export const exportToJSON = (data: AppData | null) => {
  if (!data) {
    throw new Error('没有数据可导出');
  }

  const exportData = {
    导出时间: new Date().toISOString(),
    appData: data,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `专注APP完整数据_${new Date().toISOString().slice(0, 10)}.json`);
};
