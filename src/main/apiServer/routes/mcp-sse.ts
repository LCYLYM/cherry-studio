import express, { Request, Response } from 'express'

import { loggerService } from '../../services/LoggerService'
import { assistantMCPService } from '../services/assistant-mcp'

const logger = loggerService.withContext('ApiServerMCPSSERoutes')

const router = express.Router()

/**
 * @swagger
 * /mmcp:
 *   all:
 *     summary: Assistant Management MCP Server-Sent Events endpoint
 *     description: Server-Sent Events endpoint for Model Context Protocol assistant management
 *     tags: [MCP SSE]
 *     responses:
 *       200:
 *         description: SSE stream for MCP communication
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-sent events stream
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.all('/', async (req: Request, res: Response) => {
  try {
    logger.info('MCP SSE request received for assistant management')
    
    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })
    
    // Get the MCP server instance
    const mcpServer = assistantMCPService.getServer()
    
    // Handle the MCP communication
    if (req.method === 'POST' && req.body) {
      try {
        const request = req.body
        logger.debug('Processing MCP request', { method: request.method })
        
        // Process the request through the MCP server
        let result
        if (request.method === 'tools/list') {
          result = await mcpServer.request({ method: 'tools/list' }, {})
        } else if (request.method === 'tools/call') {
          result = await mcpServer.request(
            { 
              method: 'tools/call', 
              params: { 
                name: request.params.name, 
                arguments: request.params.arguments 
              } 
            }, 
            {}
          )
        } else {
          throw new Error(`Unsupported method: ${request.method}`)
        }
        
        // Send the result as SSE
        res.write(`data: ${JSON.stringify(result)}\n\n`)
        
      } catch (error: any) {
        logger.error('Error processing MCP request:', error)
        res.write(`data: ${JSON.stringify({
          error: {
            message: error.message,
            type: 'mcp_error'
          }
        })}\n\n`)
      }
    } else if (req.method === 'GET') {
      // Send initial connection message
      res.write(`data: ${JSON.stringify({
        type: 'connection',
        message: 'Connected to Cherry Studio Assistant MCP Server',
        capabilities: {
          tools: true
        }
      })}\n\n`)
    }
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`)
    }, 30000)
    
    // Clean up on connection close
    req.on('close', () => {
      clearInterval(keepAlive)
      logger.info('MCP SSE connection closed')
    })
    
  } catch (error: any) {
    logger.error('Error setting up MCP SSE connection:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          message: `Failed to establish MCP SSE connection: ${error.message}`,
          type: 'internal_error',
          code: 'mcp_sse_failed'
        }
      })
    }
  }
})

export { router as mcpSSERoutes }