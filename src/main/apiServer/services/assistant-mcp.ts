import { loggerService } from '@main/services/LoggerService'
import { reduxService } from '@main/services/ReduxService'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  ListToolsResult,
  Tool
} from '@modelcontextprotocol/sdk/types.js'
import { v4 as uuidv4 } from 'uuid'

const logger = loggerService.withContext('AssistantMCPService')

/**
 * MCP server for assistant and topic management
 * Provides tools for AI agents to create and manage conversations
 */
export class AssistantMCPService {
  private server: Server

  constructor() {
    this.server = new Server(
      {
        name: 'cherry-studio-assistant-manager',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.setupHandlers()
    logger.info('AssistantMCPService initialized')
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_topic',
            description: 'Create a new conversation topic for an assistant',
            inputSchema: {
              type: 'object',
              properties: {
                assistant_id: {
                  type: 'string',
                  description: 'ID of the assistant to create the topic for'
                },
                name: {
                  type: 'string',
                  description: 'Optional name for the topic'
                }
              },
              required: ['assistant_id']
            }
          },
          {
            name: 'list_assistants',
            description: 'List all available assistants',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_assistant',
            description: 'Get details of a specific assistant',
            inputSchema: {
              type: 'object',
              properties: {
                assistant_id: {
                  type: 'string',
                  description: 'ID of the assistant to retrieve'
                }
              },
              required: ['assistant_id']
            }
          },
          {
            name: 'list_topics',
            description: 'List topics, optionally filtered by assistant',
            inputSchema: {
              type: 'object',
              properties: {
                assistant_id: {
                  type: 'string',
                  description: 'Optional assistant ID to filter topics'
                }
              }
            }
          }
        ]
      } as ListToolsResult
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'create_topic':
            return await this.createTopic(args as { assistant_id: string; name?: string })

          case 'list_assistants':
            return await this.listAssistants()

          case 'get_assistant':
            return await this.getAssistant(args as { assistant_id: string })

          case 'list_topics':
            return await this.listTopics(args as { assistant_id?: string })

          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error: any) {
        logger.error(`Error executing tool ${name}:`, error)
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        } as CallToolResult
      }
    })
  }

  private async createTopic(args: { assistant_id: string; name?: string }): Promise<CallToolResult> {
    const { assistant_id, name } = args

    logger.info('Creating topic via MCP', { assistantId: assistant_id, name })

    const state = reduxService.getState()
    const assistant = state.assistants.assistants.find(a => a.id === assistant_id)

    if (!assistant) {
      throw new Error(`Assistant not found: ${assistant_id}`)
    }

    // Create the topic using the same pattern as the frontend addNewTopic function
    const topicId = uuidv4()
    const timestamp = new Date().toISOString()

    const newTopic = {
      id: topicId,
      name: name || 'New Topic',
      assistantId: assistant_id,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: []
    }

    try {
      // Add to database (dynamic import to avoid circular dependencies)
      const db = await this.getDatabase()
      await db.topics.add({ id: topicId, messages: [] })

      // Update Redux store
      reduxService.dispatch({
        type: 'assistants/addTopic',
        payload: {
          assistantId: assistant_id,
          topic: newTopic
        }
      })

      logger.info('Topic created successfully via MCP', { topicId, assistantId: assistant_id })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: {
                id: newTopic.id,
                name: newTopic.name,
                assistantId: newTopic.assistantId,
                createdAt: newTopic.createdAt,
                updatedAt: newTopic.updatedAt
              }
            }, null, 2)
          }
        ]
      }
    } catch (error: any) {
      logger.error('Error creating topic via MCP:', error)
      throw new Error(`Failed to create topic: ${error.message}`)
    }
  }

  private async listAssistants(): Promise<CallToolResult> {
    logger.info('Listing assistants via MCP')

    const state = reduxService.getState()
    const assistants = state.assistants.assistants

    const assistantList = assistants.map(assistant => ({
      id: assistant.id,
      name: assistant.name,
      emoji: assistant.emoji,
      type: assistant.type,
      topicCount: assistant.topics.length
    }))

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: assistantList
          }, null, 2)
        }
      ]
    }
  }

  private async getAssistant(args: { assistant_id: string }): Promise<CallToolResult> {
    const { assistant_id } = args

    logger.info('Getting assistant details via MCP', { assistantId: assistant_id })

    const state = reduxService.getState()
    const assistant = state.assistants.assistants.find(a => a.id === assistant_id)

    if (!assistant) {
      throw new Error(`Assistant not found: ${assistant_id}`)
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              id: assistant.id,
              name: assistant.name,
              emoji: assistant.emoji,
              prompt: assistant.prompt,
              type: assistant.type,
              model: assistant.model,
              topics: assistant.topics.map(topic => ({
                id: topic.id,
                name: topic.name,
                createdAt: topic.createdAt,
                updatedAt: topic.updatedAt
              }))
            }
          }, null, 2)
        }
      ]
    }
  }

  private async listTopics(args: { assistant_id?: string }): Promise<CallToolResult> {
    const { assistant_id } = args

    logger.info('Listing topics via MCP', { assistantId: assistant_id })

    const state = reduxService.getState()
    const assistants = state.assistants.assistants

    let topics: any[] = []

    if (assistant_id) {
      const assistant = assistants.find(a => a.id === assistant_id)
      if (assistant) {
        topics = assistant.topics
      }
    } else {
      topics = assistants.flatMap(assistant => assistant.topics)
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: topics.map(topic => ({
              id: topic.id,
              name: topic.name,
              assistantId: topic.assistantId,
              createdAt: topic.createdAt,
              updatedAt: topic.updatedAt
            }))
          }, null, 2)
        }
      ]
    }
  }

  getServer(): Server {
    return this.server
  }

  private async getDatabase() {
    try {
      // Use dynamic import to avoid circular dependency issues
      return await import('../../../renderer/src/databases').then(mod => mod.default)
    } catch (error) {
      // Fallback for cases where database is not available
      logger.warn('Database not available, using mock implementation')
      return {
        topics: {
          add: async (topic: any) => {
            logger.info('Mock database: topic added', topic)
          }
        }
      }
    }
  }
}

export const assistantMCPService = new AssistantMCPService()