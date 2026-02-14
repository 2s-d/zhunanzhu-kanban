import React, { useMemo } from 'react';
import { Card, Row, Col, Segmented } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setTimeRange } from '../../store/appDataSlice';
import { extractTimeTrendData, analyzeStudyPeriodDistribution, formatDuration } from '../../utils/dataProcessor';
import { useChartHeight } from '../../hooks/use-mobile';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const TimeTrends: React.FC = () => {
  const dispatch = useDispatch();
  const appData = useSelector((state: RootState) => state.appData.data);
  const timeRange = useSelector((state: RootState) => state.appData.timeRange);
  const chartHeight = useChartHeight();

  const trendData = useMemo(() => extractTimeTrendData(appData, timeRange), [appData, timeRange]);
  const periodData = useMemo(() => analyzeStudyPeriodDistribution(appData), [appData]);

  // 每日学习时长趋势图
  const dailyTrendOption = {
    title: {
      text: '每日学习时长趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>学习时长: ${formatDuration(data.value)}`;
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
      data: trendData.map(d => dayjs(d.date).format('MM-DD')),
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: '分钟',
    },
    series: [
      {
        name: '学习时长',
        type: 'line',
        data: trendData.map(d => d.minutes),
        smooth: true,
        itemStyle: {
          color: '#1890ff',
        },
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.2)',
        },
      },
    ],
  };

  // 运获得趋势图
  const pointsTrendOption = {
    title: {
      text: '每日运获得趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>运: ${data.value.toFixed(1)}`;
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
      data: trendData.map(d => dayjs(d.date).format('MM-DD')),
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: '运',
    },
    series: [
      {
        name: '运',
        type: 'line',
        data: trendData.map(d => d.points),
        smooth: true,
        itemStyle: {
          color: '#52c41a',
        },
        areaStyle: {
          color: 'rgba(82, 196, 26, 0.2)',
        },
      },
    ],
  };

  // 学习时段分布饼图
  const periodDistributionOption = {
    title: {
      text: '学习时段分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}<br/>时长: ${formatDuration(params.value)}<br/>占比: ${params.percent}%`;
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '学习时段',
        type: 'pie',
        radius: '50%',
        data: periodData.map(p => ({ name: p.period, value: p.minutes })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // 周统计数据
  const weeklyData = useMemo(() => {
    if (!trendData.length) return [];

    const weekMap = new Map<number, number>();
    trendData.forEach(d => {
      const weekday = dayjs(d.date).day(); // 0=周日, 1=周一, ...
      weekMap.set(weekday, (weekMap.get(weekday) || 0) + d.minutes);
    });

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays.map((name, index) => ({
      name,
      value: weekMap.get(index) || 0,
    }));
  }, [trendData]);

  const weeklyChartOption = {
    title: {
      text: '每周学习统计',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>学习时长: ${formatDuration(data.value)}`;
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
      data: weeklyData.map(d => d.name),
    },
    yAxis: {
      type: 'value',
      name: '分钟',
    },
    series: [
      {
        name: '学习时长',
        type: 'bar',
        data: weeklyData.map(d => d.value),
        itemStyle: {
          color: '#faad14',
        },
      },
    ],
  };

  return (
    <div className="time-trends">
      <Card style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Segmented
            options={[
              { label: '今天', value: 'today' },
              { label: '本周', value: 'week' },
              { label: '本月', value: 'month' },
              { label: '全部', value: 'all' },
            ]}
            value={timeRange}
            onChange={(value) => dispatch(setTimeRange(value as any))}
          />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={dailyTrendOption} style={{ height: chartHeight }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={pointsTrendOption} style={{ height: chartHeight }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={weeklyChartOption} style={{ height: chartHeight }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={periodDistributionOption} style={{ height: chartHeight }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TimeTrends;
