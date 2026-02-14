import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { calculateAverageSessionDuration, formatDuration } from '../../utils/dataProcessor';
import { useChartHeight } from '../../hooks/use-mobile';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const StudyHabits: React.FC = () => {
  const appData = useSelector((state: RootState) => state.appData.data);
  const avgSessionDuration = useMemo(() => calculateAverageSessionDuration(appData), [appData]);
  const chartHeight = useChartHeight();

  // 学习会话时长分布
  const sessionDistribution = useMemo(() => {
    if (!appData) return [];

    const durations: number[] = [];
    appData.projects.forEach(project => {
      project.logs.forEach(log => {
        if (log.type === 'success') {
          const match = log.message.match(/(\d+(?:\.\d+)?)\s*分钟/);
          if (match) {
            durations.push(parseFloat(match[1]));
          }
        }
      });
    });

    // 分组统计
    const ranges = [
      { name: '0-15分钟', min: 0, max: 15, count: 0 },
      { name: '15-30分钟', min: 15, max: 30, count: 0 },
      { name: '30-60分钟', min: 30, max: 60, count: 0 },
      { name: '60-90分钟', min: 60, max: 90, count: 0 },
      { name: '90+分钟', min: 90, max: Infinity, count: 0 },
    ];

    durations.forEach(duration => {
      for (const range of ranges) {
        if (duration >= range.min && duration < range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges;
  }, [appData]);

  // 学习会话分布直方图
  const sessionDistributionOption = {
    title: {
      text: '学习会话时长分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
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
      data: sessionDistribution.map(d => d.name),
    },
    yAxis: {
      type: 'value',
      name: '次数',
    },
    series: [
      {
        name: '会话次数',
        type: 'bar',
        data: sessionDistribution.map(d => d.count),
        itemStyle: {
          color: '#5470c6',
        },
      },
    ],
  };

  // 一周学习模式热力图
  const weeklyHeatmapData = useMemo(() => {
    if (!appData) return [];

    const heatmap: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));

    appData.projects.forEach(project => {
      project.logs.forEach(log => {
        const date = dayjs(log.timestamp);
        const weekday = date.day();
        const hour = date.hour();
        const match = log.message.match(/(\d+(?:\.\d+)?)\s*分钟/);
        if (match) {
          heatmap[weekday][hour] += parseFloat(match[1]);
        }
      });
    });

    const data: [number, number, number][] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (heatmap[day][hour] > 0) {
          data.push([hour, day, Math.round(heatmap[day][hour])]);
        }
      }
    }

    return data;
  }, [appData]);

  const weeklyHeatmapOption = {
    title: {
      text: '一周学习模式热力图',
      left: 'center',
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `${weekdays[params.data[1]]} ${params.data[0]}:00<br/>学习时长: ${params.data[2]} 分钟`;
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
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      splitArea: {
        show: true,
      },
    },
    yAxis: {
      type: 'category',
      data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: 0,
      max: 120,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
      },
    },
    series: [
      {
        name: '学习时长',
        type: 'heatmap',
        data: weeklyHeatmapData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // 休息频率趋势
  const restFrequencyData = useMemo(() => {
    if (!appData) return [];

    const dateMap = new Map<string, { short: number; long: number }>();

    appData.projects.forEach(project => {
      project.logs.forEach(log => {
        if (log.type === 'rest') {
          const date = dayjs(log.timestamp).format('YYYY-MM-DD');
          const existing = dateMap.get(date) || { short: 0, long: 0 };

          if (log.message.includes('短休息') || log.message.includes('小休息')) {
            existing.short++;
          }
          if (log.message.includes('长休息') || log.message.includes('大休息')) {
            existing.long++;
          }

          dateMap.set(date, existing);
        }
      });
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // 最近30天
  }, [appData]);

  const restFrequencyOption = {
    title: {
      text: '休息频率趋势（最近30天）',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['短休息', '长休息'],
      top: 30,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: restFrequencyData.map(d => dayjs(d.date).format('MM-DD')),
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: '次数',
    },
    series: [
      {
        name: '短休息',
        type: 'line',
        data: restFrequencyData.map(d => d.short),
        itemStyle: {
          color: '#91cc75',
        },
      },
      {
        name: '长休息',
        type: 'line',
        data: restFrequencyData.map(d => d.long),
        itemStyle: {
          color: '#fac858',
        },
      },
    ],
  };

  // 学习效率评分（基于多个维度）
  const efficiencyScore = useMemo(() => {
    if (!appData || !appData.projects.length) return 0;

    let score = 0;

    // 1. 平均学习时长得分（0-25分）
    if (avgSessionDuration >= 60) score += 25;
    else if (avgSessionDuration >= 45) score += 20;
    else if (avgSessionDuration >= 30) score += 15;
    else if (avgSessionDuration >= 15) score += 10;
    else score += 5;

    // 2. 学习频率得分（0-25分）
    const totalSessions = appData.projects.reduce((sum, p) => {
      return sum + p.logs.filter(log => log.type === 'success').length;
    }, 0);
    if (totalSessions >= 100) score += 25;
    else if (totalSessions >= 50) score += 20;
    else if (totalSessions >= 20) score += 15;
    else if (totalSessions >= 10) score += 10;
    else score += 5;

    // 3. 项目活跃度得分（0-25分）
    const activeProjects = appData.projects.filter(p => {
      const lastLog = p.logs[p.logs.length - 1];
      return lastLog && dayjs().diff(dayjs(lastLog.timestamp), 'day') <= 7;
    }).length;
    const ratio = activeProjects / appData.projects.length;
    score += Math.round(ratio * 25);

    // 4. 总学习时长得分（0-25分）
    const totalMinutes = appData.projects.reduce((sum, p) => sum + p.totalStudyMinutes, 0);
    if (totalMinutes >= 3000) score += 25;
    else if (totalMinutes >= 1500) score += 20;
    else if (totalMinutes >= 500) score += 15;
    else if (totalMinutes >= 100) score += 10;
    else score += 5;

    return Math.min(score, 100);
  }, [appData, avgSessionDuration]);

  // 学习效率雷达图
  const efficiencyRadarOption = {
    title: {
      text: '学习效率分析',
      left: 'center',
    },
    tooltip: {},
    radar: {
      indicator: [
        { name: '平均时长', max: 100 },
        { name: '学习频率', max: 100 },
        { name: '项目活跃', max: 100 },
        { name: '总时长', max: 100 },
        { name: '坚持程度', max: 100 },
      ],
    },
    series: [
      {
        name: '学习效率',
        type: 'radar',
        data: [
          {
            value: [
              Math.min((avgSessionDuration / 90) * 100, 100),
              efficiencyScore * 0.6,
              efficiencyScore * 0.8,
              efficiencyScore * 0.9,
              efficiencyScore,
            ],
            name: '当前状态',
          },
        ],
      },
    ],
  };

  return (
    <div className="study-habits">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="平均单次学习时长"
              value={avgSessionDuration}
              suffix="分钟"
              valueStyle={{ color: '#3f8600' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {formatDuration(avgSessionDuration)}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="学习会话总数"
              value={sessionDistribution.reduce((sum, d) => sum + d.count, 0)}
              suffix="次"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="学习效率评分"
              value={efficiencyScore}
              suffix="/ 100"
              valueStyle={{ color: '#cf1322' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {efficiencyScore >= 80 ? '优秀' : efficiencyScore >= 60 ? '良好' : '需努力'}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={sessionDistributionOption} style={{ height: chartHeight }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={restFrequencyOption} style={{ height: chartHeight }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={efficiencyRadarOption} style={{ height: chartHeight }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={weeklyHeatmapOption} style={{ height: chartHeight }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudyHabits;
