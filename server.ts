import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './server/config.ts';
import { adminRouter } from './server/routes/admin.ts';
import { apiRouter } from './server/routes/api.ts';
import { startMatchingSweep } from './server/services/matchingService.ts';
import { store } from './server/services/store.ts';
import { attachWebSocketServer } from './server/ws/socketServer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.use('/api', apiRouter);
  app.use('/api/admin', adminRouter);

  const server = http.createServer(app);
  attachWebSocketServer(server);
  store.startSweeper();
  startMatchingSweep();

  if (!config.isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(config.port, '0.0.0.0', () => {
    console.log(
      `[Fısıltı] Sunucu http://0.0.0.0:${config.port} adresinde (${config.nodeEnv}) çalışıyor.`,
    );
  });
}

bootstrap().catch((err) => {
  console.error('[Fısıltı] Sunucu başlatma hatası:', err);
  process.exit(1);
});
