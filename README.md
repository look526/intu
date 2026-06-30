# Intu（趣学坊）

这是一个聚焦线下兴趣教育场景的全栈平台项目，围绕“老师 + 场地 + 学员 + 课程”的资源组织与运营协同展开。项目以微信小程序承接学员侧的选课、试听预约、下单、课表查看、到课打卡、课后评价与学习笔记互动，以管理后台承接平台侧的教师/场地入驻审核、课程配置、班级组建、排课发布、订单确认、运营位配置和数据看板，形成从资源接入到教学交付再到用户沉淀的完整业务闭环。

结合当前实现，`Intu（趣学坊）` 不只是一个课程展示或教务管理示例，更接近一个线下兴趣教育的“资源调度中枢”：一端连接老师与场地供给，一端连接学员的发现、报名与学习过程，中间通过 NestJS + Prisma 后端统一管理课程、班级、课节、教室占用、地理位置打卡、消息通知、内容互动和运营配置，适合作为兴趣教育平台、社区课程平台、成人素质教育 SaaS 原型的参考实现。

仓库当前包含 3 个主要端：

- `intu-api`：NestJS 后端服务
- `admin`：React 管理后台
- `miniprogram`：微信小程序

适合用于：

- 兴趣教育 / 社区课程 / 成人素质教育类项目参考
- NestJS + Prisma + React + 微信小程序的全栈实践样例
- 中后台管理系统与小程序联动场景的业务原型

## 项目截图级概览

核心业务链路：

```text
教师/场地申请入驻
        ↓
管理员审核
        ↓
创建课程 / 班级 / 排课
        ↓
学员下单报名
        ↓
上课打卡 / 学分记录
        ↓
课后评价 / 发布学习笔记
```

### 微信小程序端

| 首页 | 选课 | 课程详情 |
|------|------|----------|
| <img src="screenshot/小程序首页.png" alt="小程序首页" width="220" /> | <img src="screenshot/小程序选课页.png" alt="小程序选课页" width="220" /> | <img src="screenshot/小程序-课程详情.png" alt="小程序课程详情" width="220" /> |

| 老师详情 | 学习中心 | 课表 |
|----------|----------|------|
| <img src="screenshot/小程序-老师详情.png" alt="小程序老师详情" width="220" /> | <img src="screenshot/小程序-学习-学习中心.png" alt="小程序学习中心" width="220" /> | <img src="screenshot/小程序-学习-课表.png" alt="小程序学习课表" width="220" /> |

| 我的班级 | 我的 |
|----------|------|
| <img src="screenshot/小程序-学习-班级.png" alt="小程序我的班级" width="220" /> | <img src="screenshot/小程序-我的.png" alt="小程序我的" width="220" /> |

### 管理后台端

| 首页数据看板 | 课程管理 |
|--------------|----------|
| <img src="screenshot/后台-首页.png" alt="后台首页数据看板" width="420" /> | <img src="screenshot/后台-课程管理.png" alt="后台课程管理" width="420" /> |

| 排课日历 | 班级管理 |
|----------|----------|
| <img src="screenshot/后台-排课.png" alt="后台排课日历" width="420" /> | <img src="screenshot/后台-班级管理.png" alt="后台班级管理" width="420" /> |

| 老师管理 | 场地管理 |
|----------|----------|
| <img src="screenshot/后台-老师管理.png" alt="后台老师管理" width="420" /> | <img src="screenshot/后台-场地管理.png" alt="后台场地管理" width="420" /> |

| 订单管理 | 试听管理 |
|----------|----------|
| <img src="screenshot/后台-订单管理.png" alt="后台订单管理" width="420" /> | <img src="screenshot/后台-试听管理.png" alt="后台试听管理" width="420" /> |

| 上课打卡管理 | 笔记管理 |
|--------------|----------|
| <img src="screenshot/后台-上课打卡管理.png" alt="后台上课打卡管理" width="420" /> | <img src="screenshot/后台-笔记管理.png" alt="后台笔记管理" width="420" /> |

## 项目结构

```text
intu/
├── admin/               # 管理后台（React + Vite + Ant Design）
├── deploy/              # Nginx 配置
├── docs/                # PRD、架构、功能说明、研发过程文档
├── intu-api/            # 后端服务（NestJS + Prisma + MySQL）
├── miniprogram/         # 微信小程序
├── task/                # 任务拆解与过程文件
├── test/                # 测试说明/脚本
├── docker-compose.yml   # 生产部署编排
├── deploy.sh            # 生产部署脚本
└── start.sh             # 本地开发一键启动脚本
```

## 技术栈

| 分层 | 技术 |
|------|------|
| 后端 | NestJS 11、Prisma 6、MySQL 8、JWT、Passport |
| 管理后台 | React 19、TypeScript 5、Vite 8、Ant Design 6、FullCalendar 6 |
| 小程序 | 微信小程序原生开发 |
| 部署 | Docker Compose、Nginx |

## 功能模块

### 后端

- `auth`：管理员登录、小程序登录、JWT 鉴权
- `student`：学员档案、学分、绑定关系
- `teacher`：教师档案、状态、评分、推荐位
- `course` / `course-category`：课程与分类管理
- `venue`：场地与教室管理
- `schedule`：排课、课表发布、冲突检测
- `class-group`：班级与分班管理
- `order`：报名下单、线下付款确认
- `checkin`：地理位置打卡、学分记录
- `review`：课后评价
- `note`：学习笔记、点赞、评论、收藏
- `trial-booking`：试听预约与跟进
- `notification`：站内通知、微信订阅消息
- `dashboard`：运营数据看板
- `system-config`：首页 Banner、金刚区、运营弹窗配置
- `teacher-application` / `venue-application`：入驻申请审核

### 管理后台

- Dashboard 数据总览
- 场地管理
- 课程与课程分类管理
- 教师管理
- 学员管理
- 班级管理
- 排课日历
- 订单管理
- 试听预约跟进
- 教师/场地申请审核
- 打卡 / 评价 / 笔记记录查看
- 首页运营位配置

### 微信小程序

- 首页内容展示
- 课程列表与课程详情
- 下单与订单列表
- 今日学习 / 我的班级
- 上课打卡
- 课后评价
- 学习笔记流、发布、收藏
- 个人中心
- 教师 / 场地入驻申请

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- MySQL 8+
- 微信开发者工具（运行小程序时需要）

### 1. 启动后端

```bash
cd intu-api
npm install
```

创建 `intu-api/.env`，至少补齐以下变量：

```env
DATABASE_URL="mysql://root:你的密码@127.0.0.1:3306/intu"
JWT_SECRET="replace-with-your-own-secret"
JWT_EXPIRES_IN="7d"
WECHAT_APPID=""
WECHAT_SECRET=""
WX_TPL_ORDER_PAID=""
WX_TPL_APPLICATION_RESULT=""
WX_TPL_CLASS_ASSIGNED=""
WX_TPL_CLASS_STARTED=""
WX_TPL_CHECKIN_SUCCESS=""
WX_TPL_CLASS_REMINDER=""
AMAP_KEY=""
AMAP_SECRET=""
```

然后初始化数据库并启动：

```bash
npx prisma db push
npx prisma db seed
npm run start:dev
```

默认监听：`http://localhost:3000`

### 2. 启动管理后台

```bash
cd admin
npm install
npm run dev
```

默认地址：`http://localhost:5173`

### 3. 启动微信小程序

使用微信开发者工具打开 `miniprogram/` 目录。

如果需要联调，请根据本地接口地址调整小程序内请求配置。

### 4. 一键启动本地开发环境

仓库根目录提供了开发脚本：

```bash
./start.sh
```

它会尝试同时启动：

- 后端：`http://localhost:3000`
- 管理后台：`http://localhost:5173`

## 默认种子数据

执行 `npx prisma db seed` 后，仓库会初始化一批演示数据，包括：

- 默认管理员账号
- 课程分类
- 测试教师
- 测试课程
- 测试学员
- 部分订单与系统配置

当前默认管理员账号为：

```text
手机号: 13800000000
密码: admin123
```

如果仓库公开发布，强烈建议在正式部署前修改默认账号密码，或在生产环境禁用这组演示凭据。

## Docker 部署

根目录提供了 `docker-compose.yml`、`deploy.sh` 和 `deploy/nginx.conf`，可以作为生产部署参考。

### 方式一：直接使用 Docker Compose

```bash
docker compose up -d --build
```

### 方式二：使用部署脚本

先配置根目录 `.env.production`，再执行：

```bash
chmod +x deploy.sh
./deploy.sh
```

部署完成后，Nginx 会：

- 提供管理后台静态页面
- 将 `/api/` 代理到后端服务
- 将 `/uploads/` 代理到后端静态文件目录

## 文档入口

- 产品与背景说明：[docs/about_intu.md](docs/about_intu.md)
- 产品需求文档：[docs/产品 PRD.md](<docs/产品 PRD.md>)
- 功能清单与业务流程：[docs/产品功能清单和关键业务流程图.md](<docs/产品功能清单和关键业务流程图.md>)
- 技术架构方案：[docs/技术架构方案.md](docs/技术架构方案.md)
- AI Coding 过程记录：[docs/AI Coding 过程.md](<docs/AI Coding 过程.md>)

## 当前开源准备状态

这个仓库已经具备完整项目结构与主要业务代码，但如果要面向公开社区发布，建议在发版前继续完成下面几项整理：

1. 统一子项目中的 license/package metadata。
2. 提供可直接使用的 `.env.example` / `.env.production.example`，降低首次运行门槛。
3. 清理不应提交的本地文件与敏感配置，尤其是实际密钥、测试环境配置、运行时上传文件和构建产物。
4. 将 `admin/README.md` 与 `intu-api/README.md` 从模板内容改成真实项目说明。

如果你准备正式开源，建议把这一版 README 作为项目首页，再继续补齐上面这些发布前项。

## 已知说明

- 小程序依赖微信开发者工具与对应小程序配置，仓库本身不包含可直接上线的小程序资质信息。
- 地理位置打卡、微信订阅消息等功能依赖外部平台配置，未配置时相关能力可能不可用。
- 生产环境不要直接使用示例中的默认密钥、默认密码或演示配置。

## License

本项目采用 Apache License 2.0 开源协议。

完整许可证文本见 [LICENSE](LICENSE)。


## 联系我
 <img src="screenshot/联系我.jpg" alt="后台首页数据看板" width="420" /> 