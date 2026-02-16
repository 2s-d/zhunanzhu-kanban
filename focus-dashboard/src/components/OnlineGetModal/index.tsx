import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Space } from 'antd';
import { CloudDownloadOutlined, CheckCircleOutlined, WifiOutlined } from '@ant-design/icons';
import { connect, disconnect, onMessage, onClose } from '../../utils/onlineData';
import { AppData } from '../../types';

interface OnlineGetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: AppData) => void;
}

const OnlineGetModal: React.FC<OnlineGetModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // 监听WebSocket关闭事件
  React.useEffect(() => {
    if (open) {
      // 设置关闭回调
      onClose(() => {
        setConnected(false);
        message.warning('连接已断开');
      });
    }
  }, [open]);

  // 订阅数据（使用WebSocket）
  const handleSubmit = async (values: { phone: string; key: string }) => {
    setLoading(true);
    try {
      // 断开之前的连接
      disconnect();

      // 连接WebSocket并订阅
      const result = await connect(values.phone, values.key);
      
      // 订阅成功，获取到历史数据
      if (result.data) {
        onSuccess(result.data);
        message.success('数据获取成功！');
      } else {
        message.info('暂无历史数据，请确保APP已同步过数据');
      }

      // 设置实时数据监听
      onMessage((newData: AppData) => {
        console.log('收到实时数据:', newData);
        onSuccess(newData);
        message.success('数据已更新！');
      });

      setConnected(true);
      onOpenChange(false);
      form.resetFields();

    } catch (error: any) {
      message.error(error.message || '获取数据失败');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // 断开连接
  const handleDisconnect = () => {
    disconnect();
    setConnected(false);
    message.info('已断开连接');
  };

  return (
    <Modal
      title={
        <Space>
          <CloudDownloadOutlined />
          在线获取数据
        </Space>
      }
      open={open}
      onCancel={() => {
        onOpenChange(false);
        if (connected) {
          // 保持连接，只关闭弹窗
        }
      }}
      footer={null}
      width={400}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="手机号"
          name="phone"
          rules={[{ required: true, message: '请输入手机号' }]}
        >
          <Input placeholder="请输入手机号（APP设置中的手机号）" disabled={connected} />
        </Form.Item>

        <Form.Item
          label="连接密钥"
          name="key"
          rules={[{ required: true, message: '请输入连接密钥' }]}
        >
          <Input.Password placeholder="请输入连接密钥（APP设置中的密钥）" disabled={connected} />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%' }} direction="vertical">
            {connected ? (
              <Button 
                type="default" 
                danger
                onClick={handleDisconnect}
                block
                icon={<WifiOutlined />}
              >
                已连接 - 点击断开
              </Button>
            ) : (
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<CheckCircleOutlined />}
                block
              >
                连接并获取数据
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
      
      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
        <strong>使用说明：</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
          <li>在APP中设置手机号和连接密钥</li>
          <li>启动APP并确保已连接服务器</li>
          <li>在网页输入相同的手机号和密钥</li>
          <li>点击"连接并获取数据"即可同步</li>
          <li>连接后会自动接收APP推送的实时数据</li>
        </ul>
      </div>
    </Modal>
  );
};

export default OnlineGetModal;
