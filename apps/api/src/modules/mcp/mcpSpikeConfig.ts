/**
 * SPIKE ONLY (QLICKHUB-PRODUCT-MCP-SPIKE-OAUTH-HOSTING, branch `spike/mcp-oauth`).
 * Never merged to `main`. The MCP endpoint is mounted only when MCP_SPIKE_ENABLED=true and the
 * process is not production. S1 uses a static development token that maps to one user; S2
 * replaces it with OAuth.
 */
export interface McpSpikeConfig {
  enabled: boolean;
  /** Public URL of the MCP endpoint, used as the RFC 8707/9728 resource identifier. */
  resourceUrl: URL;
  devToken?: string;
  devUserId?: string;
  /** Issuer URLs advertised in Protected Resource Metadata (empty until S2). */
  authorizationServers?: string[];
}

export function readMcpSpikeConfig(source: NodeJS.ProcessEnv = process.env): McpSpikeConfig {
  const isProduction = source.NODE_ENV === 'production' || source.VERCEL_ENV === 'production';
  const enabled = source.MCP_SPIKE_ENABLED === 'true' && !isProduction;
  const resourceUrl = new URL(source.MCP_SPIKE_RESOURCE_URL || 'http://localhost:4000/mcp');
  const devToken = source.MCP_SPIKE_DEV_TOKEN?.trim();
  const devUserId = source.MCP_SPIKE_DEV_USER_ID?.trim();
  return {
    enabled,
    resourceUrl,
    devToken: devToken && devToken.length >= 32 ? devToken : undefined,
    devUserId: devUserId || undefined,
  };
}
