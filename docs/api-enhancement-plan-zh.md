# Cherry Studio API 增强计划

## 项目需求
完善 Cherry Studio API，实现助手对话的创建和管理功能，参考前端"助手——新建话题"的创建和管理逻辑，实现以下功能：

1. 对话的创建和管理 API 接口
2. 在 /mcp 端口实现 SSE MCP 方法
3. 将助手创建话题封装成 MCP 供 AI 调用
4. 支持 API 和 MCP 的并发调用

## 当前 API 结构分析

### 现有端点
- `GET /` - API 信息和端点列表
- `GET /health` - 健康检查
- `GET /v1/models` - 模型列表
- `POST /v1/chat/completions` - 聊天完成 (兼容 OpenAI API)
- `GET /v1/mcps` - MCP 服务器列表
- `GET /v1/mcps/{server_id}` - MCP 服务器信息
- `ALL /v1/mcps/{server_id}/mcp` - MCP 服务器连接

### 现有助手和话题管理逻辑
- Assistant 数据结构：id, name, prompt, topics, type, model, settings 等
- Topic 数据结构：id, assistantId, name, createdAt, updatedAt, messages
- 前端使用 Redux store 管理状态
- 数据持久化到 Dexie 数据库
- 话题创建流程：getDefaultTopic → db.topics.add → addTopic → setActiveTopic

## 设计方案

### 1. 新增 API 端点

#### Assistant 管理端点
```
GET /v1/assistants - 获取所有助手列表（不包含完整对话内容）
GET /v1/assistants/{assistant_id} - 获取指定助手信息
POST /v1/assistants - 创建新助手
PUT /v1/assistants/{assistant_id} - 更新助手信息
DELETE /v1/assistants/{assistant_id} - 删除助手

GET /v1/assistants/{assistant_id}/topics - 获取助手的话题列表（不包含消息内容）
```

#### Topic 管理端点
```
GET /v1/topics - 获取所有话题列表（支持按助手筛选）
GET /v1/topics/{topic_id} - 获取指定话题信息
POST /v1/topics - 创建新话题
PUT /v1/topics/{topic_id} - 更新话题信息
DELETE /v1/topics/{topic_id} - 删除话题

GET /v1/topics/{topic_id}/messages - 获取话题的消息列表
POST /v1/topics/{topic_id}/messages - 向话题发送消息
```

### 2. MCP 集成方案

#### MCP Server 端点扩展
```
GET /v1/mcps/{server_id}/sse - SSE 连接端点
POST /v1/mcps/assistant-manager - 创建助手管理 MCP 服务
```

#### 内置 MCP 服务器
创建一个新的内置 MCP 服务器 `@cherry/assistant-manager`，提供以下工具：
- `create_assistant` - 创建新助手
- `list_assistants` - 列出助手
- `create_topic` - 创建话题
- `list_topics` - 列出话题
- `send_message` - 发送消息

### 3. 实现架构

#### API 服务层
创建新的服务文件：
- `src/main/apiServer/services/assistant.ts` - 助手管理服务
- `src/main/apiServer/services/topic.ts` - 话题管理服务
- `src/main/apiServer/routes/assistants.ts` - 助手 API 路由
- `src/main/apiServer/routes/topics.ts` - 话题 API 路由

#### MCP 集成
扩展现有 MCP 服务：
- `src/main/apiServer/services/mcp.ts` - 添加 SSE 支持
- `src/main/services/mcp/assistant-manager.ts` - 新建助手管理 MCP 服务器

#### 数据访问层
利用现有的数据结构和服务：
- 复用 Redux store 访问逻辑
- 复用数据库操作逻辑
- 保持与前端的数据一致性

### 4. 数据流设计

#### API 调用流程
```
API Request → Router → Service → ReduxService → Database/Store → Response
```

#### MCP 调用流程
```
MCP Request → MCP Handler → Assistant Manager → Service → Database/Store → MCP Response
```

### 5. 安全和并发考虑
- 所有 API 端点都需要认证（复用现有 auth middleware）
- 支持并发请求（无状态设计）
- 数据一致性（使用现有的 Redux 状态同步）
- 错误处理和日志记录

## 实现步骤

1. **第一阶段：API 基础设施**
   - 创建 Assistant 和 Topic 服务
   - 实现基础 CRUD 操作
   - 添加路由和中间件

2. **第二阶段：MCP 集成**
   - 扩展 MCP 服务支持 SSE
   - 创建助手管理 MCP 服务器
   - 实现 MCP 工具函数

3. **第三阶段：测试和优化**
   - API 端点测试
   - MCP 功能测试
   - 并发调用测试
   - 性能优化

4. **第四阶段：文档和部署**
   - 更新 API 文档
   - 更新端点列表
   - 部署验证

## 预期结果

实现后将提供：
1. 完整的助手和话题管理 API
2. MCP 集成的助手管理功能
3. 支持 AI 自动调用的工具集
4. 与前端功能完全一致的后端 API
5. 支持并发调用的稳定服务

这样既保持了最小改动原则，又充分利用了现有的助手和话题管理逻辑，实现了完整的 API 功能。