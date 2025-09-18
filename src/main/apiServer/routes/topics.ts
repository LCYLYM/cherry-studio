import express, { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

import { loggerService } from '../../services/LoggerService'
import { reduxService } from '../../services/ReduxService'

const logger = loggerService.withContext('ApiServerTopicsRoutes')

const router = express.Router()

// Database import helper function 
const getDatabase = async () => {
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
        },
        get: async (id: string) => {
          logger.info('Mock database: topic retrieved', { id })
          return { id, messages: [] }
        }
      }
    }
  }
}

/**
 * @swagger
 * /v1/topics:
 *   get:
 *     summary: List topics
 *     description: Get a list of topics, optionally filtered by assistant ID
 *     tags: [Topics]
 *     parameters:
 *       - in: query
 *         name: assistant_id
 *         schema:
 *           type: string
 *         description: Filter topics by assistant ID
 *     responses:
 *       200:
 *         description: List of topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Topic'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('Get topics request received', { assistantId: req.query.assistant_id })
    
    const state = reduxService.getState()
    const assistants = state.assistants.assistants
    
    let topics: any[] = []
    
    if (req.query.assistant_id) {
      const assistant = assistants.find(a => a.id === req.query.assistant_id)
      if (assistant) {
        topics = assistant.topics
      }
    } else {
      // Get all topics from all assistants
      topics = assistants.flatMap(assistant => assistant.topics)
    }
    
    return res.json({
      success: true,
      data: topics.map(topic => ({
        id: topic.id,
        name: topic.name,
        assistantId: topic.assistantId,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching topics:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: `Failed to retrieve topics: ${error.message}`,
        type: 'internal_error',
        code: 'topics_unavailable'
      }
    })
  }
})

/**
 * @swagger
 * /v1/topics:
 *   post:
 *     summary: Create a new topic
 *     description: Create a new conversation topic for an assistant
 *     tags: [Topics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assistant_id
 *             properties:
 *               assistant_id:
 *                 type: string
 *                 description: ID of the assistant to create the topic for
 *               name:
 *                 type: string
 *                 description: Optional name for the topic
 *     responses:
 *       201:
 *         description: Topic created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Assistant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { assistant_id, name } = req.body
    
    if (!assistant_id) {
      logger.warn('Missing assistant_id in request body')
      return res.status(400).json({
        success: false,
        error: {
          message: 'assistant_id is required',
          type: 'invalid_request',
          code: 'missing_assistant_id'
        }
      })
    }
    
    logger.info('Create topic request received', { assistantId: assistant_id, name })
    
    const state = reduxService.getState()
    const assistant = state.assistants.assistants.find(a => a.id === assistant_id)
    
    if (!assistant) {
      logger.warn('Assistant not found', { assistantId: assistant_id })
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assistant not found',
          type: 'not_found',
          code: 'assistant_not_found'
        }
      })
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
    
    // Add to database
    const db = await getDatabase()
    await db.topics.add({ id: topicId, messages: [] })
    
    // Update Redux store
    reduxService.dispatch({
      type: 'assistants/addTopic',
      payload: {
        assistantId: assistant_id,
        topic: newTopic
      }
    })
    
    logger.info('Topic created successfully', { topicId, assistantId: assistant_id })
    
    return res.status(201).json({
      success: true,
      data: {
        id: newTopic.id,
        name: newTopic.name,
        assistantId: newTopic.assistantId,
        createdAt: newTopic.createdAt,
        updatedAt: newTopic.updatedAt
      }
    })
  } catch (error: any) {
    logger.error('Error creating topic:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: `Failed to create topic: ${error.message}`,
        type: 'internal_error',
        code: 'topic_creation_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/topics/{topic_id}:
 *   get:
 *     summary: Get topic details
 *     description: Get detailed information about a specific topic including its messages
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: topic_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TopicWithMessages'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:topic_id', async (req: Request, res: Response) => {
  try {
    const topicId = req.params.topic_id
    logger.info('Get topic details request received', { topicId })
    
    // Get topic from database which includes messages
    const db = await getDatabase()
    const topicWithMessages = await db.topics.get(topicId)
    
    if (!topicWithMessages) {
      logger.warn('Topic not found', { topicId })
      return res.status(404).json({
        success: false,
        error: {
          message: 'Topic not found',
          type: 'not_found',
          code: 'topic_not_found'
        }
      })
    }
    
    // Also get topic metadata from Redux store
    const state = reduxService.getState()
    let topicMeta = null
    
    for (const assistant of state.assistants.assistants) {
      const topic = assistant.topics.find(t => t.id === topicId)
      if (topic) {
        topicMeta = topic
        break
      }
    }
    
    return res.json({
      success: true,
      data: {
        id: topicId,
        name: topicMeta?.name || 'Unknown Topic',
        assistantId: topicMeta?.assistantId,
        createdAt: topicMeta?.createdAt,
        updatedAt: topicMeta?.updatedAt,
        messages: topicWithMessages.messages || []
      }
    })
  } catch (error: any) {
    logger.error('Error fetching topic details:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: `Failed to retrieve topic details: ${error.message}`,
        type: 'internal_error',
        code: 'topic_details_unavailable'
      }
    })
  }
})

export { router as topicsRoutes }