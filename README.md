# 🍬 魔法糖果工坊与甜点大赛系统

> 多人在线魔法世界的糖果工坊经营、配方研发、甜点竞技与交易社区系统

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-43853D?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Ant Design](https://img.shields.io/badge/Ant_Design-5.x-1677ff?logo=antdesign&logoColor=white)

</div>

---

## 🌟 功能特性

### 🏠 糖果工坊系统
- 六大主题风格工坊（星光/森林/海洋/火山/冰霜/彩虹）
- 三种可升级设备：熬糖台、搅拌碗、装饰台
- 工坊公开/私密设置，布局自定义

### 🌿 原料收集与熬糖制作
- **90+ 种魔法原料**：魔法花果、蜜糖浆、魔力结晶、糖粉、稀有蜜露五大类
- 五种品质：普通/优质/稀有/史诗/传说，各自基础数值不同
- **按顺序搭配熬制**：系统根据材料品质、搭配顺序、技能等级计算成品
- 属性：甜度值、魔力持续时间、稀有度分
- **词缀系统**：闪耀的/远古的/附魔的/天界的/神秘的/神圣的
- **特殊效果**：✨闪光、👻隐身、💋飞吻、⏰时停、🍀幸运、💖治愈
- 暴击系统：双倍产出 + 额外属性加成

### 📜 配方研发与调糖师等级
- 自定义研发新配方（名称、描述、原料搭配顺序、目标品质等）
- 消耗试糖纸 + 稀有蜜露，成功率受熟练度、设备、创意技能影响
- 失败返还 40% 原料
- **首席调糖师审批**新配方
- 五级调糖师晋升体系：新手 → 入门 → 熟练 → 专家 → 大师
- 高级晋升需首席审批

### 🏆 每日甜点大赛
- 每日自动开赛（10:00-20:00），随机主题
- 5 位专业评委团 + 1000~3000 观众规模
- 实时排行榜、事件流、分数历史曲线
- **技能干预**：撒糖粉（提升观众喜爱）、装饰（提升评委好感）
- 权重评分：评委分50% + 观众30% + 品质20%
- 多等级奖励（前30名有额外奖励），有限定甜点图纸

### 🛒 交易市场
- 上架糖果 / 配方（7天自动过期）
- **近7天均价智能建议**区间，5% 手续费
- **大额成交触发糖果节**（≥10000金币有概率），全服暴击率 +30%
- 全服成交公告（Socket 实时推送）

### 🏰 公会系统
- 50人公会，三级权限（会长/干部/成员）
- 捐献金币 + 原料，全员升级经验
- **联合工坊**（提升成功率）、**蜜糖农场**（提升产出+暴击）双建筑升级
- 每日农场收获（魔法花果/蜜糖浆/魔力结晶）
- 全员共享加成：熬糖成功率、原料产出、暴击率

### 📊 每周产业报告（可导出 PDF）
- 🗺️ 原料使用热力图（按小时×星期）
- 📈 TOP 排行榜（原料/糖果/玩家）
- 📉 大赛评分曲线
- 💰 交易价格走势（均价/最高/最低/成交量）
- 🎯 冠军糖果属性雷达图
- 一键生成 PDF 报告下载

### 🥇 全服排行榜
- **4 个榜单**：收藏度、大赛积分、公会贡献、公会综合
- 玩家可点击查看：工坊布局、技能档案、最近糖果、熬糖记录
- TOP3 颁奖台视觉效果

### ⚡ 高并发实时系统
- Socket.io 实时处理：大赛分数刷新、技能效果、全服公告、糖果节广播
- 在线玩家统计
- MongoDB 索引优化，支持数千玩家同时操作

---

## 📦 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Client)                             │
│   React 18 + TypeScript + Ant Design 5 + Vite + ECharts        │
│   Zustand (状态管理) + Socket.io-Client + Axios + React Router  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         RESTful API (JSON) + WebSocket
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                        后端 (Server)                             │
│   Node.js + Express + TypeScript                                │
│   Mongoose (ODM) + JWT + bcrypt + Socket.io + PDFKit           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                         MongoDB 6.x
                 (12 个核心集合 + 索引优化)
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 环境要求
- **Node.js** ≥ 18
- **MongoDB** ≥ 6.0（或使用 Docker）
- **npm** ≥ 9 或 **yarn**

### 方式一：一键脚本安装
```bash
# Windows
install.bat

# Linux / macOS
chmod +x install.sh
./install.sh
```

### 方式二：手动安装

#### 1️⃣ 启动 MongoDB
```bash
# 方式 A: Docker
docker run -d -p 27017:27017 --name mongo-candy mongo

# 方式 B: 本地安装 (Windows)
# 下载 https://www.mongodb.com/try/download/community
# 启动服务: net start MongoDB
```

#### 2️⃣ 安装依赖
```bash
# 安装前后端依赖
npm install -D concurrently
cd server && npm install && cd ..
cd client && npm install && cd ..

# 或使用 workspace (根目录)
npm run install:all
```

#### 3️⃣ 初始化配置
```bash
copy server\.env.example server\.env
# (Linux: cp server/.env.example server/.env)
```

#### 4️⃣ 填充种子数据
```bash
# 生成 90 种魔法原料 + 6 个默认测试账号
npm run seed --workspace=server
```

#### 5️⃣ 启动服务
```bash
# 方案一：同时启动前后端 (推荐)
npm run dev

# 方案二：分别启动
# 终端1: 启动后端 API (端口 3001)
npm run dev:server

# 终端2: 启动前端 Vite (端口 5173)
npm run dev:client
```

#### 6️⃣ 访问应用
- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api/health
- Socket：ws://localhost:3001

---

## 🎮 默认测试账号

| 角色 | 账号 | 密码 | 说明 |
|------|------|------|------|
| 👑 首席调糖师 | `chief` | `chief123` | 可审批配方、晋升申请 |
| 🎮 玩家1号 | `player1` | `123456` | 已初始化原料和技能 |
| 🎮 玩家2号 | `player2` | `123456` | 已初始化原料和技能 |
| 🎮 玩家3号 | `player3` | `123456` | 已初始化原料和技能 |
| 🎮 玩家4号 | `player4` | `123456` | 已初始化原料和技能 |
| 🎮 玩家5号 | `player5` | `123456` | 已初始化原料和技能 |

---

## 📁 项目目录结构

```
magic-candy-workshop/
├── client/                          # 前端 React 应用
│   ├── src/
│   │   ├── layouts/                 # 主布局 (MainLayout)
│   │   ├── pages/                   # 12 个业务页面
│   │   │   ├── LoginPage.tsx        # 登录注册
│   │   │   ├── DashboardPage.tsx    # 总览大厅
│   │   │   ├── WorkshopPage.tsx     # 工坊管理
│   │   │   ├── CandyPotPage.tsx     # 熬糖台 (核心玩法)
│   │   │   ├── InventoryPage.tsx    # 原料背包
│   │   │   ├── RecipePage.tsx       # 配方研发
│   │   │   ├── ContestPage.tsx      # 甜点大赛 (实时)
│   │   │   ├── TradePage.tsx        # 交易市场
│   │   │   ├── GuildPage.tsx        # 糖果公会
│   │   │   ├── ReportPage.tsx       # 产业报告 + PDF
│   │   │   ├── LeaderboardPage.tsx  # 排行榜
│   │   │   └── ProfilePage.tsx      # 玩家档案
│   │   ├── store/                   # Zustand 状态管理
│   │   ├── utils/                   # API 请求 / Socket / 常量
│   │   └── styles/                  # 全局样式和动效
│   └── vite.config.ts
│
├── server/                          # 后端 Node.js 应用
│   └── src/
│       ├── config/                  # 数据库连接 / 常量枚举
│       ├── middleware/              # JWT 鉴权中间件
│       ├── models/                  # 12 个 Mongoose 数据模型
│       │   ├── Player.ts            # 玩家 (技能/等级/经验)
│       │   ├── Workshop.ts          # 工坊 (设备/风格/布局)
│       │   ├── Material.ts          # 原料 (90+ 种)
│       │   ├── Candy.ts             # 成品糖果 (词缀/特效)
│       │   ├── Recipe.ts            # 配方 (审批流程)
│       │   ├── Contest.ts           # 大赛 (评委/参与者/分数)
│       │   ├── Trade.ts             # 交易 (建议价/糖果节)
│       │   ├── Guild.ts             # 公会 (建筑/加成)
│       │   ├── Inventory.ts         # 背包
│       │   ├── WeeklyReport.ts      # 周报告 (热力图/走势)
│       │   ├── PlayerHistory.ts     # 历史记录
│       │   └── GlobalState.ts       # 糖果节/全局状态
│       ├── services/                # 9 个核心业务 Service
│       │   ├── CandyService.ts      # 熬糖算法
│       │   ├── RecipeService.ts     # 配方研发+审批
│       │   ├── ContestService.ts    # 大赛匹配+评分
│       │   ├── TradeService.ts      # 交易+建议价
│       │   ├── GuildService.ts      # 公会+建筑升级
│       │   ├── ReportService.ts     # 报告生成+PDF
│       │   ├── LeaderboardService.ts
│       │   └── MaterialService.ts
│       ├── routes/                  # 7 组 RESTful API
│       │   ├── auth.ts              # 注册/登录/资料
│       │   ├── workshop.ts          # 工坊 CRUD
│       │   ├── candy.ts             # 熬糖/配方/背包
│       │   ├── contest.ts           # 大赛 API
│       │   ├── trade.ts             # 交易 API
│       │   ├── guild.ts             # 公会 API
│       │   └── report.ts            # 报告+排行榜 API
│       ├── socket.ts                # Socket.io 实时通信层
│       ├── scripts/seedData.ts      # 种子数据脚本
│       └── app.ts                   # 应用入口
│
├── install.bat / install.sh         # 一键安装脚本
└── package.json                     # 根工作区配置
```

---

## 🧪 核心算法说明

### 🍬 熬糖计算模型
```
最终甜度 = Σ(原料甜度 × 品质系数)
          × 顺序加成(1 + 原料种类数×5%)
          × 设备加成(1 + 熬糖台等级×5% + 搅拌碗等级×3%)
          × 技能加成(1 + 品味/200 + 技巧/250 + 创意/300)
          × (暴击时 ×1.3)

词缀触发概率 = AFFIX_CHANCES[品质] × (1 + 品味/150)
  common 2% → legendary 45%

特效触发概率 = 品质等级×8% + 词缀数×5%

最终成功率 = 0.6 + 平均品质×5% + 技巧/300 + 公会加成 + 糖果节加成
  上限：98%
```

### 🎯 大赛评分模型
```
选手总分 = 评委平均分×50% + 观众喜爱×30% + 糖果品质×20%

评委打分：
  基础分 ~ Normal(65, 15)
  + 特效数 × 评委偏好系数
  + 词缀数 × 3
  × (1 - 严格度×0.3)
  + 装饰技能加成

观众喜爱：
  初始 ~ Random(0, 50)
  + 撒糖粉技能(每次 +20~50，限5次)
  + 稀有度 / 20
```

### 💰 交易建议价模型
```
近7日均价(AVG) = Σ成交价 / 样本数
糖果基础定价 = 稀有度×2 + 收藏度×0.5
配方基础定价 = 难度×200 + (成功率×500)

融合定价 = 0.7×AVG + 0.3×基础定价

建议区间: [0.85×融合定价, 1.25×融合定价]
```

---

## 🔧 常用命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务 |
| `npm run dev:server` | 启动后端 (端口 3001) |
| `npm run dev:client` | 启动前端 (端口 5173) |
| `npm run seed --workspace=server` | 填充种子数据 |
| `npm run build` | 构建生产版本 (前后端) |
| `npm run build:client` | 仅构建前端静态文件到 client/dist |
| `npm run build:server` | 仅构建后端到 server/dist |
| `npm run start:server` | 用 Node 启动构建后的后端 |

---

## 🛡️ 安全与高可用

- **JWT + bcrypt**：用户认证，盐值加密
- **5% 交易手续费**：防止金币通胀
- **原料返还机制**：研发失败返还40%，熬糖失败返还50%
- **MongoDB 索引**：常用查询字段均有索引，支持高并发
- **Socket 心跳**：自动重连，异常恢复

---

## 📜 License

MIT License - 本项目用于学习与演示，所有配方和数值均为虚拟设定。

---

<div align="center">

**Enjoy making magic candies! 🍬✨**

*Made with ❤️ using Node.js + React + MongoDB*

</div>
