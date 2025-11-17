import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { analyzeRewardSources, formatPoints } from '../../utils/dataProcessor';
import ReactECharts from 'echarts-for-react';

const RewardAnalysis: React.FC = () => {
  const appData = useSelector((state: RootState) => state.appData.data);
  const rewardSources = useMemo(() => analyzeRewardSources(appData), [appData]);

  // 计算各类奖励统计
  const stats = useMemo(() => {
    const checkIn = rewardSources.find(r => r.type === '签到奖励')?.amount || 0;
    const study = rewardSources.find(r => r.type === '学习奖励')?.amount || 0;
    const rest = rewardSources.find(r => r.type === '休息奖励')?.amount || 0;

    // 统计休息次数（从日志中）
    let shortRestCount = 0;
    let longRestCount = 0;

    if (appData) {
      appData.projects.forEach(project => {
        project.logs.forEach(log => {
          if (log.message.includes('短休息') || log.message.includes('小休息')) {
            shortRestCount++;
          }
          if (log.message.includes('长休息') || log.message.includes('大休息')) {
            longRestCount++;
          }
        });
      });
    }

    return {
      checkIn,
      study,
      rest,
      shortRestCount,
      longRestCount,
      total: checkIn + study + rest,
    };
  }, [appData, rewardSources]);

  // 奖励来源分布饼图
  const sourceDistributionOption = {
    title: {
      text: '奖励来源分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}<br/>运: ${formatPoints(params.value)}<br/>占比: ${params.percent}%`;
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '奖励来源',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        data: rewardSources.map(r => ({
          name: r.type,
          value: r.amount,
        })),
      },
    ],
    color: ['#5470c6', '#91cc75', '#fac858'],
  };

  // 奖励获得趋势图（按项目）
  const projectRewardOption = useMemo(() => {
    if (!appData || !appData.projects.length) {
      return {
        title: { text: '项目奖励对比', left: 'center' },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value', name: '运' },
        series: [{ type: 'bar', data: [] }],
      };
    }

    return {
      title: {
        text: '项目奖励对比',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const data = params[0];
          return `${data.name}<br/>运: ${formatPoints(data.value)}`;
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
        data: appData.projects.map(p => p.name),
        axisLabel: {
          interval: 0,
          rotate: appData.projects.length > 5 ? 45 : 0,
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
          data: appData.projects.map(p => p.totalPointsTenths / 10),
          itemStyle: {
            color: '#73c0de',
          },
        },
      ],
    };
  }, [appData]);

  // 奖励配置雷达图
  const rewardConfigOption = useMemo(() => {
    if (!appData || !appData.projects.length) {
      return {
        title: { text: '奖励配置使用情况', left: 'center' },
        radar: { indicator: [] },
        series: [{ type: 'radar', data: [] }],
      };
    }

    // 计算平均奖励配置
    let avgShortRest = 0;
    let avgLongRest = 0;
    let avgPerMinute = 0;
    let count = 0;

    appData.projects.forEach(project => {
      if (project.rewardShortRest !== undefined) {
        avgShortRest += project.rewardShortRest;
        count++;
      }
      if (project.rewardLongRest !== undefined) {
        avgLongRest += project.rewardLongRest;
      }
      if (project.rewardPerMinuteTenths !== undefined) {
        avgPerMinute += project.rewardPerMinuteTenths / 10;
      }
    });

    if (count > 0) {
      avgShortRest /= count;
      avgLongRest /= count;
      avgPerMinute /= count;
    }

    return {
      title: {
        text: '奖励配置使用情况',
        left: 'center',
      },
      tooltip: {},
      radar: {
        indicator: [
          { name: '短休息奖励', max: 10 },
          { name: '长休息奖励', max: 100 },
          { name: '每分钟奖励', max: 3 },
        ],
      },
      series: [
        {
          name: '平均配置',
          type: 'radar',
          data: [
            {
              value: [avgShortRest, avgLongRest, avgPerMinute],
              name: '平均奖励配置',
            },
          ],
        },
      ],
    };
  }, [appData]);

  return (
    <div className="reward-analysis">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="签到奖励"
              value={formatPoints(stats.checkIn)}
              suffix="运"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="学习奖励"
              value={formatPoints(stats.study)}
              suffix="运"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="休息奖励"
              value={formatPoints(stats.rest)}
              suffix="运"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总奖励"
              value={formatPoints(stats.total)}
              suffix="运"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="短休息次数"
              value={stats.shortRestCount}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="长休息次数"
              value={stats.longRestCount}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={sourceDistributionOption} style={{ height: '400px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <ReactECharts option={projectRewardOption} style={{ height: '400px' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <ReactECharts option={rewardConfigOption} style={{ height: '400px' }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RewardAnalysis;
