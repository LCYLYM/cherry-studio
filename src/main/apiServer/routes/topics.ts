import express, { Request, Response } from 'express'
import { loggerService } from '../../services/LoggerService'
import { topicApiService } from '../services/topic'

const logger = loggerService.withContext('ApiServerTopicRoutes')

const router = express.Router()

/**
 * @swagger
 * /v1/topics:
 *   get:
 *     summary: List topics
 *     description: Get a list of topics (optionally filtered by assistant)
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
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const assistantId = req.query.assistant_id as string | undefined
    logger.info('Get all topics request received', { assistantId })
    
    const topics = await topicApiService.getAllTopics(assistantId)
    
    return res.json({
      success: true,
      data: topics
    })
  } catch (error: any) {
    logger.error('Error fetching topics:', error)
    return res.status(503).json({
      success: false,
      error: {
        message: `Failed to retrieve topics: ${error.message}`,
        type: 'service_unavailable',
        code: 'topics_unavailable'
      }
    })
  }
})

/**
 * @swagger
 * /v1/topics/{topic_id}:
 *   get:
 *     summary: Get topic by ID
 *     description: Get detailed information about a specific topic
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
 *                   $ref: '#/components/schemas/Topic'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:topic_id', async (req: Request, res: Response) => {
  try {
    logger.info(`Get topic ${req.params.topic_id} request received`)
    const topic = await topicApiService.getTopicById(req.params.topic_id)
    
    if (!topic) {
      logger.warn(`Topic ${req.params.topic_id} not found`)
      return res.status(404).json({
        success: false,
        error: {
          message: 'Topic not found',
          type: 'not_found',
          code: 'topic_not_found'
        }
      })
    }
    
    return res.json({
      success: true,
      data: topic
    })
  } catch (error: any) {
    logger.error('Error fetching topic:', error)
    return res.status(503).json({
      success: false,
      error: {
        message: `Failed to retrieve topic: ${error.message}`,
        type: 'service_unavailable',
        code: 'topic_unavailable'
      }
    })
  }
})

/**
 * @swagger
 * /v1/topics:
 *   post:
 *     summary: Create topic
 *     description: Create a new topic for an assistant
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
 *                 description: Assistant ID
 *               name:
 *                 type: string
 *                 description: Topic name
 *               prompt:
 *                 type: string
 *                 description: Topic-specific prompt
 *     responses:
 *       201:
 *         description: Topic created
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
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { assistant_id, ...topicData } = req.body
    
    if (!assistant_id) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'assistant_id is required',
          type: 'invalid_request',
          code: 'missing_assistant_id'
        }
      })
    }
    
    logger.info('Create topic request received', { assistant_id, topicData })
    const topic = await topicApiService.createTopic(assistant_id, topicData)
    
    return res.status(201).json({
      success: true,
      data: topic
    })
  } catch (error: any) {
    logger.error('Error creating topic:', error)
    const statusCode = error.message.includes('not found') ? 404 : 400
    return res.status(statusCode).json({
      success: false,
      error: {
        message: `Failed to create topic: ${error.message}`,
        type: statusCode === 404 ? 'not_found' : 'invalid_request',
        code: statusCode === 404 ? 'assistant_not_found' : 'topic_creation_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/topics/{topic_id}:
 *   put:
 *     summary: Update topic
 *     description: Update an existing topic
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: topic_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               prompt:
 *                 type: string
 *               pinned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Topic updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:topic_id', async (req: Request, res: Response) => {
  try {
    logger.info(`Update topic ${req.params.topic_id} request received`, req.body)
    const topic = await topicApiService.updateTopic(req.params.topic_id, req.body)
    
    return res.json({
      success: true,
      data: topic
    })
  } catch (error: any) {
    logger.error('Error updating topic:', error)
    const statusCode = error.message.includes('not found') ? 404 : 400
    return res.status(statusCode).json({
      success: false,
      error: {
        message: `Failed to update topic: ${error.message}`,
        type: statusCode === 404 ? 'not_found' : 'invalid_request',
        code: statusCode === 404 ? 'topic_not_found' : 'topic_update_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/topics/{topic_id}:
 *   delete:
 *     summary: Delete topic
 *     description: Delete a topic and all its messages
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
 *         description: Topic deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:topic_id', async (req: Request, res: Response) => {
  try {
    logger.info(`Delete topic ${req.params.topic_id} request received`)
    await topicApiService.deleteTopic(req.params.topic_id)
    
    return res.json({
      success: true,
      message: 'Topic deleted successfully'
    })
  } catch (error: any) {
    logger.error('Error deleting topic:', error)
    const statusCode = error.message.includes('not found') ? 404 : 400
    return res.status(statusCode).json({
      success: false,
      error: {
        message: `Failed to delete topic: ${error.message}`,
        type: statusCode === 404 ? 'not_found' : 'invalid_request',
        code: statusCode === 404 ? 'topic_not_found' : 'topic_deletion_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/topics/{topic_id}/messages:
 *   get:
 *     summary: Get topic messages
 *     description: Get all messages for a specific topic
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
 *         description: List of messages
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
 *                     $ref: '#/components/schemas/Message'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:topic_id/messages', async (req: Request, res: Response) => {
  try {
    logger.info(`Get messages for topic ${req.params.topic_id} request received`)
    const messages = await topicApiService.getTopicMessages(req.params.topic_id)
    
    return res.json({
      success: true,
      data: messages
    })
  } catch (error: any) {
    logger.error('Error fetching topic messages:', error)
    const statusCode = error.message.includes('not found') ? 404 : 503
    return res.status(statusCode).json({
      success: false,
      error: {
        message: `Failed to retrieve topic messages: ${error.message}`,
        type: statusCode === 404 ? 'not_found' : 'service_unavailable',
        code: statusCode === 404 ? 'topic_not_found' : 'messages_unavailable'
      }
    })
  }
})

/**
 * @swagger
 * /v1/topics/{topic_id}/messages:
 *   post:
 *     summary: Add message to topic
 *     description: Add a new message to a topic
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: topic_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - role
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *               role:
 *                 type: string
 *                 enum: [user, assistant]
 *                 description: Message role
 *               type:
 *                 type: string
 *                 enum: [text, '@', clear]
 *                 description: Message type
 *     responses:
 *       201:
 *         description: Message added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:topic_id/messages', async (req: Request, res: Response) => {
  try {
    const { content, role } = req.body
    
    if (!content || !role) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'content and role are required',
          type: 'invalid_request',
          code: 'missing_required_fields'
        }
      })
    }
    
    logger.info(`Add message to topic ${req.params.topic_id} request received`, req.body)
    const message = await topicApiService.addMessageToTopic(req.params.topic_id, req.body)
    
    return res.status(201).json({
      success: true,
      data: message
    })
  } catch (error: any) {
    logger.error('Error adding message to topic:', error)
    const statusCode = error.message.includes('not found') ? 404 : 400
    return res.status(statusCode).json({
      success: false,
      error: {
        message: `Failed to add message to topic: ${error.message}`,
        type: statusCode === 404 ? 'not_found' : 'invalid_request',
        code: statusCode === 404 ? 'topic_not_found' : 'message_creation_failed'
      }
    })
  }
})

export { router as topicRoutes }