# 换菜权重远端配置灰度/回滚 SOP

## 1. 范围

适用于 Home 页“换一道”策略权重（swap weights）远端配置发布。

- 目标配置入口：`home:swap_weights_remote_enabled` + `home:swap_weights_remote_url`
- 生效逻辑：
  1. 远端开关开启且 URL 非空时尝试拉取远端配置
  2. 远端失败/超时自动降级（本地覆盖 > 默认）

## 2. 灰度发布步骤

1. **准备配置文件**
   - 使用 JSON，支持：
     - `all` 公共权重
     - `A` / `B` 分桶权重
   - 示例：

```json
{
  "all": { "category": 260, "time": 210 },
  "A": { "preference": 180 },
  "B": { "preference": 230 }
}
```

2. **开发态验证**
   - 打开 Home 页开发态调试面板
   - 设置远端 URL
   - 开启“远端配置”
   - 点击“应用”并确认 `swapConfigSource=remote`

3. **小流量观察（建议 5%~10%）**
   - 关注指标：
     - `swap_success_rate`
     - `avg_quality_score`
     - 事件维度：`experimentBucket`, `swapConfigSource`

4. **扩大流量**
   - 指标稳定后逐步扩大
   - 每次放量间隔至少 30 分钟并复核趋势

## 3. 监控清单

- `recommend_swap_click` 与 `swap_success` 量级关系（避免异常偏离）
- `swap_success_rate` 是否显著下降
- `swapConfigSource=default/local` 占比是否异常飙升（代表远端失效）
- 前端错误日志：远端请求失败、超时

## 4. 回滚 SOP

### 快速回滚（推荐）

1. 在调试面板关闭“远端配置”
2. 点击“应用”
3. 立即观察 `swapConfigSource` 回落为 `local/default`

### 强制恢复默认

1. 点击“一键恢复默认”
2. 确认远端开关关闭、URL 清空
3. 刷新 Home 后验证权重来源不再为 `remote`

## 5. 事故复盘最低项

- 影响时间窗口
- 受影响 bucket（A/B）
- 指标波动（swap_success_rate、qualityScore）
- 根因：配置内容问题 / 网络问题 / 解析问题
- 后续动作：增加预发验证、阈值告警、自动回滚条件
