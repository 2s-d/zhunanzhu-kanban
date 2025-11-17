import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { TrophyOutlined, ProjectOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { calculateStatistics } from '../../utils/dataProcessor';
import { formatDuration, formatPoints } from '../../utils/dataProcessor';

const GlobalOverview: React.FC = () => {
  const appData = useSelector((state: RootState) => state.appData.data);
  const stats = calculateStatistics(appData);

  // 计算运势进度（假设目标是1000运）
  const pointsProgress = Math.min((stats.totalPoints / 1000) * 100, 100);

  // 获取今日运势
  const fortune = appData?.todayFortune;
  const fortuneText = fortune ? {
    'ping': '平',
    'xiaoJi': '小吉',
    'daJi': '大吉',
  }[fortune.level] : '--';

  const fortuneColor = fortune ? {
    'ping': '#faad14',
    'xiaoJi': '#52c41a',
    'daJi': '#f5222d',
  }[fortune.level] : '#d9d9d9';

  return (
    <div className="global-overview">
      <Row gutter={[16, 16]}>
        {/* 总运数卡片 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总运数"
              value={formatPoints(stats.totalPoints)}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              suffix="运"
            />
            <Progress
              percent={Math.round(pointsProgress)}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              size="small"
              style={{ marginTop: 12 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              距离1000运还有 {formatPoints(1000 - stats.totalPoints)} 运
            </div>
          </Card>
        </Col>

        {/* 项目总数卡片 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="项目总数"
              value={stats.totalProjects}
              prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
              suffix="个"
            />
            <div style={{ marginTop: 24, fontSize: 12, color: '#888' }}>
              活跃项目数量
            </div>
          </Card>
        </Col>

        {/* 总学习时长卡片 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总学习时长"
              value={Math.round(stats.totalStudyMinutes)}
              prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
              suffix="分钟"
            />
            <div style={{ marginTop: 24, fontSize: 12, color: '#888' }}>
              {formatDuration(stats.totalStudyMinutes)}
            </div>
          </Card>
        </Col>

        {/* 连续签到卡片 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="连续签到"
              value={stats.consecutiveCheckInDays}
              prefix={<CalendarOutlined style={{ color: '#eb2f96' }} />}
              suffix="天"
            />
            <div style={{ marginTop: 24, fontSize: 12, color: '#888' }}>
              今日运势: <span style={{ color: fortuneColor, fontWeight: 'bold' }}>{fortuneText}</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 平均学习时长卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Statistic
                  title="平均每日学习时长"
                  value={Math.round(stats.averageDailyStudyMinutes)}
                  suffix="分钟"
                  precision={0}
                />
              </Col>
              <Col xs={24} sm={12}>
                <Statistic
                  title="平均每项目时长"
                  value={stats.totalProjects > 0 ? Math.round(stats.totalStudyMinutes / stats.totalProjects) : 0}
                  suffix="分钟"
                  precision={0}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GlobalOverview;
