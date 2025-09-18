import express, { Request, Response } from 'express'

import { loggerService } from '../../services/LoggerService'
import { mcpApiService } from '../services/mcp'

const logger = loggerService.withContext('ApiServerMCPRoutes')

const router = express.Router()

/**
 * @swagger
 * /v1/mcps:
 *   get:
 *     summary: List MCP servers
 *     description: Get a list of all configured Model Context Protocol servers
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: List of MCP servers
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
 *                     $ref: '#/components/schemas/MCPServer'
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('Get all MCP servers request received')
    const servers = await mcpApiService.getAllServers(req)
    return res.json({
      success: true,
      data: servers
    })
  } catch (error: any) {
    logger.error('Error fetching MCP servers:', error)
    return res.status(503).json({
      success: false,
      error: {
        message: `Failed to retrieve MCP servers: ${error.message}`,
        type: 'service_unavailable',
        code: 'servers_unavailable'
      }
    })
  }
})

/**
 * @swagger
 * /v1/mcps/{server_id}:
 *   get:
 *     summary: Get MCP server info
 *     description: Get detailed information about a specific MCP server
 *     tags: [MCP]
 *     parameters:
 *       - in: path
 *         name: server_id
 *         required: true
 *         schema:
 *           type: string
 *         description: MCP server ID
 *     responses:
 *       200:
 *         description: MCP server information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MCPServer'
 *       404:
 *         description: MCP server not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   $ref: '#/components/schemas/Error'
 */
router.get('/:server_id', async (req: Request, res: Response) => {
  try {
    logger.info('Get MCP server info request received')
    const server = await mcpApiService.getServerInfo(req.params.server_id)
    if (!server) {
      logger.warn('MCP server not found')
      return res.status(404).json({
        success: false,
        error: {
          message: 'MCP server not found',
          type: 'not_found',
          code: 'server_not_found'
        }
      })
    }
    return res.json({
      success: true,
      data: server
    })
  } catch (error: any) {
    logger.error('Error fetching MCP server info:', error)
    return res.status(503).json({
      success: false,
      error: {
        message: `Failed to retrieve MCP server info: ${error.message}`,
        type: 'service_unavailable',
        code: 'server_info_unavailable'
      }
    })
  }
})

// Connect to MCP server
router.all('/:server_id/mcp', async (req: Request, res: Response) => {
  const server = await mcpApiService.getServerById(req.params.server_id)
  if (!server) {
    logger.warn('MCP server not found')
    return res.status(404).json({
      success: false,
      error: {
        message: 'MCP server not found',
        type: 'not_found',
        code: 'server_not_found'
      }
    })
  }
  return await mcpApiService.handleRequest(req, res, server)
})

/**
 * @swagger
 * /v1/mcps/{server_id}/sse:
 *   get:
 *     summary: Connect to MCP server via SSE
 *     description: Establish a Server-Sent Events connection to an MCP server for real-time communication
 *     tags: [MCP]
 *     parameters:
 *       - in: path
 *         name: server_id
 *         required: true
 *         schema:
 *           type: string
 *         description: MCP server ID
 *     responses:
 *       200:
 *         description: SSE connection established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       404:
 *         description: MCP server not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:server_id/sse', async (req: Request, res: Response) => {
  const server = await mcpApiService.getServerById(req.params.server_id)
  if (!server) {
    logger.warn('MCP server not found for SSE connection')
    return res.status(404).json({
      success: false,
      error: {
        message: 'MCP server not found',
        type: 'not_found',
        code: 'server_not_found'
      }
    })
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization'
  })

  try {
    // Get server capabilities and tools for initial connection
    const serverInfo = await mcpApiService.getServerInfo(server.id)
    
    // Send initial connection event with server capabilities
    res.write(`data: ${JSON.stringify({ 
      type: 'connection', 
      server: { 
        id: server.id, 
        name: server.name,
        type: server.type,
        description: server.description || 'MCP Server'
      },
      tools: serverInfo?.tools || [],
      timestamp: new Date().toISOString()
    })}\n\n`)

    logger.info(`SSE connection established for server: ${server.name} (${server.id})`)
  } catch (error) {
    logger.error(`Failed to get server info for SSE connection: ${error}`)
    res.write(`data: ${JSON.stringify({ 
      type: 'connection', 
      server: { 
        id: server.id, 
        name: server.name,
        type: server.type
      },
      error: 'Failed to load server capabilities',
      timestamp: new Date().toISOString()
    })}\n\n`)
  }

  // Handle client disconnect
  req.on('close', () => {
    logger.info(`SSE client disconnected from server: ${server.name}`)
    res.end()
  })

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ 
      type: 'heartbeat', 
      timestamp: new Date().toISOString()
    })}\n\n`)
  }, 30000) // Every 30 seconds

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeat)
  })
})

/**
 * @swagger
 * /v1/mcp:
 *   get:
 *     summary: Connect to Assistant Manager MCP via SSE
 *     description: Establish a Server-Sent Events connection to the built-in Assistant Manager MCP server for AI to manage assistants and topics
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: SSE connection established to Assistant Manager
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       503:
 *         description: Assistant Manager MCP server not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assistant-manager/sse', async (req: Request, res: Response) => {
  try {
    // Find the assistant-manager server
    const servers = await mcpApiService.getAllServers(req)
    const assistantManagerServer = Object.values(servers.servers).find(
      server => server.name === '@cherry/assistant-manager'
    )

    if (!assistantManagerServer) {
      logger.warn('Assistant Manager MCP server not found or not active')
      return res.status(503).json({
        success: false,
        error: {
          message: 'Assistant Manager MCP server not available',
          type: 'service_unavailable',
          code: 'assistant_manager_unavailable'
        }
      })
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization'
    })

    try {
      // Get assistant-manager server info and capabilities
      const serverInfo = await mcpApiService.getServerInfo(assistantManagerServer.id)
      
      // Send initial connection event with assistant management capabilities
      res.write(`data: ${JSON.stringify({ 
        type: 'connection',
        server: {
          id: assistantManagerServer.id,
          name: assistantManagerServer.name,
          type: assistantManagerServer.type,
          description: 'Assistant and topic management for Cherry Studio'
        },
        capabilities: {
          assistant_management: true,
          topic_management: true,
          message_management: true
        },
        tools: serverInfo?.tools || [],
        timestamp: new Date().toISOString()
      })}\n\n`)

      logger.info(`Assistant Manager SSE connection established`)
    } catch (error) {
      logger.error(`Failed to get assistant-manager server info: ${error}`)
      res.write(`data: ${JSON.stringify({ 
        type: 'connection',
        server: {
          id: assistantManagerServer.id,
          name: assistantManagerServer.name,
          type: assistantManagerServer.type,
          description: 'Assistant and topic management for Cherry Studio'
        },
        error: 'Failed to load server capabilities',
        timestamp: new Date().toISOString()
      })}\n\n`)
    }

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ 
        type: 'heartbeat', 
        timestamp: new Date().toISOString()
      })}\n\n`)
    }, 30000) // Every 30 seconds

    // Handle client disconnect
    const cleanup = () => {
      clearInterval(heartbeat)
      logger.info('Assistant Manager SSE client disconnected')
    }

    req.on('close', cleanup)
    req.on('end', cleanup)

  } catch (error: any) {
    logger.error('Error setting up Assistant Manager SSE connection:', error)
    return res.status(503).json({
      success: false,
      error: {
        message: `Failed to establish Assistant Manager connection: ${error.message}`,
        type: 'service_unavailable',
        code: 'connection_failed'
      }
    })
  }
})

/**
 * @swagger
 * /v1/mcp/assistant-manager:
 *   all:
 *     summary: Connect to Assistant Manager MCP
 *     description: Direct communication with the built-in Assistant Manager MCP server
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: MCP communication successful
 *       503:
 *         description: Assistant Manager MCP server not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.all('/assistant-manager', async (req: Request, res: Response) => {
  try {
    // Find the assistant-manager server
    const servers = await mcpApiService.getAllServers(req)
    const assistantManagerServer = Object.values(servers.servers).find(
      server => server.name === '@cherry/assistant-manager'
    )

    if (!assistantManagerServer) {
      logger.warn('Assistant Manager MCP server not found for direct communication')
      return res.status(503).json({
        success: false,
        error: {
          message: 'Assistant Manager MCP server not available',
          type: 'service_unavailable',
          code: 'assistant_manager_unavailable'
        }
      })
    }

    // Get the server by ID and forward the request
    const server = await mcpApiService.getServerById(assistantManagerServer.id)
    if (!server) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assistant Manager MCP server not found',
          type: 'not_found',
          code: 'server_not_found'
        }
      })
    }

    return await mcpApiService.handleRequest(req, res, server)
  } catch (error: any) {
    logger.error('Error handling Assistant Manager MCP request:', error)
    return res.status(503).json({
      success: false,
      error: {
        message: `Failed to communicate with Assistant Manager: ${error.message}`,
        type: 'service_unavailable',
        code: 'communication_failed'
      }
    })
  }
})

export { router as mcpRoutes }
