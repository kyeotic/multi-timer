import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { serveStatic, withCors, joinDir } from '@kyeotic/server'

import config from './config.ts'

const staticDir = joinDir(import.meta.url, config.distDir)

Deno.serve({ port: config.port }, handler)

async function handler(request: Request) {
  const url = new URL(request.url)
  // Only used for start-server-and-test package that
  // expects a 200 OK to start testing the server
  if (request.method === 'HEAD') {
    return new Response()
  }

  return serveStatic(request, { rootDir: staticDir })
}
