import React, { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { extractProjectStats, formatDuration, formatPoints } from '../../utils/dataProcessor';
import { useChartHeight } from '../../hooks/use-mobile';
import { ProjectStats } from '../../types';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const ProjectAnalysis: React.FC = () => {
  const appData = useSelector((state: RootState) => state.appData.data);
  const projectStats = useMemo(() => extractProjectStats(appData), [appData]);
  const chartHeight = useChartHeight();

  // 表格列定义
  const columns: ColumnsType<ProjectStats> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 150,
    },
    {
      title: '学习时长',
      dataIndex: 'totalStudyMinutes',
      key: 'totalStudyMinutes',
      sorter: (a, b) => a.totalStudyMinutes - b.totalStudyMinutes,
      render: (minutes: number) => formatDuration(minutes),
      width: 120,
    },
    {
      title: '累计运',
      dataIndex: 'totalPoints',
      key: 'totalPoints',
      sorter: (a, b) => a.totalPoints - b.totalPoints,
      render: (points: number) => `${formatPoints(points)} 运`,
      width: 100,
    },
    {
      title: '学习次数',
      dataIndex: 'studySessions',
      key: 'studySessions',
      sorter: (a, b) => a.studySessions - b.studySessions,
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      width: 120,
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
      render: (date?: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '--',
      width: 150,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const daysSinceActivity = record.lastActivity 
          ? dayjs().diff(dayjs(record.lastActivity), 'day')
          : 999;
        
        if (daysSinceActivity <= 1) {
          return <Tag color="green">活跃</Tag>;
        } else if (daysSinceActivity <= 7) {
          return <Tag color="orange">一般</Tag>;
        } else {
          return <Tag color="red">休眠</Tag>;
        }
      },
      width: 80,
    },
  ];

  // 学习时长对比柱状图
  const studyTimeChartOption = {
    title: {
      text: '项目学习时长对比',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>${data.seriesName}: ${formatDuration(data.value)}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: projectStats.map(p => p.name),
      axisLabel: {
        interval: 0,
        rotate: projectStats.length > 5 ? 45 : 0,
      },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
    },
    series: [
      {
        name: '学习时长',
        type: 'bar',
        data: projectStats.map(p => p.totalStudyMinutes),
        itemStyle: {
          color: '#1890ff',
        },
      },
    ],
  };

  // 运获得对比图
  const pointsChartOption = {
    title: {
      text: '项目运获得对比',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>${data.seriesName}: ${formatPoints(data.value)} 运`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: projectStats.map(p => p.name),
      axisLabel: {
        interval: 0,
        rotate: projectStats.length > 5 ? 45 : 0,
      },
    },
    yAxis: {
      type: 'value',
      name: '运',
    },
    series: [
      {
        name: '累计运',
        type: 'bar',
        data: projectStats.map(p => p.totalPoints),
        itemStyle: {
          color: '#52c41a',
        },
      },
    ],
  };

  return (
    <div className="project-analysis">
      <Card title="项目列表" style={{ marginBottom: 16 }}>
        <Table
          columns={columns}
          dataSource={projectStats}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <ReactECharts option={studyTimeChartOption} style={{ height: chartHeight }} />
      </Card>

      <Card>
        <ReactECharts option={pointsChartOption} style={{ height: chartHeight }} />
      </Card>
    </div>
  );
};

export default ProjectAnalysis;
