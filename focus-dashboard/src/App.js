import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { Layout, Upload, Button, message, Tabs } from 'antd';
import { UploadOutlined, DashboardOutlined, ProjectOutlined, LineChartOutlined, GiftOutlined, HeartOutlined } from '@ant-design/icons';
import { store } from './store';
import { setAppData, setLoading, setError } from './store/appDataSlice';
import GlobalOverview from './components/GlobalOverview';
import ProjectAnalysis from './components/ProjectAnalysis';
import TimeTrends from './components/TimeTrends';
import RewardAnalysis from './components/RewardAnalysis';
import StudyHabits from './components/StudyHabits';
import './App.css';
const { Header, Content } = Layout;
const DashboardContent = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('overview');
    // 加载示例数据
    useEffect(() => {
        const loadSampleData = async () => {
            try {
                dispatch(setLoading(true));
                const response = await fetch('/data/sample_app_data.json');
                if (!response.ok) {
                    throw new Error('Failed to load sample data');
                }
                const data = await response.json();
                dispatch(setAppData(data));
                message.success('示例数据加载成功');
            }
            catch (error) {
                console.error('Error loading sample data:', error);
                dispatch(setError('示例数据加载失败，请上传您的app_data.json文件'));
            }
        };
        loadSampleData();
    }, [dispatch]);
    // 文件上传处理
    const uploadProps = {
        name: 'file',
        accept: '.json',
        beforeUpload: (file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result;
                    const data = JSON.parse(content);
                    // 验证数据格式
                    if (!data.schemaVersion || !data.projects) {
                        throw new Error('Invalid data format');
                    }
                    dispatch(setAppData(data));
                    message.success(`${file.name} 上传成功`);
                }
                catch (error) {
                    message.error('文件格式错误，请确保是有效的app_data.json文件');
                }
            };
            reader.readAsText(file);
            return false; // 阻止自动上传
        },
        showUploadList: false,
    };
    const tabItems = [
        {
            key: 'overview',
            label: (_jsxs("span", { children: [_jsx(DashboardOutlined, {}), "\u5168\u5C40\u6982\u89C8"] })),
            children: _jsx(GlobalOverview, {}),
        },
        {
            key: 'projects',
            label: (_jsxs("span", { children: [_jsx(ProjectOutlined, {}), "\u9879\u76EE\u5206\u6790"] })),
            children: _jsx(ProjectAnalysis, {}),
        },
        {
            key: 'trends',
            label: (_jsxs("span", { children: [_jsx(LineChartOutlined, {}), "\u65F6\u95F4\u8D8B\u52BF"] })),
            children: _jsx(TimeTrends, {}),
        },
        {
            key: 'rewards',
            label: (_jsxs("span", { children: [_jsx(GiftOutlined, {}), "\u5956\u52B1\u5206\u6790"] })),
            children: _jsx(RewardAnalysis, {}),
        },
        {
            key: 'habits',
            label: (_jsxs("span", { children: [_jsx(HeartOutlined, {}), "\u5B66\u4E60\u4E60\u60EF"] })),
            children: _jsx(StudyHabits, {}),
        },
    ];
    return (_jsxs(Layout, { style: { minHeight: '100vh' }, children: [_jsxs(Header, { style: { background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("div", { style: { color: '#fff', fontSize: '20px', fontWeight: 'bold' }, children: "\u4E13\u6CE8APP\u6570\u636E\u770B\u677F" }), _jsx(Upload, { ...uploadProps, children: _jsx(Button, { type: "primary", icon: _jsx(UploadOutlined, {}), children: "\u5BFC\u5165\u6570\u636E" }) })] }), _jsx(Content, { style: { padding: '24px' }, children: _jsx(Tabs, { activeKey: activeTab, onChange: setActiveTab, items: tabItems, size: "large", style: { background: '#fff', padding: '16px', borderRadius: '8px' } }) })] }));
};
function App() {
    return (_jsx(Provider, { store: store, children: _jsx(DashboardContent, {}) }));
}
export default App;
