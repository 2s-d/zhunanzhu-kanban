import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { TrophyOutlined, ProjectOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { calculateStatistics } from '../../utils/dataProcessor';
import { formatDuration, formatPoints } from '../../utils/dataProcessor';
const GlobalOverview = () => {
    const appData = useSelector((state) => state.appData.data);
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
    return (_jsxs("div", { className: "global-overview", children: [_jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsxs(Card, { hoverable: true, children: [_jsx(Statistic, { title: "\u603B\u8FD0\u6570", value: formatPoints(stats.totalPoints), prefix: _jsx(TrophyOutlined, { style: { color: '#faad14' } }), suffix: "\u8FD0" }), _jsx(Progress, { percent: Math.round(pointsProgress), strokeColor: {
                                        '0%': '#108ee9',
                                        '100%': '#87d068',
                                    }, size: "small", style: { marginTop: 12 } }), _jsxs("div", { style: { marginTop: 8, fontSize: 12, color: '#888' }, children: ["\u8DDD\u79BB1000\u8FD0\u8FD8\u6709 ", formatPoints(1000 - stats.totalPoints), " \u8FD0"] })] }) }), _jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsxs(Card, { hoverable: true, children: [_jsx(Statistic, { title: "\u9879\u76EE\u603B\u6570", value: stats.totalProjects, prefix: _jsx(ProjectOutlined, { style: { color: '#1890ff' } }), suffix: "\u4E2A" }), _jsx("div", { style: { marginTop: 24, fontSize: 12, color: '#888' }, children: "\u6D3B\u8DC3\u9879\u76EE\u6570\u91CF" })] }) }), _jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsxs(Card, { hoverable: true, children: [_jsx(Statistic, { title: "\u603B\u5B66\u4E60\u65F6\u957F", value: Math.round(stats.totalStudyMinutes), prefix: _jsx(ClockCircleOutlined, { style: { color: '#52c41a' } }), suffix: "\u5206\u949F" }), _jsx("div", { style: { marginTop: 24, fontSize: 12, color: '#888' }, children: formatDuration(stats.totalStudyMinutes) })] }) }), _jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsxs(Card, { hoverable: true, children: [_jsx(Statistic, { title: "\u8FDE\u7EED\u7B7E\u5230", value: stats.consecutiveCheckInDays, prefix: _jsx(CalendarOutlined, { style: { color: '#eb2f96' } }), suffix: "\u5929" }), _jsxs("div", { style: { marginTop: 24, fontSize: 12, color: '#888' }, children: ["\u4ECA\u65E5\u8FD0\u52BF: ", _jsx("span", { style: { color: fortuneColor, fontWeight: 'bold' }, children: fortuneText })] })] }) })] }), _jsx(Row, { gutter: [16, 16], style: { marginTop: 16 }, children: _jsx(Col, { span: 24, children: _jsx(Card, { children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, sm: 12, children: _jsx(Statistic, { title: "\u5E73\u5747\u6BCF\u65E5\u5B66\u4E60\u65F6\u957F", value: Math.round(stats.averageDailyStudyMinutes), suffix: "\u5206\u949F", precision: 0 }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Statistic, { title: "\u5E73\u5747\u6BCF\u9879\u76EE\u65F6\u957F", value: stats.totalProjects > 0 ? Math.round(stats.totalStudyMinutes / stats.totalProjects) : 0, suffix: "\u5206\u949F", precision: 0 }) })] }) }) }) })] }));
};
export default GlobalOverview;
