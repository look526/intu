import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  Upload,
  Button,
  message,
  Image,
  Space,
  Spin,
} from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getCourse,
  createCourse,
  updateCourse,
  uploadFile,
} from '../../services/course';
import { getCategories, type CourseCategory } from '../../services/courseCategory';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function CourseForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [form] = Form.useForm();
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; realName: string }[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
    import('../../services/teacher').then((mod) =>
      mod.getTeacherSimpleList().then(setTeachers),
    );
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      getCourse(id)
        .then((data) => {
          form.setFieldsValue({
            name: data.name,
            categoryId: data.categoryId,
            teacherId: data.teacherId,
            totalHours: data.totalHours,
            description: data.description,
          });
          setCoverUrl(data.coverImage);
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, form]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setCoverUrl(res.url);
      message.success('上传成功');
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false; // prevent antd default upload
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const data = { ...values, coverImage: coverUrl };
      if (isEdit && id) {
        await updateCourse(id, data);
        message.success('更新成功');
      } else {
        await createCourse(data);
        message.success('创建成功');
      }
      navigate('/courses');
    } finally {
      setSaving(false);
    }
  };

  const coverSrc = coverUrl
    ? coverUrl.startsWith('http')
      ? coverUrl
      : `${API_BASE}${coverUrl}`
    : null;

  return (
    <Spin spinning={loading}>
      <Card
        title={
          <span>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/courses')}
              style={{ marginRight: 8 }}
            />
            {isEdit ? '编辑课程' : '新建课程'}
          </span>
        }
      >
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item name="name" label="课程名称" rules={[{ required: true, message: '请输入课程名称' }]}>
            <Input placeholder="请输入课程名称" maxLength={100} />
          </Form.Item>

          <Form.Item name="categoryId" label="课程分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select
              placeholder="请选择分类"
              options={categories.map((c) => ({ label: `${c.icon || ''} ${c.name}`, value: c.id }))}
            />
          </Form.Item>

          <Form.Item name="teacherId" label="授课教师" rules={[{ required: true, message: '请选择教师' }]}>
            <Select
              placeholder="请选择教师"
              options={teachers.map((t) => ({ label: t.realName, value: t.id }))}
            />
          </Form.Item>

          <Form.Item name="totalHours" label="总课时">
            <InputNumber min={1} placeholder="请输入课时数" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="课程描述">
            <Input.TextArea rows={4} placeholder="请输入课程描述" maxLength={2000} showCount />
          </Form.Item>

          <Form.Item label="封面图片">
            <Space orientation="vertical">
              {coverSrc && (
                <Image src={coverSrc} width={240} height={160} style={{ objectFit: 'cover', borderRadius: 8 }} />
              )}
              <Upload
                showUploadList={false}
                accept="image/*"
                beforeUpload={(file) => handleUpload(file as unknown as File)}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {coverUrl ? '更换封面' : '上传封面'}
                </Button>
              </Upload>
            </Space>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSubmit} loading={saving}>
                {isEdit ? '保存修改' : '创建课程'}
              </Button>
              <Button onClick={() => navigate('/courses')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Spin>
  );
}
