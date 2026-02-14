import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppData } from '../types';
import { formatDuration, formatPoints } from './dataProcessor';

// 导出为Excel
export const exportToExcel = (data: AppData | null) => {
  if (!data) {
    throw new Error('没有数据可导出');
  }

  const workbook = XLSX.utils.book_new();

  // 全局概览数据
  const overviewData = [
    ['指标', '数值'],
    ['全局总运', formatPoints(data.globalPointsTenths / 10)],
    ['项目总数', data.projects.length],
    ['总学习时长', data.projects.reduce((sum, p) => sum + p.totalStudyMinutes, 0) + ' 分钟'],
    ['最后签到日期', data.lastCheckInDate || '无'],
    ['今日运势', data.todayFortune ? data.todayFortune.level : '无'],
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, '全局概览');

  // 项目数据
  const projectData = [
    ['项目名称', '创建时间', '学习时长（分钟）', '累计运', '学习次数'],
    ...data.projects.map(project => [
      project.name,
      new Date(project.createdAt).toLocaleDateString('zh-CN'),
      project.totalStudyMinutes,
      formatPoints(project.totalPointsTenths / 10),
      project.logs.filter(log => log.type === 'success').length,
    ]),
  ];
  const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
  XLSX.utils.book_append_sheet(workbook, projectSheet, '项目数据');

  // 学习日志数据（最近100条）
  const allLogs: any[] = [];
  data.projects.forEach(project => {
    project.logs.slice(-100).forEach(log => {
      allLogs.push([
        project.name,
        new Date(log.timestamp).toLocaleString('zh-CN'),
        log.type,
        log.message,
      ]);
    });
  });
  allLogs.sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime());
  
  const logData = [
    ['项目名称', '时间', '类型', '消息'],
    ...allLogs.slice(0, 100),
  ];
  const logSheet = XLSX.utils.aoa_to_sheet(logData);
  XLSX.utils.book_append_sheet(workbook, logSheet, '学习日志');

  // 生成文件
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `专注APP数据报告_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
};

// 导出为CSV
export const exportToCSV = (data: AppData | null) => {
  if (!data) {
    throw new Error('没有数据可导出');
  }

  // 项目数据CSV
  const csvData = [
    ['项目名称', '创建时间', '学习时长（分钟）', '累计运', '学习次数', '短休息奖励', '长休息奖励', '每分钟奖励'],
    ...data.projects.map(project => [
      project.name,
      new Date(project.createdAt).toLocaleDateString('zh-CN'),
      project.totalStudyMinutes,
      formatPoints(project.totalPointsTenths / 10),
      project.logs.filter(log => log.type === 'success').length,
      project.rewardShortRest || 0,
      project.rewardLongRest || 0,
      project.rewardPerMinuteTenths ? (project.rewardPerMinuteTenths / 10).toFixed(1) : 0,
    ]),
  ];

  const csvContent = csvData.map(row => row.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `专注APP项目数据_${new Date().toLocaleDateString('zh-CN')}.csv`);
};

// 导出为PDF
export const exportToPDF = (data: AppData | null) => {
  if (!data) {
    throw new Error('没有数据可导出');
  }

  const doc = new jsPDF();

  // 设置中文字体（使用内置字体，可能无法正确显示中文，但会尝试）
  doc.setFont('helvetica');

  // 标题
  doc.setFontSize(18);
  doc.text('Focus App Data Report', 14, 20);

  doc.setFontSize(12);
  doc.text(`Export Date: ${new Date().toLocaleDateString('en-US')}`, 14, 30);

  // 全局概览
  doc.setFontSize(14);
  doc.text('Global Overview', 14, 45);

  const overviewData = [
    ['Total Points', formatPoints(data.globalPointsTenths / 10)],
    ['Total Projects', data.projects.length.toString()],
    ['Total Study Time', formatDuration(data.projects.reduce((sum, p) => sum + p.totalStudyMinutes, 0))],
    ['Last Check-in', data.lastCheckInDate || 'None'],
    ['Today Fortune', data.todayFortune ? data.todayFortune.level : 'None'],
  ];

  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Value']],
    body: overviewData,
    theme: 'grid',
  });

  // 项目数据
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Project Data', 14, 20);

  const projectData = data.projects.map(project => [
    project.name,
    new Date(project.createdAt).toLocaleDateString('en-US'),
    project.totalStudyMinutes.toString(),
    formatPoints(project.totalPointsTenths / 10),
    project.logs.filter(log => log.type === 'success').length.toString(),
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Project', 'Created', 'Minutes', 'Points', 'Sessions']],
    body: projectData,
    theme: 'striped',
  });

  // 保存PDF
  doc.save(`Focus_App_Report_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.pdf`);
};
