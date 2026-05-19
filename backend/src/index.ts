import express from 'express';
import cors from 'cors';
import { config } from './config';
import jiraRouter from './routes/jira';
import aiRouter from './routes/ai';
import './db';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://tool-jira.vercel.app',
];

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /^https:\/\/tool-jira-[a-z0-9-]+-97-thanhsangs-projects\.vercel\.app$/.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Jira proxy: /api/jira/* → Jira REST API
app.use('/api/jira', jiraRouter);

// AI routes: /api/ai/* → Google Gemini (stateless, key per request)
app.use('/api/ai', aiRouter);

app.listen(config.port, () => {
  console.log(`Backend running at http://localhost:${config.port}`);
});
