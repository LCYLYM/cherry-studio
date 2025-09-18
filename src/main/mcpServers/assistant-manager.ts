import { loggerService } from '@logger'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js'
import { assistantApiService } from '../apiServer/services/assistant'
import { topicApiService } from '../apiServer/services/topic'
import { reduxService } from '../services/ReduxService'
import type { Assistant } from '../../renderer/src/types'

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
          description: 'Retrieve a list of available assistants with essential information (id, name, emoji, description, tags). Use this to discover which assistants are available for creating conversations.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'get_assistant',
          description: 'Get complete information about a specific assistant including topics and settings. Use this when you need detailed assistant configuration.',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'The unique ID of the assistant to retrieve (obtained from list_assistants)'
              }
            },
            required: ['assistant_id'],
            additionalProperties: false
          }
        },
        {
          name: 'create_assistant',
          description: 'Create a new AI assistant with custom configuration. This creates a persistent assistant that can be used for multiple conversations.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Display name for the assistant (required)'
              },
              prompt: {
                type: 'string',
                description: 'System prompt defining the assistant\'s behavior and personality'
              },
              emoji: {
                type: 'string',
                description: 'Emoji icon for the assistant (e.g., "🤖", "💡")'
              },
              description: {
                type: 'string',
                description: 'Brief description of the assistant\'s purpose or capabilities'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorizing the assistant (e.g., ["coding", "helper"])'
              }
            },
            required: ['name'],
            additionalProperties: false
          }
        },
        {
          name: 'update_assistant',
          description: 'Modify the configuration of an existing assistant. Use this to change assistant properties like name, prompt, or tags.',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'The unique ID of the assistant to update'
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
          description: 'Permanently delete an assistant and all its conversation topics. Warning: This action cannot be undone.',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'The unique ID of the assistant to delete'
              }
            },
            required: ['assistant_id'],
            additionalProperties: false
          }
        },
        {
          name: 'list_topics',
          description: 'Get a list of conversation topics. Use assistant_id parameter to filter topics for a specific assistant, or omit to get all topics.',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'Filter topics by assistant ID (optional). If not provided, returns all topics.'
              }
            },
            additionalProperties: false
          }
        },
        {
          name: 'get_topic',
          description: 'Retrieve detailed information about a specific conversation topic including its metadata and current state.',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The unique ID of the topic to retrieve'
              }
            },
            required: ['topic_id'],
            additionalProperties: false
          }
        },
        {
          name: 'create_topic',
          description: 'Create a new conversation topic for a specific assistant. This starts a new conversation thread.',
          inputSchema: {
            type: 'object',
            properties: {
              assistant_id: {
                type: 'string',
                description: 'The unique ID of the assistant that will handle this conversation'
              },
              name: {
                type: 'string',
                description: 'Display name for the conversation topic (optional, defaults to "New Conversation")'
              },
              prompt: {
                type: 'string',
                description: 'Custom system prompt for this specific conversation (optional)'
              }
            },
            required: ['assistant_id'],
            additionalProperties: false
          }
        },
        {
          name: 'update_topic',
          description: 'Modify the properties of an existing conversation topic such as name or pinned status.',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The unique ID of the topic to update'
              },
              name: {
                type: 'string',
                description: 'New display name for the topic'
              },
              prompt: {
                type: 'string',
                description: 'New topic-specific system prompt'
              },
              pinned: {
                type: 'boolean',
                description: 'Whether to pin this topic to the top of the list'
              }
            },
            required: ['topic_id'],
            additionalProperties: false
          }
        },
        {
          name: 'delete_topic',
          description: 'Permanently delete a conversation topic and all its messages. Warning: This action cannot be undone.',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The unique ID of the topic to delete'
              }
            },
            required: ['topic_id'],
            additionalProperties: false
          }
        },
        {
          name: 'get_topic_messages',
          description: 'Retrieve all messages in a conversation topic. Use this to see the conversation history.',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The unique ID of the topic whose messages to retrieve'
              }
            },
            required: ['topic_id'],
            additionalProperties: false
          }
        },
        {
          name: 'send_message',
          description: 'Add a new message to an existing conversation topic. This appends the message to the conversation history.',
          inputSchema: {
            type: 'object',
            properties: {
              topic_id: {
                type: 'string',
                description: 'The unique ID of the topic to send the message to'
              },
              content: {
                type: 'string',
                description: 'The text content of the message'
              },
              role: {
                type: 'string',
                enum: ['user', 'assistant'],
                description: 'Role of the message sender: "user" for human messages, "assistant" for AI responses'
              },
              type: {
                type: 'string',
                enum: ['text', '@', 'clear'],
                description: 'Type of message: "text" for normal messages, "@" for mentions, "clear" for context clearing',
                default: 'text'
              }
            },
            required: ['topic_id', 'content', 'role'],
            additionalProperties: false
          }
        },
        {
          name: 'create_new_conversation',
          description: 'Quickly create a new conversation with the default assistant. This is the equivalent of clicking "New Topic" in the UI and is the simplest way to start a conversation.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Custom name for the conversation (optional, defaults to "New Conversation")'
              },
              prompt: {
                type: 'string',
                description: 'Initial system prompt for this conversation (optional, uses assistant default if not provided)'
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
              // Get full assistants list for finding default or first assistant
              const assistants = await reduxService.select<Assistant[]>('state.assistants.assistants')
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