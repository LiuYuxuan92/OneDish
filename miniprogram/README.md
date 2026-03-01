# OneDish 微信小程序 MVP

> 目录：`/root/.openclaw/workspace/OneDish/miniprogram`

这是一个最小可运行版本（MVP）的小程序骨架，用于快速演示：
- 今日推荐
- 菜谱列表 + 详情简版
- 购物清单（优先走后端，失败时降级本地清单）
- 共享入口占位（按钮 + 文案）

## 1. 目录结构

```bash
miniprogram/
├── app.js
├── app.json
├── app.wxss
├── project.config.json
├── sitemap.json
├── utils/
│   ├── api.js
│   ├── config.js
│   └── request.js
└── pages/
    ├── home/
    │   ├── home.js
    │   ├── home.json
    │   ├── home.wxml
    │   └── home.wxss
    ├── recipe/
    │   ├── recipe.js
    │   ├── recipe.json
    │   ├── recipe.wxml
    │   └── recipe.wxss
    └── plan/
        ├── plan.js
        ├── plan.json
        ├── plan.wxml
        └── plan.wxss
```

## 2. 对接后端 API（已接入）

默认 baseURL：
- `http://localhost:3000/api/v1`

已接入接口：
- 今日推荐：`GET /recipes/daily`
- 菜谱列表：`GET /recipes`
- 菜谱详情：`GET /recipes/:id`
- 购物清单（需 token）：`GET /shopping-lists`

### 一键换菜
当前后端未发现明确“换一道”专用接口，MVP 采用前端临时逻辑：
1. 拉取 `GET /recipes`（最多 30 条）
2. 过滤当前推荐
3. 随机取一个并尝试拉详情

后续建议在后端补充 `POST /recipes/swap` 或类似语义接口。

## 3. 运行方式

### 后端先启动
在 `OneDish/backend` 启动服务，确保 `http://127.0.0.1:3000/health` 可访问。

### 微信开发者工具导入
1. 打开微信开发者工具
2. 选择“导入项目”
3. 项目目录选择：`OneDish/miniprogram`
4. AppID 可先使用测试号/`touristappid`
5. 勾选“不校验合法域名”（开发环境）

## 4. 本地调试配置

在小程序「清单」页可直接填写并保存：
- `baseURL`：如 `http://127.0.0.1:3000/api/v1`
- `Bearer Token`：如需调用购物清单接口（后端鉴权接口返回）

保存后会写入本地 storage。

## 5. 说明与限制

- 购物清单接口需要认证 token；无 token 或调用失败会自动降级为本地清单。
- 共享能力目前仅放置入口占位，未调用分享 API。
- 页面样式为 MVP 极简风格，便于后续快速替换 UI。
