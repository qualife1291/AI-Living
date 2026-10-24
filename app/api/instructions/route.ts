import { instructions, lifeInstructions } from '@/lib/world';
import { readWorld } from '@/lib/store';
import { synthesizeContextPrompt } from '@/lib/training';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeContext = url.searchParams.get('context') === '1';

  let bodyText = instructions + lifeInstructions;
  if (includeContext) {
    try {
      const { world, revision, serverNow } = await readWorld();
      bodyText += '\n\n' + synthesizeContextPrompt(world, Date.parse(serverNow), revision);
    } catch {
      // Fallback to static instructions if DB is unavailable
    }
  }

  return new Response(bodyText, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'private, no-store',
    },
  });
}
