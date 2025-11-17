import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import App from './App';
import './index.css';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(ConfigProvider, { locale: zhCN, theme: {
            token: {
                colorPrimary: '#1890ff',
                borderRadius: 8,
            },
        }, children: _jsx(App, {}) }) }));
