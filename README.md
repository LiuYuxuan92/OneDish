# 简家厨 (JianJiaChu)

家庭餐厨助手应用 - 一菜两吃，全家共享

## 项目简介

简家厨是一款专为家庭设计的菜谱应用，提供以下核心功能：

- **一菜两吃配对菜谱**：一道菜同时满足大人和宝宝的口味需求
- **智能周计划**：根据家庭情况自动生成一周餐食计划
- **购物清单**：根据菜谱自动生成采购清单
- **烹饪计时器**：辅助烹饪过程的计时工具
- **食材库存管理**：管理家中食材，提醒即将过期

## 技术栈

### 后端 (backend/)
- **Node.js** + **TypeScript**
- **Express.js** 框架
- **SQLite** 数据库 (开发环境)
- **Knex.js** 查询构建器

### 前端 (frontend/)
- **React Native** + **TypeScript**
- **Expo** 开发框架
- **React Navigation** 导航
- **TanStack Query** 数据获取

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd qinzicanhe
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
```

后端服务将在 http://localhost:3000 启动

### 3. 启动前端

```bash
cd frontend
npm install  # 或 yarn install
npx expo start --web
```

前端应用将在 http://localhost:8081 启动

## 项目结构

```
qinzicanhe/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── config/       # 配置文件
│   │   ├── controllers/  # 控制器
│   │   ├── middleware/   # 中间件
│   │   ├── routes/       # 路由
│   │   ├── services/     # 业务逻辑
│   │   └── database/     # 数据库迁移
│   └── package.json
├── frontend/             # 前端应用
│   ├── src/
│   │   ├── api/          # API 客户端
│   │   ├── components/   # UI 组件
│   │   ├── hooks/        # 自定义 Hooks
│   │   ├── navigation/   # 导航配置
│   │   ├── screens/      # 页面组件
│   │   └── styles/       # 主题样式
│   └── package.json
├── crawler/              # 数据爬虫
├── docs/                 # 项目文档
└── README.md
```

## API 文档

后端 API 基于 RESTful 设计：

- `GET /api/v1/recipes` - 获取菜谱列表
- `GET /api/v1/recipes/daily` - 获取今日推荐
- `GET /api/v1/recipes/:id` - 获取菜谱详情
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/guest` - 游客登录
- 更多 API 请参考后端代码

## 开发说明

### Windows 用户

项目提供了 Windows 批处理脚本快速启动：

- `start-backend.bat` - 启动后端
- `start-frontend.bat` - 启动前端

### 数据库

开发环境使用 SQLite，数据库文件为 `backend/dev.sqlite3`

运行迁移：
```bash
cd backend
npm run migrate
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
