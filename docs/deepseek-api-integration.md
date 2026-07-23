# DeepSeek API 接入说明

PaperView 通过服务端调用 DeepSeek，浏览器、学生和导师都不会接触 API Key。

## 环境变量

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
AI_REVIEW_TIMEOUT_MS=180000
AI_REVIEW_MAX_OUTPUT_TOKENS=16000
```

截至 2026-07-23，DeepSeek 官方已提供 `deepseek-v4-flash` 和
`deepseek-v4-pro`。旧名称 `deepseek-chat`、`deepseek-reasoner` 将于
2026-07-24 停止使用，因此项目默认使用 `deepseek-v4-flash`。

## 已建立的调用链

1. 验证登录、课题组和论文访问权限。
2. 在消费 API 费用前检查本月三次成功评阅上限，并阻止并发重复请求。
3. 从私有 Supabase Storage 下载原始 PDF。
4. 在服务端逐页提取文字并保留页码；扫描件无文字时明确要求先 OCR。
5. 构造版本化 system/user prompt。
6. 调用 DeepSeek Chat Completions，关闭思考模式并启用 JSON Output。
7. 使用 Zod 对返回 JSON 做本地结构校验；空输出、截断和结构错误不会入库为成功评阅。
8. 保存服务商、实际模型、提示词版本、规范版本、原始结构化输出和错误状态。
9. 429、5xx、网络错误和偶发空输出最多自动重试一次；Key 错误和余额不足不重试。

## 填入 Key 后的检查

1. 只把 Key 写入 ECS 的服务端环境或 Sites Runtime Environment Variables。
2. 访问 `GET /api/ai-reviews`，应返回 `"configured": true`，但不会返回 Key。
3. 用一篇不含敏感数据的测试 PDF 发起一次评阅。
4. 检查页码证据、JSON 校验、数据库记录、耗时和余额扣费。
5. 再做同模型重复评阅与跨模型对比实验。

## 提示词之外仍需持续完成

- PDF/OCR：扫描版、双栏文本、公式、表格和图片信息可能无法完整提取。
- 结构校验：模型输出合法 JSON 不代表符合业务字段和枚举，必须二次校验。
- 费用控制：限制页数、文本量、输出长度、并发和每月成功次数。
- 可靠性：处理超时、限流、服务过载、空输出、截断和重复提交。
- 可复现性：保存模型、提示词、评分规范、原始输出、运行时间和输入 PDF 版本。
- 安全与隐私：Key 仅放服务端；日志不得记录 Key；论文会发送给第三方模型服务。
- 质量实验：同文同模型重复运行、跨模型一致性、扰动测试、人工样例校准和导师一致性。

官方参考：

- <https://api-docs.deepseek.com/guides/function_calling/>
- <https://api-docs.deepseek.com/guides/json_mode/>
- <https://api-docs.deepseek.com/quick_start/error_codes/>
- <https://api-docs.deepseek.com/quick_start/pricing/>
- <https://cdn.deepseek.com/policies/zh-CN/deepseek-privacy-policy.html>
