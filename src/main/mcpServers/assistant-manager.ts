import { loggerService } from '@logger'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js'
import { assistantApiService } from '../apiServer/services/assistant'
import { topicApiService } from '../apiServer/services/topic'

const logger = loggerService.withContext('AssistantManagerMCP')

export default class AssistantManagerServer {
  server: Server

  constructor() {
    this.server = new Server(
      {
        name: '@cherry/assistant-manager',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.setupHandlers()
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'list_assistants',
          description: 'List all assistants (without full conversation content)',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'get_assistant',
          description: 'Get detailed information about a specific assistant',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'The ID of the assistant to retrieve'
              }
            },
            required: ['assistant_id'],
            additionalProperties: false
          }
        },
        {
          name: 'create_assistant',
          description: 'Create a new assistant',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Assistant name'
              },
              prompt: {
                type: 'string',
                description: 'Assistant system prompt'
              },
              emoji: {
                type: 'string',
                description: 'Assistant emoji'
              },
              description: {
                type: 'string',
                description: 'Assistant description'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Assistant tags'
              }
            },
            required: ['name'],
            additionalProperties: false
          }
        },
        {
          name: 'update_assistant',
          description: 'Update an existing assistant',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'The ID of the assistant to update'
              },
              name: {
                type: 'string',
                description: 'Assistant name'
              },
              prompt: {
                type: 'string',
                description: 'Assistant system prompt'
              },
              emoji: {
                type: 'string',
                description: 'Assistant emoji'
              },
              description: {
                type: 'string',
                description: 'Assistant description'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Assistant tags'
              }
            },
            required: ['assistant_id'],
            additionalProperties: false
          }
        },
        {
          name: 'delete_assistant',
          description: 'Delete an assistant and all its topics',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'The ID of the assistant to delete'
              }
            },
            required: ['assistant_id'],
            additionalProperties: false
          }
        },
        {
          name: 'list_topics',
          description: 'List all topics (optionally filtered by assistant)',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'Filter topics by assistant ID (optional)'
              }
            },
            additionalProperties: false
          }
        },
        {
          name: 'get_topic',
          description: 'Get detailed information about a specific topic',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The ID of the topic to retrieve'
              }
            },
            required: ['topic_id'],
            additionalProperties: false
          }
        },
        {
          name: 'create_topic',
          description: 'Create a new topic for an assistant',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'The ID of the assistant'
              },
              name: {
                type: 'string',
                description: 'Topic name'
              },
              prompt: {
                type: 'string',
                description: 'Topic-specific prompt'
              }
            },
            required: ['assistant_id'],
            additionalProperties: false
          }
        },
        {
          name: 'update_topic',
          description: 'Update an existing topic',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The ID of the topic to update'
              },
              name: {
                type: 'string',
                description: 'Topic name'
              },
              prompt: {
                type: 'string',
                description: 'Topic-specific prompt'
              },
              pinned: {
                type: 'boolean',
                description: 'Whether the topic is pinned'
              }
            },
            required: ['topic_id'],
            additionalProperties: false
          }
        },
        {
          name: 'delete_topic',
          description: 'Delete a topic and all its messages',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The ID of the topic to delete'
              }
            },
            required: ['topic_id'],
            additionalProperties: false
          }
        },
        {
          name: 'get_topic_messages',
          description: 'Get all messages for a specific topic',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The ID of the topic'
              }
            },
            required: ['topic_id'],
            additionalProperties: false
          }
        },
        {
          name: 'send_message',
          description: 'Add a new message to a topic',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The ID of the topic'
              },
              content: {
                type: 'string',
                description: 'Message content'
              },
              role: {
                type: 'string',
                enum: ['user', 'assistant'],
                description: 'Message role'
              },
              type: {
                type: 'string',
                enum: ['text', '@', 'clear'],
                description: 'Message type',
                default: 'text'
              }
            },
            required: ['topic_id', 'content', 'role'],
            additionalProperties: false
          }
        },
        {
          name: 'create_new_conversation',
          description: 'Create a new conversation topic with the default assistant (equivalent to clicking "New Topic" in the UI)',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Custom name for the conversation (optional)',
                default: 'New Conversation'
              },
              prompt: {
                type: 'string',
                description: 'Initial system prompt for this conversation (optional)'
              }
            },
            additionalProperties: false
          }
        }
      ]

      return { tools }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        logger.debug(`[AssistantManager] Calling tool: ${name}`, args)

        switch (name) {
          case 'list_assistants': {
            const assistants = await assistantApiService.getAllAssistants()
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(assistants, null, 2)
                }
              ]
            }
          }

          case 'get_assistant': {
            const { assistant_id } = args as { assistant_id: string }
            const assistant = await assistantApiService.getAssistantById(assistant_id)
            if (!assistant) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Assistant with ID ${assistant_id} not found`
                  }
                ],
                isError: true
              }
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(assistant, null, 2)
                }
              ]
            }
          }

          case 'create_assistant': {
            const assistantData = args as any
            const assistant = await assistantApiService.createAssistant(assistantData)
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully created assistant: ${JSON.stringify(assistant, null, 2)}`
                }
              ]
            }
          }

          case 'update_assistant': {
            const { assistant_id, ...updates } = args as any
            const assistant = await assistantApiService.updateAssistant(assistant_id, updates)
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully updated assistant: ${JSON.stringify(assistant, null, 2)}`
                }
              ]
            }
          }

          case 'delete_assistant': {
            const { assistant_id } = args as { assistant_id: string }
            await assistantApiService.deleteAssistant(assistant_id)
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully deleted assistant with ID: ${assistant_id}`
                }
              ]
            }
          }

          case 'list_topics': {
            const { assistant_id } = args as { assistant_id?: string }
            const topics = await topicApiService.getAllTopics(assistant_id)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(topics, null, 2)
                }
              ]
            }
          }

          case 'get_topic': {
            const { topic_id } = args as { topic_id: string }
            const topic = await topicApiService.getTopicById(topic_id)
            if (!topic) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Topic with ID ${topic_id} not found`
                  }
                ],
                isError: true
              }
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(topic, null, 2)
                }
              ]
            }
          }

          case 'create_topic': {
            const { assistant_id, ...topicData } = args as any
            const topic = await topicApiService.createTopic(assistant_id, topicData)
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully created topic: ${JSON.stringify(topic, null, 2)}`
                }
              ]
            }
          }

          case 'update_topic': {
            const { topic_id, ...updates } = args as any
            const topic = await topicApiService.updateTopic(topic_id, updates)
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully updated topic: ${JSON.stringify(topic, null, 2)}`
                }
              ]
            }
          }

          case 'delete_topic': {
            const { topic_id } = args as { topic_id: string }
            await topicApiService.deleteTopic(topic_id)
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully deleted topic with ID: ${topic_id}`
                }
              ]
            }
          }

          case 'get_topic_messages': {
            const { topic_id } = args as { topic_id: string }
            const messages = await topicApiService.getTopicMessages(topic_id)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(messages, null, 2)
                }
              ]
            }
          }

          case 'send_message': {
            const messageData = args as any
            const { topic_id, ...messagePayload } = messageData
            const message = await topicApiService.addMessageToTopic(topic_id, messagePayload)
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully sent message: ${JSON.stringify(message, null, 2)}`
                }
              ]
            }
          }

          case 'create_new_conversation': {
            try {
              // Get the default assistant first
              const assistants = await assistantApiService.getAllAssistants()
              const defaultAssistant = assistants.find(a => a.id === 'default') || assistants[0]
              
              if (!defaultAssistant) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: 'No assistants available to create a conversation with'
                    }
                  ],
                  isError: true
                }
              }

              const { name = 'New Conversation', prompt } = args as { name?: string; prompt?: string }
              
              // Create a new topic using the same logic as the frontend
              const topicData = {
                name,
                ...(prompt && { prompt })
              }
              
              const topic = await topicApiService.createTopic(defaultAssistant.id, topicData)
              
              return {
                content: [
                  {
                    type: 'text',
                    text: `Successfully created new conversation: ${JSON.stringify({
                      topic_id: topic.id,
                      assistant_id: defaultAssistant.id,
                      assistant_name: defaultAssistant.name,
                      topic_name: topic.name,
                      created_at: topic.createdAt
                    }, null, 2)}`
                  }
                ]
              }
            } catch (error) {
              logger.error(`[AssistantManager] Error creating new conversation:`, error as Error)
              return {
                content: [
                  {
                    type: 'text',
                    text: `Failed to create new conversation: ${(error as Error).message}`
                  }
                ],
                isError: true
              }
            }
          }

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${name}`
                }
              ],
              isError: true
            }
        }
      } catch (error) {
        logger.error(`[AssistantManager] Error calling tool ${name}:`, error as Error)
        return {
          content: [
            {
              type: 'text',
              text: `Error calling tool ${name}: ${(error as Error).message}`
            }
          ],
          isError: true
        }
      }
    })
  }
}