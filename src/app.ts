import { Hono } from 'hono'

import { registerRoutes } from './routes/register.js'
import { registerBundledFrontend } from './staticFrontend.js'

const app = new Hono()

registerRoutes(app)
registerBundledFrontend(app)

export default app
