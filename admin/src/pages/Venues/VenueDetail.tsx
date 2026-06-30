import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  InputNumber,
  Image,
  Spin,
  message,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getVenue,
  auditVenue,
  markSiteVisit,
  updateVenue,
  type Venue,
} from '../../services/venue';
import ClassroomManager from './ClassroomManager';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '';

/** 加载高德 JS API 2.0 并渲染地图 */
function AmapPreview({ lat, lng, name, amapKey }: { lat: number; lng: number; name: string; amapKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !amapKey) return;

    let map: any = null;

    const initMap = () => {
      const AMap = (window as any).AMap;
      if (!AMap) return;
      map = new AMap.Map(containerRef.current, {
        zoom: 15,
        center: [lng, lat],
      });
      const marker = new AMap.Marker({
        position: [lng, lat],
        title: name,
      });
      map.add(marker);
      // 添加 500m 范围圆
      const circle = new AMap.Circle({
        center: [lng, lat],
        radius: 500,
        strokeColor: '#2563EB',
        strokeWeight: 2,
        strokeOpacity: 0.5,
        fillColor: '#2563EB',
        fillOpacity: 0.1,
      });
      map.add(circle);
    };

    if ((window as any).AMap) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`;
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (map) map.destroy();
    };
  }, [lat, lng, name, amapKey]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 300,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #f0f0f0',
      }}
    />
  );
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
  offline: { text: '已下线', color: 'default' },
};

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitNote, setVisitNote] = useState('');
  const [lngLatOpen, setLngLatOpen] = useState(false);
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [lngLatSaving, setLngLatSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getVenue(id);
      setVenue(data);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      await auditVenue(id, 'approved');
      message.success('审核通过');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '操作失败');
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await auditVenue(id, 'rejected', rejectRemark);
      message.success('已驳回');
      setRejectOpen(false);
      setRejectRemark('');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '操作失败');
    }
  };

  const handleSiteVisit = async () => {
    if (!id) return;
    try {
      await markSiteVisit(id, visitNote);
      message.success('已标记考察');
      setVisitOpen(false);
      setVisitNote('');
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const openLngLatEdit = () => {
    if (!venue) return;
    setEditLat(venue.latitude ? Number(venue.latitude) : null);
    setEditLng(venue.longitude ? Number(venue.longitude) : null);
    setLngLatOpen(true);
  };

  const handleLngLatSave = async () => {
    if (!id || editLat == null || editLng == null) {
      message.warning('请输入完整的经纬度');
      return;
    }
    setLngLatSaving(true);
    try {
      await updateVenue(id, { latitude: editLat as any, longitude: editLng as any });
      message.success('经纬度已更新');
      setLngLatOpen(false);
      load();
    } catch {
      message.error('更新失败');
    } finally {
      setLngLatSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!venue) return <Card>场地不存在</Card>;

  const st = statusMap[venue.status] || { text: venue.status, color: 'default' };
  const photos = Array.isArray(venue.photos) ? venue.photos : [];

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="link"
        onClick={() => navigate('/venues')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card title="场地信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="名称">{venue.name}</Descriptions.Item>
          <Descriptions.Item label="场地主">
            {venue.owner?.phone || '-'}
            {venue.owner?.nickname ? ` (${venue.owner.nickname})` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>
            {venue.address}
          </Descriptions.Item>
          <Descriptions.Item label="面积">
            {venue.area ? `${venue.area} m²` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="交通信息">
            {venue.trafficInfo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="经纬度">
            <Space>
              <EnvironmentOutlined style={{ color: '#2563EB' }} />
              <span>
                {venue.latitude && venue.longitude
                  ? `${Number(venue.longitude).toFixed(6)}, ${Number(venue.latitude).toFixed(6)}`
                  : '未设置'}
              </span>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={openLngLatEdit}
              >
                修改
              </Button>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="审核状态">
            <Tag color={st.color}>{st.text}</Tag>
            {venue.auditRemark && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                备注：{venue.auditRemark}
              </span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(venue.createdAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        {/* 地图预览 */}
        {venue.latitude && venue.longitude && AMAP_KEY && (
          <div style={{ marginTop: 16 }}>
            <h4><EnvironmentOutlined /> 地图位置</h4>
            <AmapPreview
              lat={Number(venue.latitude)}
              lng={Number(venue.longitude)}
              name={venue.name}
              amapKey={AMAP_KEY}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              经度: {Number(venue.longitude).toFixed(6)}  |  纬度: {Number(venue.latitude).toFixed(6)}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>场地照片</h4>
            <Space wrap>
              {photos.map((url: string, i: number) => {
                const src = url.startsWith('http') ? url : `${API_BASE}${url}`;
                return <Image key={i} width={140} src={src} />;
              })}
            </Space>
          </div>
        )}
      </Card>

      {venue.status === 'pending' && (
        <Card title="审核操作" style={{ marginBottom: 16 }}>
          <Space>
            <Button type="primary" onClick={handleApprove}>
              审核通过
            </Button>
            <Button danger onClick={() => setRejectOpen(true)}>
              驳回
            </Button>
          </Space>
        </Card>
      )}

      <Card
        title="线下考察"
        style={{ marginBottom: 16 }}
        extra={
          venue.isSiteVisited ? (
            <Tag color="green">已考察</Tag>
          ) : (
            <Button type="primary" size="small" onClick={() => setVisitOpen(true)}>
              标记已考察
            </Button>
          )
        }
      >
        {venue.isSiteVisited ? (
          <Descriptions column={2}>
            <Descriptions.Item label="考察日期">
              {venue.siteVisitDate
                ? new Date(venue.siteVisitDate).toLocaleDateString()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="考察备注">
              {venue.siteVisitNote || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <p style={{ color: '#999' }}>尚未进行线下考察</p>
        )}
      </Card>

      <Card title="教室管理">
        <ClassroomManager venueId={venue.id} />
      </Card>

      <Modal
        title="驳回场地"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={handleReject}
      >
        <Input.TextArea
          rows={3}
          placeholder="请输入驳回原因"
          value={rejectRemark}
          onChange={(e) => setRejectRemark(e.target.value)}
        />
      </Modal>

      <Modal
        title="标记线下考察"
        open={visitOpen}
        onCancel={() => setVisitOpen(false)}
        onOk={handleSiteVisit}
      >
        <Input.TextArea
          rows={3}
          placeholder="考察备注（可选）"
          value={visitNote}
          onChange={(e) => setVisitNote(e.target.value)}
        />
      </Modal>

      <Modal
        title="修改经纬度"
        open={lngLatOpen}
        onCancel={() => setLngLatOpen(false)}
        onOk={handleLngLatSave}
        confirmLoading={lngLatSaving}
      >
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>经度</div>
            <InputNumber
              value={editLng}
              onChange={(v) => setEditLng(v)}
              step={0.000001}
              precision={6}
              placeholder="如 120.155100"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>纬度</div>
            <InputNumber
              value={editLat}
              onChange={(v) => setEditLat(v)}
              step={0.000001}
              precision={6}
              placeholder="如 30.274100"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#999' }}>
          可通过高德地图拾取坐标系统获取经纬度。
          <a href="https://lbs.amap.com/tools/picker" target="_blank" rel="noreferrer">
            点此查询
          </a>
        </div>
      </Modal>
    </div>
  );
}
