# OneDish 会员 / 支付 / AI 权益一期骨架

## 本次落地范围

- 新增后端订单、权益、AI 额度、AI 使用日志四张表
- 新增会员商品目录与订单创建服务
- 新增用户会员摘要接口
- 新增开发环境“手动确认支付成功”接口，方便联调
- 将 `宝宝版 AI 改写` 接到新的会员额度体系

## 商品模型

### 成长卡月卡
- 商品码：`growth_monthly_1990`
- 价格：`19.90`
- 时长：30 天
- 包含额度：
  - `ai_baby_recipe`：20 次
  - `weekly_plan_from_prompt`：8 次
  - `smart_recommendation`：30 次

### 成长卡季卡
- 商品码：`growth_quarterly_4900`
- 价格：`49.00`
- 时长：90 天
- 包含额度：
  - `ai_baby_recipe`：60 次
  - `weekly_plan_from_prompt`：24 次
  - `smart_recommendation`：90 次

### 宝宝版 AI 加油包
- 商品码：`ai_baby_pack_20_990`
- 价格：`9.90`
- 包含额度：
  - `ai_baby_recipe`：20 次

## 新接口

### 公开
- `GET /api/v1/billing/products`
- `GET /api/v1/billing/feature-matrix?platform=miniprogram|app|web`

### 需登录
- `GET /api/v1/billing/me/summary?platform=miniprogram|app|web`
- `POST /api/v1/billing/orders`

### 开发联调
- `POST /api/v1/billing/orders/:orderId/dev-confirm-paid`
- 仅开发环境可用，后续应替换为微信支付回调

## AI 扣额策略

- 当前已接入：`POST /api/v1/pairing/generate-ai`
- 优先使用登录用户的 `ai_baby_recipe` 额度
- 若没有会员额度，则回退到原有 `quotaService` 的通用 AI 配额
- 只有 AI 成功生成后，才真正扣减会员额度并记录 `ai_usage_logs`

## 功能矩阵约定

- 会员是账号级统一权益，不区分“小程序会员 / App 会员”
- `feature-matrix` 负责描述：某项功能是否会员专属、按次数还是按资格、各端展示强度
- 小程序可以看到部分 `upsell` 项，用于提示“App 可体验完整能力”
- App 端可直接消费 `full` 项展示完整会员能力

## 下一步建议

1. 接入微信支付统一下单和支付回调
2. 把 `generate-from-prompt` 接到 `weekly_plan_from_prompt` 额度
3. 小程序会员页改成读取 `/billing/products` 与 `/billing/me/summary`
4. 在个人中心展示剩余 AI 次数和到期时间
