import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { useSelector } from 'react-redux';
import { analyzeRewardSources, formatPoints } from '../../utils/dataProcessor';
import ReactECharts from 'echarts-for-react';
const RewardAnalysis = () => {
    const appData = useSelector((state) => state.appData.data);
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
            formatter: (params) => {
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
                formatter: (params) => {
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
    return (_jsxs("div", { className: "reward-analysis", children: [_jsxs(Row, { gutter: [16, 16], style: { marginBottom: 16 }, children: [_jsx(Col, { xs: 24, sm: 12, md: 6, children: _jsx(Card, { children: _jsx(Statistic, { title: "\u7B7E\u5230\u5956\u52B1", value: formatPoints(stats.checkIn), suffix: "\u8FD0", valueStyle: { color: '#3f8600' } }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 6, children: _jsx(Card, { children: _jsx(Statistic, { title: "\u5B66\u4E60\u5956\u52B1", value: formatPoints(stats.study), suffix: "\u8FD0", valueStyle: { color: '#1890ff' } }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 6, children: _jsx(Card, { children: _jsx(Statistic, { title: "\u4F11\u606F\u5956\u52B1", value: formatPoints(stats.rest), suffix: "\u8FD0", valueStyle: { color: '#faad14' } }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 6, children: _jsx(Card, { children: _jsx(Statistic, { title: "\u603B\u5956\u52B1", value: formatPoints(stats.total), suffix: "\u8FD0", valueStyle: { color: '#cf1322' } }) }) })] }), _jsxs(Row, { gutter: [16, 16], style: { marginBottom: 16 }, children: [_jsx(Col, { xs: 24, sm: 12, children: _jsx(Card, { children: _jsx(Statistic, { title: "\u77ED\u4F11\u606F\u6B21\u6570", value: stats.shortRestCount, suffix: "\u6B21" }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Card, { children: _jsx(Statistic, { title: "\u957F\u4F11\u606F\u6B21\u6570", value: stats.longRestCount, suffix: "\u6B21" }) }) })] }), _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, lg: 12, children: _jsx(Card, { children: _jsx(ReactECharts, { option: sourceDistributionOption, style: { height: '400px' } }) }) }), _jsx(Col, { xs: 24, lg: 12, children: _jsx(Card, { children: _jsx(ReactECharts, { option: projectRewardOption, style: { height: '400px' } }) }) })] }), _jsx(Row, { gutter: [16, 16], style: { marginTop: 16 }, children: _jsx(Col, { span: 24, children: _jsx(Card, { children: _jsx(ReactECharts, { option: rewardConfigOption, style: { height: '400px' } }) }) }) })] }));
};
export default RewardAnalysis;
