import { loggerService } from '@logger'
import { reduxService } from '../../services/ReduxService'
import { v4 as uuidv4 } from 'uuid'
import type { Assistant, Topic, Message } from '../../../renderer/src/types'
import { assistantApiService } from './assistant'

const uuid = () => uuidv4()

const logger = loggerService.withContext('TopicApiService')

/**
 * TopicApiService - API layer for Topic management
 * 
 * This service provides a REST API interface for Topic management while integrating
 * with the existing application architecture:
 * 
 * 1. Uses ReduxService to access the renderer's Redux store directly
 * 2. Syncs changes back to the renderer via Redux actions
 * 3. Leverages existing topic management logic
 * 4. Integrates with database operations for messages
 */
export class TopicApiService {
  /**
   * Get all topics (with optional assistant filter, without message content)
   */
  async getAllTopics(assistantId?: string): Promise<Omit<Topic, 'messages'>[]> {
    try {
      const assistants = await reduxService.select<Assistant[]>('state.assistants.assistants')
      
      // Handle case where assistants is undefined or not an array
      if (!assistants || !Array.isArray(assistants)) {
        logger.warn('Assistants state is not properly initialized, returning empty array')
        return []
      }
      
      let allTopics: Topic[] = []
      
      if (assistantId) {
        const assistant = assistants.find(a => a.id === assistantId)
        if (!assistant) {
          throw new Error(`Assistant ${assistantId} not found`)
        }
        allTopics = assistant.topics || []
      } else {
        // Collect topics from all assistants
        allTopics = assistants.flatMap(assistant => assistant.topics || [])
      }

      // Remove messages to reduce payload size
      return allTopics.map(topic => {
        const { messages, ...topicWithoutMessages } = topic
        return topicWithoutMessages
      })
    } catch (error) {
      logger.error('Failed to get all topics:', error as Error)
      throw new Error('Failed to retrieve topics')
    }
  }

  /**
   * Get topic by ID
   */
  async getTopicById(id: string): Promise<Topic | null> {
    try {
      const assistants = await reduxService.select<Assistant[]>('state.assistants.assistants')
      
      // Handle case where assistants is undefined or not an array
      if (!assistants || !Array.isArray(assistants)) {
        logger.warn('Assistants state is not properly initialized, returning null')
        return null
      }
      
      for (const assistant of assistants) {
        const topics = assistant.topics || []
        const topic = topics.find(t => t.id === id)
        if (topic) {
          return topic
        }
      }
      
      return null
    } catch (error) {
      logger.error(`Failed to get topic ${id}:`, error as Error)
      throw new Error(`Failed to retrieve topic ${id}`)
    }
  }

  /**
   * Get topic messages
   */
  async getTopicMessages(id: string): Promise<Message[]> {
    try {
      const topic = await this.getTopicById(id)
      if (!topic) {
        throw new Error(`Topic ${id} not found`)
      }

      return topic.messages || []
    } catch (error) {
      logger.error(`Failed to get messages for topic ${id}:`, error as Error)
      throw error
    }
  }

  /**
   * Create a new topic
   */
  async createTopic(assistantId: string, topicData: Partial<Topic>): Promise<Topic> {
    try {
      const assistant = await assistantApiService.getAssistantById(assistantId)
      if (!assistant) {
        throw new Error(`Assistant ${assistantId} not found`)
      }

      const newTopic: Topic = {
        id: uuid(),
        assistantId,
        name: 'New Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        isNameManuallyEdited: false,
        ...topicData,
        assistantId, // Ensure assistantId cannot be overridden
      }

      // Dispatch action to add the topic
      await reduxService.dispatch({
        type: 'assistants/addTopic',
        payload: { assistantId, topic: newTopic }
      })

      // Add topic to database (for messages persistence)
      const mainWindow = require('../../services/WindowService').windowService.getMainWindow()
      if (mainWindow) {
        try {
          const addScript = `
            (function(topicId) {
              if (window.db && window.db.topics) {
                return window.db.topics.add({ id: topicId, messages: [] });
              }
              return Promise.resolve();
            })('${newTopic.id}')
          `
          await mainWindow.webContents.executeJavaScript(addScript)
        } catch (dbError) {
          logger.warn(`Failed to add topic to database: ${newTopic.id}:`, dbError as Error)
          // Continue execution even if database update fails
        }
      }

      logger.info(`Created new topic: ${newTopic.id} for assistant: ${assistantId}`)
      return newTopic
    } catch (error) {
      logger.error('Failed to create topic:', error as Error)
      throw new Error('Failed to create topic')
    }
  }

  /**
   * Update an existing topic
   */
  async updateTopic(id: string, updates: Partial<Topic>): Promise<Topic> {
    try {
      const topic = await this.getTopicById(id)
      if (!topic) {
        throw new Error(`Topic ${id} not found`)
      }

      const updatedTopic = {
        ...topic,
        ...updates,
        id, // Ensure ID cannot be changed
        assistantId: topic.assistantId, // Ensure assistantId cannot be changed
        updatedAt: new Date().toISOString(),
      }

      // Dispatch action to update the topic
      await reduxService.dispatch({
        type: 'assistants/updateTopic',
        payload: { assistantId: topic.assistantId, topic: updatedTopic }
      })

      logger.info(`Updated topic: ${id}`)
      return updatedTopic
    } catch (error) {
      logger.error(`Failed to update topic ${id}:`, error as Error)
      throw error
    }
  }

  /**
   * Delete a topic
   */
  async deleteTopic(id: string): Promise<void> {
    try {
      const topic = await this.getTopicById(id)
      if (!topic) {
        throw new Error(`Topic ${id} not found`)
      }

      // Dispatch action to remove the topic
      await reduxService.dispatch({
        type: 'assistants/removeTopic',
        payload: { assistantId: topic.assistantId, topic }
      })

      // Remove topic from database
      const mainWindow = require('../../services/WindowService').windowService.getMainWindow()
      if (mainWindow) {
        await mainWindow.webContents.executeJavaScript(`
          window.db.topics.delete('${id}')
        `)
      }

      logger.info(`Deleted topic: ${id}`)
    } catch (error) {
      logger.error(`Failed to delete topic ${id}:`, error as Error)
      throw error
    }
  }

  /**
   * Add message to topic
   */
  async addMessageToTopic(topicId: string, message: Partial<Message>): Promise<Message> {
    try {
      const topic = await this.getTopicById(topicId)
      if (!topic) {
        throw new Error(`Topic ${topicId} not found`)
      }

      const newMessage: Message = {
        id: uuid(),
        assistantId: topic.assistantId,
        role: 'user',
        content: '',
        topicId,
        createdAt: new Date().toISOString(),
        status: 'success',
        type: 'text',
        ...message,
      }

      // Add message to topic
      const updatedTopic = {
        ...topic,
        messages: [...(topic.messages || []), newMessage],
        updatedAt: new Date().toISOString()
      }

      // Update topic in store
      await reduxService.dispatch({
        type: 'assistants/updateTopic',
        payload: { assistantId: topic.assistantId, topic: updatedTopic }
      })

      // Update topic in database
      const mainWindow = require('../../services/WindowService').windowService.getMainWindow()
      if (mainWindow) {
        try {
          // Safer approach: pass data through a function parameter
          const updateScript = `
            (function(topicId, messages) {
              if (window.db && window.db.topics) {
                return window.db.topics.update(topicId, { messages: messages });
              }
              return Promise.resolve();
            })('${topicId}', ${JSON.stringify(updatedTopic.messages)})
          `
          await mainWindow.webContents.executeJavaScript(updateScript)
        } catch (dbError) {
          logger.warn(`Failed to update database for topic ${topicId}:`, dbError as Error)
          // Continue execution even if database update fails
        }
      }

      logger.info(`Added message to topic: ${topicId}`)
      return newMessage
    } catch (error) {
      logger.error(`Failed to add message to topic ${topicId}:`, error as Error)
      throw error
    }
  }
}

export const topicApiService = new TopicApiService()