import React, { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Layout, Upload, Button, message, Tabs, Dropdown, Space, ConfigProvider } from 'antd';
import type { MenuProps } from 'antd';
import { UploadOutlined, DownloadOutlined, DashboardOutlined, ProjectOutlined, LineChartOutlined, GiftOutlined, HeartOutlined, BookOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store, RootState } from './store';
import { setAppData, setLoading, setError } from './store/appDataSlice';
import { AppData } from './types';
import { exportToExcel, exportToCSV, exportToPDF } from './utils/exportData';
import { colorFromFlutterValue } from './utils/colorUtils';
import GlobalOverview from './components/GlobalOverview';
import ProjectAnalysis from './components/ProjectAnalysis';
import TimeTrends from './components/TimeTrends';
import RewardAnalysis from './components/RewardAnalysis';
import StudyHabits from './components/StudyHabits';
import OnlineGetModal from './components/OnlineGetModal';
import './App.css';
import './App.mobile.css';

const { Header, Content } = Layout;

const DashboardContent: React.FC = () => {
  const dispatch = useDispatch();
  const appData = useSelector((state: RootState) => state.appData.data);
  const [activeTab, setActiveTab] = useState('overview');
  const [themeColor, setThemeColor] = useState('#1890ff');
  const [onlineModalOpen, setOnlineModalOpen] = useState(false);

  // 处理在线获取数据成功
  const handleOnlineSuccess = (data: AppData) => {
    dispatch(setAppData(data));
    message.success('在线数据获取成功！');
  };

  // 加载示例数据
  useEffect(() => {
    const loadSampleData = async () => {
      try {
        dispatch(setLoading(true));
        const response = await fetch('/data/sample_app_data.json');
        if (!response.ok) {
          throw new Error('Failed to load sample data');
        }
        const data: AppData = await response.json();
        dispatch(setAppData(data));
        message.success('示例数据加载成功');
      } catch (error) {
        console.error('Error loading sample data:', error);
        dispatch(setError('示例数据加载失败，请上传您的app_data.json文件'));
      }
    };

    loadSampleData();
  }, [dispatch]);

  // 根据Flutter的themeSeedColorValue更新主题色
  useEffect(() => {
    if (appData?.themeSeedColorValue) {
      const color = colorFromFlutterValue(appData.themeSeedColorValue);
      setThemeColor(color);
    }
  }, [appData?.themeSeedColorValue]);

  // 数据导出菜单项
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: '导出为 Excel',
      onClick: () => {
        try {
          exportToExcel(appData);
          message.success('Excel 文件导出成功');
        } catch (error: any) {
          message.error(error.message || '导出失败');
        }
      },
    },
    {
      key: 'csv',
      label: '导出为 CSV',
      onClick: () => {
        try {
          exportToCSV(appData);
          message.success('CSV 文件导出成功');
        } catch (error: any) {
          message.error(error.message || '导出失败');
        }
      },
    },
    {
      key: 'pdf',
      label: '导出为 PDF',
      onClick: () => {
        try {
          exportToPDF(appData);
          message.success('PDF 文件导出成功');
        } catch (error: any) {
          message.error(error.message || '导出失败');
        }
      },
    },
  ];

  // 文件上传处理
  const uploadProps: Partial<UploadProps> = {
    name: 'file',
    accept: '.json',
    beforeUpload: (file: any) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const content = e.target?.result as string;
          const data: AppData = JSON.parse(content);
          
          // 验证数据格式
          if (!data.schemaVersion || !data.projects) {
            throw new Error('Invalid data format');
          }
          
          dispatch(setAppData(data));
          message.success(`${file.name} 上传成功`);
        } catch (error) {
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
      label: (
        <span>
          <DashboardOutlined />
          全局概览
        </span>
      ),
      children: <GlobalOverview />,
    },
    {
      key: 'projects',
      label: (
        <span>
          <ProjectOutlined />
          项目分析
        </span>
      ),
      children: <ProjectAnalysis />,
    },
    {
      key: 'trends',
      label: (
        <span>
          <LineChartOutlined />
          时间趋势
        </span>
      ),
      children: <TimeTrends />,
    },
    {
      key: 'rewards',
      label: (
        <span>
          <GiftOutlined />
          奖励分析
        </span>
      ),
      children: <RewardAnalysis />,
    },
    {
      key: 'habits',
      label: (
        <span>
          <HeartOutlined />
          学习习惯
        </span>
      ),
      children: <StudyHabits />,
    },
  ];

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: themeColor,
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOutlined style={{ color: '#fff', fontSize: '24px' }} />
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
              专注APP数据看板
            </span>
          </div>
          <Space>
            <Button 
              type="primary" 
              icon={<CloudDownloadOutlined />}
              onClick={() => setOnlineModalOpen(true)}
            >
              在线获取
            </Button>
            <Upload {...uploadProps}>
              <Button type="primary" icon={<UploadOutlined />}>
                导入数据
              </Button>
            </Upload>
            <Dropdown 
              menu={{ 
                items: [
                  {
                    key: 'excel',
                    label: '导出为 Excel',
                    onClick: () => {
                      try {
                        exportToExcel(appData);
                        message.success('Excel 文件导出成功');
                      } catch (error: any) {
                        message.error(error.message || '导出失败');
                      }
                    },
                  },
                  {
                    key: 'csv',
                    label: '导出为 CSV',
                    onClick: () => {
                      try {
                        exportToCSV(appData);
                        message.success('CSV 文件导出成功');
                      } catch (error: any) {
                        message.error(error.message || '导出失败');
                      }
                    },
                  },
                  {
                    key: 'pdf',
                    label: '导出为 PDF',
                    onClick: () => {
                      try {
                        exportToPDF(appData);
                        message.success('PDF 文件导出成功');
                      } catch (error: any) {
                        message.error(error.message || '导出失败');
                      }
                    },
                  },
                ]
              }} 
              placement="bottomRight"
            >
              <Button icon={<DownloadOutlined />}>
                导出数据
              </Button>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: '24px' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            style={{ background: '#fff', padding: '16px', borderRadius: '8px' }}
          />
        </Content>
        <OnlineGetModal
          open={onlineModalOpen}
          onClose={() => setOnlineModalOpen(false)}
          onSuccess={handleOnlineSuccess}
        />
      </Layout>
    </ConfigProvider>
  );
};

function App() {
  return (
    <Provider store={store}>
      <DashboardContent />
    </Provider>
  );
}

export default App;
