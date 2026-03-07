# OneDish 用户自定义 AI 配置 - 技术方案

> Version: 1.0
> Date: 2026-03-07

---

## 1. 需求概述

允许用户配置自己的 AI API Key，系统优先使用用户的 AI，节省平台成本。

### 支持的 AI 提供商

| 分类 | 提供商 | 代码 |
|------|--------|------|
| 国际 | OpenAI | `openai` |
| | Anthropic (Claude) | `claude` |
| | Google Gemini | `gemini` |
| 国内 | MiniMax | `minimax` |
| | 字节 (豆包) | `doubao` |
| | 百度 (文心一言) | `wenxin` |
| | 阿里 (通义千问) | `tongyi` |
| | 腾讯 (混元) | `hunyuan` |
| | 智谱 (ChatGLM) | `zhipu` |
| | Kimi (Moonshot) | `kimi` |

---

## 2. 数据模型

### 2.1 数据库表

```sql
CREATE TABLE user_ai_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'openai','claude','gemini','minimax','doubao',
    'wenxin','tongyi','hunyuan','zhipu','kimi'
  )),
  api_key_encrypted TEXT NOT NULL,
  base_url TEXT,
  model TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_name TEXT,
  monthly_limit_tokens INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);
```

### 2.2 TypeScript 类型

```typescript
export type AIProvider = 
  | 'openai' | 'claude' | 'gemini'
  | 'minimax' | 'doubao' | 'wenxin' 
  | 'tongyi' | 'hunyuan' | 'zhipu' | 'kimi';

export interface UserAIConfig {
  id: string;
  user_id: string;
  provider: AIProvider;
  api_key_encrypted: string;
  base_url?: string;
  model?: string;
  is_active: boolean;
  display_name?: string;
  monthly_limit_tokens?: number;
  created_at: Date;
  updated_at: Date;
}

// API 返回给前端时脱敏
export interface UserAIConfigSafe {
  id: string;
  provider: AIProvider;
  display_name: string;
  model?: string;
  is_active: boolean;
  created_at: string;
  key_preview: string;  // 如 "sk-...abcd"
}
```

---

## 3. 安全性设计

### 3.1 加密方案

```typescript
// 加密
const ENCRYPTION_KEY = process.env.AI_CONFIG_ENCRYPTION_KEY; // 至少32位
const cipher = crypto.createCipher('aes-256-gcm', ENCRYPTION_KEY);
let encrypted = cipher.update(apiKey, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag();

// 解密
const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, authTag);
let decrypted = decipher.update(encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');
```

### 3.2 安全规则

| 规则 | 说明 |
|------|------|
| 日志脱敏 | 所有日志中 `api_key` 替换为 `***` |
| 响应隐藏 | API 返回不包含完整 key |
| 内存安全 | 解密后仅在请求时使用，不持久化 |
| 传输安全 | 全站 HTTPS |

---

## 4. 后端实现

### 4.1 目录结构

```
backend/src/
  services/
    ai-config.service.ts      # 用户 AI 配置 CRUD
    ai-router.service.ts     # AI 请求路由（用户配置优先）
  controllers/
    ai-config.controller.ts   # REST API
  routes/
    ai-config.routes.ts
  middleware/
    encryption.middleware.ts # 加密/解密中间件
```

### 4.2 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/ai-configs | 获取用户所有配置 |
| POST | /api/v1/ai-configs | 添加新配置 |
| PUT | /api/v1/ai-configs/:id | 更新配置 |
| DELETE | /api/v1/ai-configs/:id | 删除配置 |
| POST | /api/v1/ai-configs/:id/test | 测试连接 |

### 4.3 AI 路由逻辑

```typescript
async function generateWithUserAI(params: {
  userId: string;
  prompt: string;
  serviceType: 'baby-version' | 'meal-plan';
}) {
  // 1. 查找用户活跃配置
  const userConfig = await aiConfigService.getActiveConfig(userId);
  
  if (userConfig) {
    // 2. 使用用户配置
    return await callAIWithUserKey(userConfig, params);
  } else {
    // 3. 使用系统默认
    return await callAIWithSystemKey(params);
  }
}
```

---

## 5. 前端实现

### 5.1 设置入口

**位置**: 个人中心 → AI 设置

### 5.2 页面设计

```
┌─────────────────────────────────────────────┐
│  AI 配置                                      │
├─────────────────────────────────────────────┤
│                                              │
│  [+ 添加 AI]                                 │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ 🔵 OpenAI                               ││
│  │ 我的 GPT-4 (激活中)                     ││
│  │ sk-4...abcd  |  已测试 ✓                ││
│  │ [编辑] [删除] [测试]                     ││
│  └─────────────────────────────────────────┘│
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ 🟢 MiniMax                              ││
│  │ 备用 API                                ││
│  │ sk-8...wxyz  |  未测试                   ││
│  │ [编辑] [删除] [测试]                     ││
│  └─────────────────────────────────────────┘│
│                                              │
└─────────────────────────────────────────────┘
```

### 5.3 添加/编辑弹窗

```
┌─────────────────────────────────────────────┐
│  添加 AI 配置                                │
├─────────────────────────────────────────────┤
│  提供商: [选择 ▼]                           │
│  显示名称: [如：我的 GPT-4]                  │
│  API Key: [输入框，带查看/隐藏切换]          │
│  Base URL: [可选，留空使用默认]               │
│  模型: [可选，如 gpt-4o]                      │
│                                              │
│           [取消]  [保存]                      │
└─────────────────────────────────────────────┘
```

### 5.4 前端组件

```
frontend/src/
  screens/settings/
    AISettingsScreen.tsx     # 主页面
  components/
    AIConfigCard.tsx         # 配置卡片
    AIConfigForm.tsx         # 添加/编辑表单
  hooks/
    useAIConfigs.ts          # API 调用
```

---

## 6. 实现计划

### Phase 1: 后端基础 (1-2天)
- [ ] 数据库迁移
- [ ] 加密/解密服务
- [ ] CRUD API
- [ ] AI 路由服务

### Phase 2: 前端 (1天)
- [ ] 设置页面
- [ ] 配置卡片
- [ ] 添加/编辑表单
- [ ] 测试连接功能

### Phase 3: 集成 (0.5天)
- [ ] 替换现有 AI 调用
- [ ] 用户选择使用哪个 AI

---

## 7. 环境变量

```bash
# 加密密钥（必须）
AI_CONFIG_ENCRYPTION_KEY=your-32-char-minimum-key

# 系统默认 AI（可选）
SYSTEM_DEFAULT_AI_PROVIDER=minimax
SYSTEM_DEFAULT_AI_API_KEY=your-api-key
```

---

## 8. 注意事项

1. **用户隐私**: API Key 仅用于调用 AI，不作他用
2. **成本控制**: 建议用户设置月度限额
3. **容错**: 用户 AI 失败时自动降级到系统默认
4. **兼容性**: 各大厂商 API 略有不同，需要为每个厂商写适配器
