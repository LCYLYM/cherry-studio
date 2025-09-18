import { loggerService } from '@logger'
import { reduxService } from '../../services/ReduxService'
import { v4 as uuidv4 } from 'uuid'
import type { Assistant, Topic } from '../../../renderer/src/types'

const uuid = () => uuidv4()

const logger = loggerService.withContext('AssistantApiService')

/**
 * AssistantApiService - API layer for Assistant management
 * 
 * This service provides a REST API interface for Assistant management while integrating
 * with the existing application architecture:
 * 
 * 1. Uses ReduxService to access the renderer's Redux store directly
 * 2. Syncs changes back to the renderer via Redux actions
 * 3. Leverages existing assistant management logic
 */
export class AssistantApiService {
  /**
   * Get all assistants (without full conversation content)
   */
  async getAllAssistants(): Promise<Omit<Assistant, 'topics'>[]> {
    try {
      const assistants = await reduxService.select<Assistant[]>('state.assistants.assistants')
      
      // Remove topics to reduce payload size (per requirement)
      return assistants.map(assistant => {
        const { topics, ...assistantWithoutTopics } = assistant
        return assistantWithoutTopics
      })
    } catch (error) {
      logger.error('Failed to get all assistants:', error as Error)
      throw new Error('Failed to retrieve assistants')
    }
  }

  /**
   * Get assistant by ID
   */
  async getAssistantById(id: string): Promise<Assistant | null> {
    try {
      const assistants = await reduxService.select<Assistant[]>('state.assistants.assistants')
      const assistant = assistants.find(a => a.id === id)
      return assistant || null
    } catch (error) {
      logger.error(`Failed to get assistant ${id}:`, error as Error)
      throw new Error(`Failed to retrieve assistant ${id}`)
    }
  }

  /**
   * Get assistant topics (without message content)
   */
  async getAssistantTopics(assistantId: string): Promise<Omit<Topic, 'messages'>[]> {
    try {
      const assistant = await this.getAssistantById(assistantId)
      if (!assistant) {
        throw new Error(`Assistant ${assistantId} not found`)
      }

      // Remove messages to reduce payload size
      return assistant.topics.map(topic => {
        const { messages, ...topicWithoutMessages } = topic
        return topicWithoutMessages
      })
    } catch (error) {
      logger.error(`Failed to get topics for assistant ${assistantId}:`, error as Error)
      throw error
    }
  }

  /**
   * Create a new assistant
   */
  async createAssistant(assistantData: Partial<Assistant>): Promise<Assistant> {
    try {
      // Generate default values
      const defaultTopic: Topic = {
        id: uuid(),
        assistantId: assistantData.id || uuid(),
        name: 'New Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        isNameManuallyEdited: false
      }

      const newAssistant: Assistant = {
        id: uuid(),
        name: 'New Assistant',
        prompt: '',
        topics: [defaultTopic],
        type: 'assistant',
        emoji: '🤖',
        description: '',
        regularPhrases: [],
        ...assistantData,
      }

      // Update the assistant ID in the default topic
      newAssistant.topics[0].assistantId = newAssistant.id

      // Dispatch action to add the assistant
      await reduxService.dispatch({
        type: 'assistants/addAssistant',
        payload: newAssistant
      })

      logger.info(`Created new assistant: ${newAssistant.id}`)
      return newAssistant
    } catch (error) {
      logger.error('Failed to create assistant:', error as Error)
      throw new Error('Failed to create assistant')
    }
  }

  /**
   * Update an existing assistant
   */
  async updateAssistant(id: string, updates: Partial<Assistant>): Promise<Assistant> {
    try {
      const assistant = await this.getAssistantById(id)
      if (!assistant) {
        throw new Error(`Assistant ${id} not found`)
      }

      const updatedAssistant = {
        ...assistant,
        ...updates,
        id, // Ensure ID cannot be changed
      }

      // Dispatch action to update the assistant
      await reduxService.dispatch({
        type: 'assistants/updateAssistant',
        payload: updatedAssistant
      })

      logger.info(`Updated assistant: ${id}`)
      return updatedAssistant
    } catch (error) {
      logger.error(`Failed to update assistant ${id}:`, error as Error)
      throw error
    }
  }

  /**
   * Delete an assistant
   */
  async deleteAssistant(id: string): Promise<void> {
    try {
      const assistant = await this.getAssistantById(id)
      if (!assistant) {
        throw new Error(`Assistant ${id} not found`)
      }

      // Dispatch action to remove the assistant
      await reduxService.dispatch({
        type: 'assistants/removeAssistant',
        payload: { id }
      })

      logger.info(`Deleted assistant: ${id}`)
    } catch (error) {
      logger.error(`Failed to delete assistant ${id}:`, error as Error)
      throw error
    }
  }
}

export const assistantApiService = new AssistantApiService()