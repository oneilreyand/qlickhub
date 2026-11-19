import { Router, type Request, type Response } from 'express';
import {
  bearerAuthChallengeResponse,
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  verifyBearerToken,
  type AuthInfo,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import type { McpSpikeConfig } from './mcpSpikeConfig.js';
import { buildMcpServer } from './mcpServerFactory.js';

type McpRequest = Request & { auth?: AuthInfo };

async function sendWebResponse(res: Response, response: globalThis.Response): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(Buffer.from(await response.arrayBuffer()));
}

/**
 * SPIKE: `/mcp` resource server. Bearer token verification happens here; the SDK handler only
 * receives already-verified AuthInfo (it never reads headers itself).
 */
export function createMcpSpikeRouter(config: McpSpikeConfig, verifier: OAuthTokenVerifier): Router {
  const router = Router();
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(config.resourceUrl);
  const handler = createMcpHandler(buildMcpServer, { legacy: 'stateless', responseMode: 'json' });
  const nodeHandler = toNodeHandler(handler);

  // RFC 9728 Protected Resource Metadata. S1 has no authorization server yet; S2 fills it in.
  router.get(new URL(resourceMetadataUrl).pathname, (_req, res) => {
    res.json({
      resource: config.resourceUrl.href,
      authorization_servers: config.authorizationServers ?? [],
      bearer_methods_supported: ['header'],
      resource_name: 'Qlick Hub (spike)',
    });
  });

  router.all('/mcp', async (req: McpRequest, res: Response) => {
    try {
      req.auth = await verifyBearerToken(req.get('authorization'), {
        verifier,
        expectedResource: config.resourceUrl,
        resourceMetadataUrl,
      });
    } catch (error) {
      await sendWebResponse(res, bearerAuthChallengeResponse(error, { resourceMetadataUrl }));
      return;
    }
    await nodeHandler(req, res, req.body);
  });

  return router;
}
