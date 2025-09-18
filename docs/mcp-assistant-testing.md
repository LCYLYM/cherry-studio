# Cherry Studio MCP 助手管理功能测试指南

本文档介绍如何测试新增的 MCP 助手管理功能。

## 快速测试

运行自动化测试脚本：
```bash
node /tmp/test_assistant_manager_mcp.js
```

## 手动测试 API 端点

### 1. 检查 API 状态
```bash
curl http://localhost:3000/health
```

### 2. 获取 API 信息
```bash
curl http://localhost:3000/
```

### 3. 列出 MCP 服务器
```bash
curl -H "Authorization: Bearer test-key" \
     http://localhost:3000/v1/mcps
```

### 4. 测试助手管理器 MCP 工具列表
```bash
curl -X POST \
     -H "Authorization: Bearer test-key" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     http://localhost:3000/v1/mcps/assistant-manager
```

### 5. 创建新对话
```bash
curl -X POST \
     -H "Authorization: Bearer test-key" \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": 2,
       "method": "tools/call",
       "params": {
         "name": "create_new_conversation",
         "arguments": {
           "name": "测试对话",
           "prompt": "你是一个测试助手"
         }
       }
     }' \
     http://localhost:3000/v1/mcps/assistant-manager
```

### 6. 测试 SSE 连接
```bash
curl -H "Authorization: Bearer test-key" \
     -H "Accept: text/event-stream" \
     http://localhost:3000/v1/mcps/assistant-manager/sse
```

## 预期结果

1. **健康检查** 应返回 `{"status":"ok"}`
2. **API 信息** 应包含新的 MCP 端点
3. **MCP 服务器列表** 应包含 assistant-manager
4. **工具列表** 应显示所有可用的助手管理工具
5. **创建对话** 应成功返回新话题信息
6. **SSE 连接** 应建立并发送心跳消息

## 故障排除

### 连接被拒绝
- 确保 Cherry Studio 正在运行
- 确保 API 服务器已启用
- 检查端口是否为 3000

### 认证错误
- 检查 Authorization 头是否正确
- 验证 API 密钥配置

### MCP 服务器未找到
- 确保 assistant-manager 在服务器列表中
- 检查内置服务器初始化逻辑