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

  // ========== 工作表1：全局概览 ==========
  const overviewData = [
    ['专注APP数据报告'],
    [`导出时间：${new Date().toLocaleString('zh-CN')}`],
    [],
    ['指标', '数值'],
    ['全局总运', formatPoints(data.globalPointsTenths / 10)],
    ['项目总数', data.projects.length],
    ['总学习时长（分钟）', data.projects.reduce((sum, p) => sum + (p.totalStudyMinutes || 0), 0)],
    ['最后签到日期', data.lastCheckInDate || '无'],
    ['今日运势', data.todayFortune?.level || '无'],
    ['运势消息', data.todayFortune?.message || '无'],
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  // 设置列宽
  overviewSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, '全局概览');

  // ========== 工作表2：项目数据（完整） ==========
  const projectHeaders = ['项目名称', '创建时间', '学习时长（分钟）', '累计运', '学习次数', '短休息奖励', '长休息奖励', '每分钟奖励'];
  const projectRows = data.projects.map((project: Project) => [
    project.name || '未命名项目',
    formatDate(project.createdAt),
    project.totalStudyMinutes || 0,
    formatPoints((project.totalPointsTenths || 0) / 10),
    project.logs?.filter((log: LogEntry) => log.type === 'success').length || 0,
    project.rewardShortRest || 0,
    project.rewardLongRest || 0,
    project.rewardPerMinuteTenths ? (project.rewardPerMinuteTenths / 10).toFixed(1) : 0,
  ]);
  const projectData = [projectHeaders, ...projectRows];
  const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
  projectSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, projectSheet, '项目数据');

  // ========== 工作表3：所有学习日志（完整导出） ==========
  const allLogs: any[] = [];
  data.projects.forEach((project: Project) => {
    if (project.logs && project.logs.length > 0) {
      project.logs.forEach((log: LogEntry) => {
        allLogs.push({
          项目名称: project.name || '未命名',
          时间: formatDate(log.timestamp),
          类型: log.type || 'unknown',
          消息: getLogMessage(log),
        });
      });
    }
  });
  // 按时间倒序排列
  allLogs.sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());

  if (allLogs.length > 0) {
    const logSheet = XLSX.utils.json_to_sheet(allLogs);
    logSheet['!cols'] = [
      { wch: 20 }, // 项目名称
      { wch: 20 }, // 时间
      { wch: 10 }, // 类型
      { wch: 50 }, // 消息
    ];
    XLSX.utils.book_append_sheet(workbook, logSheet, '学习日志(全部)');
  }

  // ========== 工作表4：每日统计 ==========
  const dailyStats: { [key: string]: { count: number } } = {};
  allLogs.forEach(log => {
    const date = log.时间.split(' ')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { count: 0 };
    }
    dailyStats[date].count += 1;
  });

  const dailyRows = Object.entries(dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, stats]) => [date, stats.count]);

  const dailyData = [['日期', '学习次数'], ...dailyRows];
  const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
  dailySheet['!cols'] = [{ wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, dailySheet, '每日统计');

  // ========== 工作表5：原始数据（完整JSON） ==========
  const rawData = [['完整JSON数据（可用于数据恢复）'], [JSON.stringify(data, null, 2)]];
  const rawSheet = XLSX.utils.aoa_to_sheet(rawData);
  rawSheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, rawSheet, '原始数据');

  // 生成文件（UTF-8编码确保中文正常）
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' 
  });
  saveAs(blob, `专注APP数据报告_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// 导出为CSV（项目数据）
export const exportToCSV = (data: AppData | null) => {
  if (!data) {
    throw new Error('没有数据可导出');
  }

  // 项目数据CSV（带BOM确保中文显示）
  const csvData = [
    ['项目名称', '创建时间', '学习时长（分钟）', '累计运', '学习次数', '短休息奖励', '长休息奖励', '每分钟奖励'],
    ...data.projects.map((project: Project) => [
      project.name || '未命名项目',
      formatDate(project.createdAt),
      project.totalStudyMinutes || 0,
      formatPoints((project.totalPointsTenths || 0) / 10),
      project.logs?.filter((log: LogEntry) => log.type === 'success').length || 0,
      project.rewardShortRest || 0,
      project.rewardLongRest || 0,
      project.rewardPerMinuteTenths ? (project.rewardPerMinuteTenths / 10).toFixed(1) : 0,
    ]),
  ];

  // 使用逗号分隔，处理中文
  const csvContent = csvData.map(row => 
    row.map(cell => {
      const str = String(cell);
      // 如果包含逗号或换行，用引号包裹
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  // 添加BOM头，确保Excel打开时中文正常
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `专注APP项目数据_${new Date().toISOString().slice(0, 10)}.csv`);
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
