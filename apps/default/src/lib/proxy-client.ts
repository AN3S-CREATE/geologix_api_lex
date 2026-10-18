import { GenesisClient } from '@taskade/genesis-client';

const SPACE_ID = '4fuivqdpdmaagkoa';

export const proxyClient = new GenesisClient({ spaceId: SPACE_ID });

/**
 * Proxy a fetch call through Genesis — the secret is resolved server-side and
 * never crosses to the browser. Returns the raw upstream Response so streaming
 * (SSE / ReadableStream) works as if you called fetch directly.
 */
export async function proxyFetch(
  secretAlias: string,
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Response> {
  return proxyClient.proxy({
    secretAlias,
    url,
    method,
    headers,
    body,
  });
}
