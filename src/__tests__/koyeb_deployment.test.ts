/// <reference types="node" />
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

describe('Koyeb Deployment & Health Check Parity Suite', () => {
  const rootDir = path.resolve(process.cwd());

  describe('1. Dockerfile Production Architecture for Koyeb', () => {
    const dockerfilePath = path.join(rootDir, 'Dockerfile');

    it('exists in the repository root', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('contains multi-stage build optimized for 512MB RAM nano tier', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('FROM node:20-alpine AS builder');
      expect(content).toContain('FROM node:20-alpine AS runner');
      expect(content).toContain('npm run build');
      expect(content).toContain('npm ci --omit=dev');
    });

    it('includes dumb-init for clean process signal handling (SIGTERM/SIGINT)', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('dumb-init');
      expect(content).toContain('ENTRYPOINT ["/usr/bin/dumb-init", "--"]');
    });

    it('configures port 8000 and HTTP health check probe', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('EXPOSE 8000');
      expect(content).toContain('ENV PORT=8000');
      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('/health');
    });

    it('runs as non-root user for container security', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('USER node');
    });

    it('sets correct entry command for unified Telegram & VK bot runner', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('CMD ["node", "bot/bot.mjs", "--all"]');
    });
  });

  describe('2. Koyeb Configuration File (koyeb.yaml)', () => {
    const koyebYamlPath = path.join(rootDir, 'koyeb.yaml');

    it('exists in the repository root', () => {
      expect(fs.existsSync(koyebYamlPath)).toBe(true);
    });

    it('defines web service on port 8000 in European region (Frankfurt)', () => {
      const content = fs.readFileSync(koyebYamlPath, 'utf-8');
      expect(content).toContain('name: it-start');
      expect(content).toContain('type: web');
      expect(content).toContain('fra');
      expect(content).toContain('port: 8000');
      expect(content).toContain('plan: nano');
    });

    it('configures automated HTTP health checks on /health', () => {
      const content = fs.readFileSync(koyebYamlPath, 'utf-8');
      expect(content).toContain('health_checks:');
      expect(content).toContain('path: /health');
      expect(content).toContain('port: 8000');
    });

    it('specifies essential environment variables', () => {
      const content = fs.readFileSync(koyebYamlPath, 'utf-8');
      expect(content).toContain('NODE_ENV');
      expect(content).toContain('PORT');
      expect(content).toContain('TELEGRAM_BOT_TOKEN');
      expect(content).toContain('VK_BOT_TOKEN');
      expect(content).toContain('KOYEB_PUBLIC_URL');
    });
  });

  describe('3. Docker Build Context (.dockerignore)', () => {
    const dockerignorePath = path.join(rootDir, '.dockerignore');

    it('exists and excludes heavy / sensitive files', () => {
      expect(fs.existsSync(dockerignorePath)).toBe(true);
      const content = fs.readFileSync(dockerignorePath, 'utf-8');
      expect(content).toContain('node_modules');
      expect(content).toContain('.git');
      expect(content).toContain('.env');
      expect(content).toContain('videos');
      expect(content).toContain('dist');
    });
  });

  describe('4. Live HTTP Health Check and API Server', () => {
    let botModule: any;
    let testServer: http.Server;
    let serverPort: number;

    beforeAll(async () => {
      // @ts-ignore
      botModule = await import('../../bot/bot.mjs');
      testServer = botModule.server;

      await new Promise<void>((resolve, reject) => {
        testServer.listen(0, '127.0.0.1', () => {
          const addr = testServer.address();
          if (addr && typeof addr === 'object') {
            serverPort = addr.port;
            resolve();
          } else {
            reject(new Error('Failed to obtain server address'));
          }
        });
      });
    });

    afterAll(async () => {
      if (testServer && testServer.listening) {
        await new Promise<void>((resolve) => testServer.close(() => resolve()));
      }
    });

    it('exports server and default PORT configuration', () => {
      expect(botModule.server).toBeDefined();
      expect(typeof botModule.PORT).toBe('number');
      expect(botModule.PORT).toBeGreaterThan(0);
    });

    it('exports BACKEND_URL and backwards-compatible RENDER_URL', () => {
      expect(botModule.BACKEND_URL).toBeDefined();
      expect(botModule.RENDER_URL).toBe(botModule.BACKEND_URL);
      expect(botModule.BACKEND_URL).toMatch(/^https?:\/\//);
    });

    it('responds to GET /health with HTTP 200 and comprehensive JSON status', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(typeof data.uptime).toBe('number');
      expect(data.bot).toBe('IT_start_izh_bot');
      expect(typeof data.channelsCount).toBe('number');
      expect(data.channelsCount).toBeGreaterThanOrEqual(10);
      expect(typeof data.websitesCount).toBe('number');
      expect(data.websitesCount).toBeGreaterThanOrEqual(5);
      expect(data.lastScan).toBeDefined();
    });

    it('responds to HEAD /health with HTTP 200 and empty body', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/health`, { method: 'HEAD' });
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('');
    });

    it('responds to GET / with HTTP 200 (serves web index or health message)', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    });

    it('responds to HEAD / with HTTP 200', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/`, { method: 'HEAD' });
      expect(res.status).toBe(200);
    });

    it('responds to GET /status with status ok and monitoring counts', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/status`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.bot).toBe('IT_start_izh_bot');
      expect(data.companiesCount).toBeGreaterThan(0);
    });

    it('responds to GET /vk/status with VK bot state', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/vk/status`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.bot).toContain('VK');
      expect(data.status).toBeDefined();
    });

    it('handles CORS OPTIONS preflight request with HTTP 204', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/health`, { method: 'OPTIONS' });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-methods')).toContain('GET');
    });

    it('responds to GET /vacancies with active internships array', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/vacancies`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('5. VK Bot Runner Parity on Koyeb', () => {
    it('exports BACKEND_URL and RENDER_URL matching Koyeb config', async () => {
      // @ts-ignore
      const vkBot = await import('../../bot/vk_bot.mjs');
      expect(vkBot.BACKEND_URL).toBeDefined();
      expect(vkBot.RENDER_URL).toBe(vkBot.BACKEND_URL);
      expect(vkBot.RENDER_URL).toMatch(/^https?:\/\//);
    });

    it('supports fallback mock mode when VK_BOT_TOKEN is omitted', async () => {
      // @ts-ignore
      const vkBot = await import('../../bot/vk_bot.mjs');
      const startResult = await vkBot.startVkBot('');
      expect(startResult.running).toBe(true);
      expect(startResult.mode).toBe('fallback');
    });
  });

  describe('6. Frontend Koyeb URL Compatibility', () => {
    it('subscriptionService points to Koyeb by default with RENDER_URL alias', async () => {
      const subService = await import('../services/subscriptionService');
      expect(subService.BACKEND_URL).toBeDefined();
      expect(subService.RENDER_URL).toBe(subService.BACKEND_URL);
      expect(subService.BACKEND_URL).toContain('koyeb.app');
    });
  });
});
