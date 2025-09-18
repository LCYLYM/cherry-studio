import express, { Request, Response } from 'express'
import { loggerService } from '../../services/LoggerService'
import { assistantApiService } from '../services/assistant'

const logger = loggerService.withContext('ApiServerAssistantRoutes')

const router = express.Router()

/**
 * @swagger
 * /v1/assistants:
 *   get:
 *     summary: List assistants
 *     description: Get a list of all assistants (without full conversation content)
 *     tags: [Assistants]
 *     responses:
 *       200:
 *         description: List of assistants
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
 *                     $ref: '#/components/schemas/Assistant'
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('Get all assistants request received')
    const assistants = await assistantApiService.getAllAssistants()
    return res.json({
      success: true,
      data: assistants
    })
  } catch (error: any) {
    logger.error('Error fetching assistants:', error)
    return res.status(503).json({
      success: false,
      error: {
        message: `Failed to retrieve assistants: ${error.message}`,
        type: 'service_unavailable',
        code: 'assistants_unavailable'
      }
    })
  }
})

/**
 * @swagger
 * /v1/assistants/{assistant_id}:
 *   get:
 *     summary: Get assistant by ID
 *     description: Get detailed information about a specific assistant
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: assistant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assistant ID
 *     responses:
 *       200:
 *         description: Assistant information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Assistant'
 *       404:
 *         description: Assistant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:assistant_id', async (req: Request, res: Response) => {
  try {
    logger.info(`Get assistant ${req.params.assistant_id} request received`)
    const assistant = await assistantApiService.getAssistantById(req.params.assistant_id)
    
    if (!assistant) {
      logger.warn(`Assistant ${req.params.assistant_id} not found`)
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assistant not found',
          type: 'not_found',
          code: 'assistant_not_found'
        }
      })
    }
    
    return res.json({
      success: true,
      data: assistant
    })
  } catch (error: any) {
    logger.error('Error fetching assistant:', error)
    return res.status(503).json({
      success: false,
      error: {
        message: `Failed to retrieve assistant: ${error.message}`,
        type: 'service_unavailable',
        code: 'assistant_unavailable'
      }
    })
  }
})

/**
 * @swagger
 * /v1/assistants:
 *   post:
 *     summary: Create assistant
 *     description: Create a new assistant
 *     tags: [Assistants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Assistant name
 *               prompt:
 *                 type: string
 *                 description: Assistant system prompt
 *               emoji:
 *                 type: string
 *                 description: Assistant emoji
 *               description:
 *                 type: string
 *                 description: Assistant description
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Assistant tags
 *     responses:
 *       201:
 *         description: Assistant created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Assistant'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    logger.info('Create assistant request received', req.body)
    const assistant = await assistantApiService.createAssistant(req.body)
    
    return res.status(201).json({
      success: true,
      data: assistant
    })
  } catch (error: any) {
    logger.error('Error creating assistant:', error)
    return res.status(400).json({
      success: false,
      error: {
        message: `Failed to create assistant: ${error.message}`,
        type: 'invalid_request',
        code: 'assistant_creation_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/assistants/{assistant_id}:
 *   put:
 *     summary: Update assistant
 *     description: Update an existing assistant
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: assistant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assistant ID
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
 *               emoji:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Assistant updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Assistant'
 *       404:
 *         description: Assistant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:assistant_id', async (req: Request, res: Response) => {
  try {
    logger.info(`Update assistant ${req.params.assistant_id} request received`, req.body)
    const assistant = await assistantApiService.updateAssistant(req.params.assistant_id, req.body)
    
    return res.json({
      success: true,
      data: assistant
    })
  } catch (error: any) {
    logger.error('Error updating assistant:', error)
    const statusCode = error.message.includes('not found') ? 404 : 400
    return res.status(statusCode).json({
      success: false,
      error: {
        message: `Failed to update assistant: ${error.message}`,
        type: statusCode === 404 ? 'not_found' : 'invalid_request',
        code: statusCode === 404 ? 'assistant_not_found' : 'assistant_update_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/assistants/{assistant_id}:
 *   delete:
 *     summary: Delete assistant
 *     description: Delete an assistant and all its topics
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: assistant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assistant ID
 *     responses:
 *       200:
 *         description: Assistant deleted
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
 *         description: Assistant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:assistant_id', async (req: Request, res: Response) => {
  try {
    logger.info(`Delete assistant ${req.params.assistant_id} request received`)
    await assistantApiService.deleteAssistant(req.params.assistant_id)
    
    return res.json({
      success: true,
      message: 'Assistant deleted successfully'
    })
  } catch (error: any) {
    logger.error('Error deleting assistant:', error)
    const statusCode = error.message.includes('not found') ? 404 : 400
    return res.status(statusCode).json({
      success: false,
      error: {
        message: `Failed to delete assistant: ${error.message}`,
        type: statusCode === 404 ? 'not_found' : 'invalid_request',
        code: statusCode === 404 ? 'assistant_not_found' : 'assistant_deletion_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/assistants/{assistant_id}/topics:
 *   get:
 *     summary: Get assistant topics
 *     description: Get all topics for a specific assistant (without message content)
 *     tags: [Assistants]
 *     parameters:
 *       - in: path
 *         name: assistant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assistant ID
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
 *       404:
 *         description: Assistant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:assistant_id/topics', async (req: Request, res: Response) => {
  try {
    logger.info(`Get topics for assistant ${req.params.assistant_id} request received`)
    const topics = await assistantApiService.getAssistantTopics(req.params.assistant_id)
    
    return res.json({
      success: true,
      data: topics
    })
  } catch (error: any) {
    logger.error('Error fetching assistant topics:', error)
    const statusCode = error.message.includes('not found') ? 404 : 503
    return res.status(statusCode).json({
      success: false,
      error: {
        message: `Failed to retrieve assistant topics: ${error.message}`,
        type: statusCode === 404 ? 'not_found' : 'service_unavailable',
        code: statusCode === 404 ? 'assistant_not_found' : 'topics_unavailable'
      }
    })
  }
})

export { router as assistantRoutes }