import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

type Handler = (request: Request) => Promise<Response>;

async function toWebRequest(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(name, value);
  }

  return new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
}

/** Serves api/<name>.ts the way Vercel does, so `npm run dev` runs the functions without the Vercel CLI. */
export function apiRoutes(): Plugin {
  return {
    name: "backlog-lounge-api-routes",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const name = req.url?.match(/^\/api\/([a-z-]+)(?:\?|$)/)?.[1];
        if (!name) return next();

        try {
          const mod = (await server.ssrLoadModule(`/api/${name}.ts`)) as Record<string, Handler | undefined>;
          const handler = mod[req.method ?? "GET"];
          if (!handler) {
            res.statusCode = 405;
            res.end();

            return;
          }

          const response = await handler(await toWebRequest(req));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.error(`/api/${name} failed`, error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Server error" }));
        }
      });
    },
  };
}
