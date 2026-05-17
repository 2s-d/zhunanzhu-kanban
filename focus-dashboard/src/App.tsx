import React, { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Layout, Upload, Button, message, Tabs, Dropdown, Space, ConfigProvider } from 'antd';
import type { MenuProps } from 'antd';
import { UploadOutlined, DownloadOutlined, DashboardOutlined, ProjectOutlined, LineChartOutlined, GiftOutlined, HeartOutlined, BookOutlined, CloudDownloadOutlined, SyncOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store, RootState } from './store';
import { setAppData, setLoading, setError } from './store/appDataSlice';
import { AppData } from './types';
import { exportToExcel, exportToCSV, exportToJSON } from './utils/exportData';
import { colorFromFlutterValue } from './utils/colorUtils';
import { localSampleAppData } from './utils/localSampleData';
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

  // 统一的“加载示例数据”函数：只在点击“一键填充/刷新测试数据”时触发
  const loadSampleData = (opts?: { fromRefresh?: boolean }) => {
    dispatch(setLoading(true));
    // 使用深拷贝，避免某些组件意外修改示例数据对象导致后续填充不一致
    const cloned: AppData =
      typeof structuredClone === 'function'
        ? structuredClone(localSampleAppData)
        : JSON.parse(JSON.stringify(localSampleAppData));
    dispatch(setAppData(cloned));
    dispatch(setLoading(false));
    message.success(opts?.fromRefresh ? '测试数据已刷新' : '测试数据已填充');
  };

  // 处理在线获取数据成功
  const handleOnlineSuccess = (data: AppData) => {
    dispatch(setAppData(data));
    message.success('在线数据获取成功！');
  };

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
      label: '导出为 Excel（推荐）',
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
      key: 'json',
      label: '导出为 JSON（完整备份）',
      onClick: () => {
        try {
          exportToJSON(appData);
          message.success('JSON 文件导出成功');
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
        <Header
          className="dashboard-header"
          style={{
            background: '#001529',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            className="dashboard-header-left"
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <BookOutlined style={{ color: '#fff', fontSize: '24px' }} />
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
              专注APP数据看板
            </span>
          </div>
            <Space className="dashboard-header-actions">
              {/* 一键填充本地测试数据（不依赖在线推送） */}
              <Button
                icon={<CloudDownloadOutlined />}
                onClick={() => loadSampleData()}
              >
                测试数据一键填充
              </Button>
            {/* 在线获取按钮 - 分栏设计：左边获取信息，右边刷新 */}
            <div
              className="dashboard-online-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#1890ff',
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: 'pointer',
                height: '28px',
              }}
            >
              {/* 左侧：获取信息 - 触发API获取 */}
              <div 
                style={{ 
                  padding: '2px 12px', 
                  color: 'white', 
                  fontSize: '14px',
                  borderRight: '1px solid rgba(255,255,255,0.3)',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={() => setOnlineModalOpen(true)}
              >
                获取信息
              </div>
              {/* 右侧：刷新图标 - 重新加载数据 */}
              <div 
                style={{ 
                  padding: '2px 8px', 
                  color: 'white',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%'
                }}
                onClick={() => {
                  // 刷新当前数据（重新加载示例数据）
                  loadSampleData({ fromRefresh: true });
                }}
              >
                <SyncOutlined spin={false} />
              </div>
            </div>
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
                    label: '导出为 Excel（推荐）',
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
                    key: 'json',
                    label: '导出为 JSON（完整备份）',
                    onClick: () => {
                      try {
                        exportToJSON(appData);
                        message.success('JSON 文件导出成功');
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
          onOpenChange={(open) => setOnlineModalOpen(open)}
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
