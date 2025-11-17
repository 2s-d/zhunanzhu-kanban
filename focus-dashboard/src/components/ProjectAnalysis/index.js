import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import { useSelector } from 'react-redux';
import { extractProjectStats, formatDuration, formatPoints } from '../../utils/dataProcessor';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
const ProjectAnalysis = () => {
    const appData = useSelector((state) => state.appData.data);
    const projectStats = useMemo(() => extractProjectStats(appData), [appData]);
    // 表格列定义
    const columns = [
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
            render: (minutes) => formatDuration(minutes),
            width: 120,
        },
        {
            title: '累计运',
            dataIndex: 'totalPoints',
            key: 'totalPoints',
            sorter: (a, b) => a.totalPoints - b.totalPoints,
            render: (points) => `${formatPoints(points)} 运`,
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
            render: (date) => dayjs(date).format('YYYY-MM-DD'),
            width: 120,
        },
        {
            title: '最后活跃',
            dataIndex: 'lastActivity',
            key: 'lastActivity',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '--',
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
                    return _jsx(Tag, { color: "green", children: "\u6D3B\u8DC3" });
                }
                else if (daysSinceActivity <= 7) {
                    return _jsx(Tag, { color: "orange", children: "\u4E00\u822C" });
                }
                else {
                    return _jsx(Tag, { color: "red", children: "\u4F11\u7720" });
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
            formatter: (params) => {
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
            formatter: (params) => {
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
    return (_jsxs("div", { className: "project-analysis", children: [_jsx(Card, { title: "\u9879\u76EE\u5217\u8868", style: { marginBottom: 16 }, children: _jsx(Table, { columns: columns, dataSource: projectStats, rowKey: "id", pagination: { pageSize: 10 }, scroll: { x: 900 } }) }), _jsx(Card, { style: { marginBottom: 16 }, children: _jsx(ReactECharts, { option: studyTimeChartOption, style: { height: '400px' } }) }), _jsx(Card, { children: _jsx(ReactECharts, { option: pointsChartOption, style: { height: '400px' } }) })] }));
};
export default ProjectAnalysis;
