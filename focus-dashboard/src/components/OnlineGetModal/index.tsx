import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Space } from 'antd';
import { CloudDownloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { checkPhoneStatus, fetchDataFromServer } from '../../utils/onlineData';
import { AppData } from '../../types';

interface OnlineGetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: AppData) => void;
}

const OnlineGetModal: React.FC<OnlineGetModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // 检查手机连接状态
  const handleCheckStatus = async () => {
    const phone = form.getFieldValue('phone');
    if (!phone) {
      message.warning('请先输入手机号');
      return;
    }
    
    setChecking(true);
    try {
      const isConnected = await checkPhoneStatus(phone);
      if (isConnected) {
        message.success('手机已连接！可以获取数据');
      } else {
        message.warning('手机未连接，请确保APP已启动并连接服务器');
      }
    } catch (error) {
      message.error('检查失败，请重试');
    } finally {
      setChecking(false);
    }
  };

  // 获取数据
  const handleSubmit = async (values: { phone: string; key: string }) => {
    setLoading(true);
    try {
      // 先检查连接状态
      const isConnected = await checkPhoneStatus(values.phone);
      if (!isConnected) {
        message.error('手机未连接！请确保：\n1. APP已启动\n2. 已连接服务器');
        setLoading(false);
        return;
      }
      
      // 获取数据
      const data = await fetchDataFromServer(values.phone, values.key);
      onSuccess(data);
      message.success('数据获取成功！');
      onOpenChange(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
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
      onCancel={() => onOpenChange(false)}
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
          <Input placeholder="请输入手机号（APP设置中的手机号）" />
        </Form.Item>

        <Form.Item
          label="连接密钥"
          name="key"
          rules={[{ required: true, message: '请输入连接密钥' }]}
        >
          <Input.Password placeholder="请输入连接密钥（APP设置中的密钥）" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%' }} direction="vertical">
            <Button 
              type="default" 
              onClick={handleCheckStatus}
              loading={checking}
              block
            >
              检查手机连接状态
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<CheckCircleOutlined />}
              block
            >
              获取数据
            </Button>
          </Space>
        </Form.Item>
      </Form>
      
      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
        <strong>使用说明：</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
          <li>在APP中设置手机号和连接密钥</li>
          <li>启动APP并确保已连接服务器</li>
          <li>在网页输入相同的手机号和密钥</li>
          <li>点击"获取数据"即可同步</li>
        </ul>
      </div>
    </Modal>
  );
};

export default OnlineGetModal;
