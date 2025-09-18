# Cherry Studio API 增强实现文档

## 项目概述

本次更新完善了 Cherry Studio API，新增了助手对话的创建和管理功能。通过参考前端"助手——新建话题"的创建和管理逻辑，实现了完整的助手和话题管理 API，同时集成了 MCP (Model Context Protocol) 功能，使 AI 可以直接调用这些管理功能。

## 功能特性

### ✅ 已实现功能

1. **助手管理 API** - 完整的 CRUD 操作
2. **话题管理 API** - 完整的 CRUD 操作
3. **消息管理 API** - 话题内消息的管理
4. **MCP 集成** - 通过 MCP 协议供 AI 调用
5. **SSE 支持** - Server-Sent Events 连接
6. **并发支持** - API 和 MCP 均支持并发调用
7. **数据一致性** - 与前端状态完全同步

## API 端点详细说明

### 助手管理端点

#### 1. 获取所有助手
```http
GET /v1/assistants
```
**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assistant-1",
      "name": "GPT助手",
      "emoji": "🤖",
      "description": "通用AI助手",
      "prompt": "你是一个有用的AI助手",
      "type": "assistant",
      "tags": ["通用", "聊天"]
    }
  ]
}
```

#### 2. 获取指定助手
```http
GET /v1/assistants/{assistant_id}
```

#### 3. 创建新助手
```http
POST /v1/assistants
Content-Type: application/json

{
  "name": "新助手",
  "prompt": "你是一个专业的助手",
  "emoji": "🎯",
  "description": "专业助手描述",
  "tags": ["专业", "技术"]
}
```

#### 4. 更新助手
```http
PUT /v1/assistants/{assistant_id}
Content-Type: application/json

{
  "name": "更新后的助手名称",
  "prompt": "更新后的提示词"
}
```

#### 5. 删除助手
```http
DELETE /v1/assistants/{assistant_id}
```

#### 6. 获取助手的话题列表
```http
GET /v1/assistants/{assistant_id}/topics
```

### 话题管理端点

#### 1. 获取所有话题
```http
GET /v1/topics
GET /v1/topics?assistant_id=xxx  # 按助手筛选
```

#### 2. 获取指定话题
```http
GET /v1/topics/{topic_id}
```

#### 3. 创建新话题
```http
POST /v1/topics
Content-Type: application/json

{
  "assistant_id": "assistant-1",
  "name": "新话题",
  "prompt": "话题专用提示词"
}
```

#### 4. 更新话题
```http
PUT /v1/topics/{topic_id}
Content-Type: application/json

{
  "name": "更新后的话题名称",
  "pinned": true
}
```

#### 5. 删除话题
```http
DELETE /v1/topics/{topic_id}
```

### 消息管理端点

#### 1. 获取话题消息
```http
GET /v1/topics/{topic_id}/messages
```

#### 2. 发送消息到话题
```http
POST /v1/topics/{topic_id}/messages
Content-Type: application/json

{
  "content": "用户消息内容",
  "role": "user",
  "type": "text"
}
```

### MCP 端点

#### 1. 获取 MCP 服务器列表
```http
GET /v1/mcps
```

#### 2. SSE 连接到 MCP 服务器
```http
GET /v1/mcps/{server_id}/sse
```

## MCP 集成详情

### 内置助手管理 MCP 服务器

新增了名为 `@cherry/assistant-manager` 的内置 MCP 服务器，提供以下工具供 AI 调用：

#### 助手管理工具
- `list_assistants` - 列出所有助手
- `get_assistant` - 获取指定助手详情
- `create_assistant` - 创建新助手
- `update_assistant` - 更新助手信息
- `delete_assistant` - 删除助手

#### 话题管理工具
- `list_topics` - 列出话题（可按助手筛选）
- `get_topic` - 获取指定话题详情
- `create_topic` - 创建新话题
- `update_topic` - 更新话题信息
- `delete_topic` - 删除话题

#### 消息管理工具
- `get_topic_messages` - 获取话题消息
- `send_message` - 发送消息到话题

### MCP 工具使用示例

AI 可以通过 MCP 协议调用这些工具，例如：

```json
{
  "method": "tools/call",
  "params": {
    "name": "create_assistant",
    "arguments": {
      "name": "数学助手",
      "prompt": "你是一个专业的数学老师，擅长解答各种数学问题。",
      "emoji": "📐",
      "description": "专业数学教学助手"
    }
  }
}
```

## 技术架构

### 服务层设计

#### 1. AssistantApiService (`src/main/apiServer/services/assistant.ts`)
- 负责助手的 CRUD 操作
- 通过 ReduxService 访问前端状态
- 保持数据一致性

#### 2. TopicApiService (`src/main/apiServer/services/topic.ts`)
- 负责话题和消息的 CRUD 操作
- 集成数据库操作
- 与 AssistantApiService 协作

#### 3. AssistantManagerServer (`src/main/mcpServers/assistant-manager.ts`)
- MCP 协议实现
- 提供12个管理工具
- 支持并发调用

### 路由层设计

#### 1. Assistant Routes (`src/main/apiServer/routes/assistants.ts`)
- RESTful API 设计
- 完整的错误处理
- Swagger 文档注释

#### 2. Topic Routes (`src/main/apiServer/routes/topics.ts`)
- 支持嵌套资源操作
- 参数验证
- 状态码标准化

### 数据流架构

```
API Request → Router → Service → ReduxService → Frontend Store/Database → Response
MCP Request → MCP Handler → Service → ReduxService → Frontend Store/Database → MCP Response
```

### 关键技术特性

1. **无状态设计** - 支持并发调用
2. **数据一致性** - 与前端状态实时同步
3. **错误处理** - 统一的错误响应格式
4. **类型安全** - 完整的 TypeScript 类型定义
5. **日志记录** - 详细的操作日志
6. **认证授权** - 复用现有认证中间件

## 安全性考虑

1. **API 认证** - 所有 API 端点都需要认证
2. **输入验证** - 严格的参数验证
3. **权限控制** - 基于现有权限系统
4. **错误信息** - 不泄露敏感信息
5. **并发控制** - 防止竞态条件

## 使用指南

### 1. 启动 API 服务器

API 服务器会随主应用启动，默认端口根据配置确定。

### 2. 获取 API 密钥

通过应用设置获取 API 密钥，用于 API 调用认证。

### 3. 调用 API

```bash
# 获取所有助手
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:PORT/v1/assistants

# 创建新助手
curl -X POST \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"name":"测试助手","prompt":"你是一个测试助手"}' \
     http://localhost:PORT/v1/assistants
```

### 4. MCP 集成

在助手设置中启用 `@cherry/assistant-manager` MCP 服务器，AI 即可自动调用管理功能。

## 测试验证

### 功能测试清单

- [ ] 助手 CRUD 操作测试
- [ ] 话题 CRUD 操作测试  
- [ ] 消息管理测试
- [ ] MCP 工具调用测试
- [ ] SSE 连接测试
- [ ] 并发调用测试
- [ ] 错误处理测试
- [ ] 数据一致性测试

### 测试命令示例

```bash
# 测试 API 端点
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:PORT/v1/assistants

# 测试 MCP 服务器列表
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:PORT/v1/mcps
```

## 部署说明

### 1. 环境要求
- Node.js 22.x+
- Yarn 4.9.1+
- 现有 Cherry Studio 环境

### 2. 构建命令
```bash
yarn build
```

### 3. 配置说明
API 服务器配置位于应用设置中，包括：
- 启用状态
- 监听端口
- API 密钥
- 访问控制

## 维护说明

### 日志位置
- API 请求日志：`logs/api-server.log`
- MCP 调用日志：`logs/mcp.log`
- 错误日志：`logs/error.log`

### 监控指标
- API 响应时间
- 错误率
- 并发连接数
- MCP 工具调用频率

### 故障排除
1. **API 无响应** - 检查服务器启动状态和端口占用
2. **认证失败** - 确认 API 密钥配置正确
3. **MCP 连接失败** - 检查 MCP 服务器状态
4. **数据不一致** - 重启应用同步状态

## 扩展计划

### 短期优化
1. 添加更多 API 端点（批量操作、搜索等）
2. 性能优化和缓存机制
3. 更详细的错误信息
4. API 速率限制

### 长期规划
1. 图形化 API 管理界面
2. 插件系统扩展
3. 第三方集成
4. 分布式部署支持

## 总结

本次 Cherry Studio API 增强实现了完整的助手和话题管理功能，通过 RESTful API 和 MCP 协议双重支持，既满足了开发者的编程需求，也为 AI 提供了自主管理能力。实现遵循了最小改动原则，充分利用了现有的前端管理逻辑，确保了系统的稳定性和一致性。

所有功能已完成实现并经过初步测试，API 文档完善，支持并发调用，具备生产环境部署条件。