# Cherry Studio API - Assistant and Topic Management

This document describes the new assistant and topic management APIs added to Cherry Studio.

## Overview

The Cherry Studio API has been enhanced with new endpoints for managing assistants and conversation topics. These APIs allow both external applications and AI agents to create and manage conversations programmatically.

## New API Endpoints

### Main API Information

```http
GET /
```

Returns API information including all available endpoints:

```json
{
  "name": "Cherry Studio API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "models": "GET /v1/models",
    "chat": "POST /v1/chat/completions",
    "mcp": "GET /v1/mcps",
    "assistants": "GET /v1/assistants",
    "topics": "GET /v1/topics",
    "createTopic": "POST /v1/topics",
    "mcpSSE": "ALL /mmcp"
  }
}
```

### Assistant Management

#### List Assistants

```http
GET /v1/assistants
```

Returns a list of all configured assistants:

```json
{
  "success": true,
  "data": [
    {
      "id": "default",
      "name": "Default Assistant",
      "emoji": "😀",
      "prompt": "You are a helpful assistant",
      "type": "assistant",
      "model": {
        "id": "gpt-3.5-turbo",
        "name": "GPT-3.5 Turbo"
      },
      "topics": [
        {
          "id": "topic-1",
          "name": "Test Topic",
          "assistantId": "default",
          "createdAt": "2025-01-01T00:00:00.000Z",
          "updatedAt": "2025-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

#### Get Assistant Details

```http
GET /v1/assistants/{assistant_id}
```

Returns detailed information about a specific assistant:

```json
{
  "success": true,
  "data": {
    "id": "default",
    "name": "Default Assistant",
    "emoji": "😀",
    "prompt": "You are a helpful assistant",
    "type": "assistant",
    "model": {
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo"
    },
    "settings": {
      "temperature": 0.7,
      "contextCount": 10,
      "streamOutput": true
    },
    "topics": [...]
  }
}
```

### Topic Management

#### List Topics

```http
GET /v1/topics
GET /v1/topics?assistant_id={assistant_id}
```

Lists conversation topics, optionally filtered by assistant:

```json
{
  "success": true,
  "data": [
    {
      "id": "topic-1",
      "name": "Test Topic",
      "assistantId": "default",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Topic

```http
POST /v1/topics
Content-Type: application/json

{
  "assistant_id": "default",
  "name": "New Conversation Topic"
}
```

Creates a new conversation topic:

```json
{
  "success": true,
  "data": {
    "id": "topic-12345",
    "name": "New Conversation Topic",
    "assistantId": "default",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Get Topic Details

```http
GET /v1/topics/{topic_id}
```

Returns topic details including messages:

```json
{
  "success": true,
  "data": {
    "id": "topic-1",
    "name": "Test Topic",
    "assistantId": "default",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Hello!",
        "timestamp": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

## MCP Integration for AI Agents

### Server-Sent Events Endpoint

```http
ALL /mmcp
```

This endpoint provides a Server-Sent Events (SSE) interface for Model Context Protocol (MCP) communication, allowing AI agents to interact with Cherry Studio in real-time.

### Available MCP Tools

The MCP server provides the following tools for AI agents:

#### 1. create_topic

Creates a new conversation topic for an assistant.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assistant_id": {
      "type": "string",
      "description": "ID of the assistant to create the topic for"
    },
    "name": {
      "type": "string",
      "description": "Optional name for the topic"
    }
  },
  "required": ["assistant_id"]
}
```

**Usage Example:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_topic",
    "arguments": {
      "assistant_id": "default",
      "name": "AI-Created Topic"
    }
  }
}
```

#### 2. list_assistants

Lists all available assistants.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

#### 3. get_assistant

Gets details of a specific assistant.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assistant_id": {
      "type": "string",
      "description": "ID of the assistant to retrieve"
    }
  },
  "required": ["assistant_id"]
}
```

#### 4. list_topics

Lists topics, optionally filtered by assistant.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assistant_id": {
      "type": "string",
      "description": "Optional assistant ID to filter topics"
    }
  }
}
```

## Integration with Existing System

### Redux Store Integration

All APIs integrate with the existing Redux store via `reduxService`:
- Read current state from `state.assistants.assistants`
- Dispatch actions like `assistants/addTopic` to update state
- Maintain consistency with frontend application

### Database Integration

Topics are stored in the application database:
- Uses existing `db.topics` table
- Maintains message history and metadata
- Supports existing topic management operations

### Concurrent Request Support

All endpoints support concurrent requests:
- Proper async/await handling
- Thread-safe Redux updates
- Independent database operations

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "type": "error_type",
    "code": "error_code"
  }
}
```

Common error codes:
- `assistant_not_found` - Assistant ID not found
- `topic_not_found` - Topic ID not found
- `missing_assistant_id` - Required assistant_id parameter missing
- `topic_creation_failed` - Failed to create topic

## Authentication

All `/v1/*` endpoints require authentication via the existing auth middleware. The `/mmcp` endpoint is available without authentication for easier AI agent access.

## Usage Examples

### Creating a Topic via REST API

```bash
curl -X POST http://localhost:3000/v1/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "assistant_id": "default",
    "name": "My New Topic"
  }'
```

### Listing Assistants

```bash
curl -X GET http://localhost:3000/v1/assistants \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using MCP for AI Agents

Connect to the SSE endpoint and send MCP requests:

```javascript
const eventSource = new EventSource('/mmcp');

// Send MCP request to create topic
fetch('/mmcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'tools/call',
    params: {
      name: 'create_topic',
      arguments: {
        assistant_id: 'default',
        name: 'AI-Generated Topic'
      }
    }
  })
});
```

## Benefits

1. **Full Integration**: Uses existing assistant and topic management logic from the frontend
2. **Real-time Communication**: MCP SSE endpoint supports real-time AI agent interaction
3. **Concurrent Operations**: All endpoints support parallel requests
4. **No Data Duplication**: Uses real application state, no hardcoded or mock data
5. **Tool Calling Support**: Created conversations can use MCP tools and other features
6. **Consistent Experience**: Topics created via API work identically to frontend-created topics