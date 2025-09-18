import express, { Request, Response } from 'express'

import { loggerService } from '../../services/LoggerService'
import { reduxService } from '../../services/ReduxService'

const logger = loggerService.withContext('ApiServerAssistantsRoutes')

const router = express.Router()

/**
 * @swagger
 * /v1/assistants:
 *   get:
 *     summary: List assistants
 *     description: Get a list of all configured assistants
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('Get all assistants request received')
    
    const state = reduxService.getState()
    const assistants = state.assistants.assistants
    
    return res.json({
      success: true,
      data: assistants.map(assistant => ({
        id: assistant.id,
        name: assistant.name,
        emoji: assistant.emoji,
        prompt: assistant.prompt,
        type: assistant.type,
        model: assistant.model,
        topics: assistant.topics.map(topic => ({
          id: topic.id,
          name: topic.name,
          assistantId: topic.assistantId,
          createdAt: topic.createdAt,
          updatedAt: topic.updatedAt
        }))
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching assistants:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: `Failed to retrieve assistants: ${error.message}`,
        type: 'internal_error',
        code: 'assistants_unavailable'
      }
    })
  }
})

/**
 * @swagger
 * /v1/assistants/{assistant_id}:
 *   get:
 *     summary: Get assistant details
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
    logger.info('Get assistant details request received', { assistantId: req.params.assistant_id })
    
    const state = reduxService.getState()
    const assistant = state.assistants.assistants.find(a => a.id === req.params.assistant_id)
    
    if (!assistant) {
      logger.warn('Assistant not found', { assistantId: req.params.assistant_id })
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
      data: {
        id: assistant.id,
        name: assistant.name,
        emoji: assistant.emoji,
        prompt: assistant.prompt,
        type: assistant.type,
        model: assistant.model,
        settings: assistant.settings,
        topics: assistant.topics.map(topic => ({
          id: topic.id,
          name: topic.name,
          assistantId: topic.assistantId,
          createdAt: topic.createdAt,
          updatedAt: topic.updatedAt
        }))
      }
    })
  } catch (error: any) {
    logger.error('Error fetching assistant details:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: `Failed to retrieve assistant details: ${error.message}`,
        type: 'internal_error',
        code: 'assistant_details_unavailable'
      }
    })
  }
})

export { router as assistantsRoutes }