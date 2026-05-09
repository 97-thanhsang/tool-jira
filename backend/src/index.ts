import express from 'express';
import cors from 'cors';
import { config } from './config';
import jiraRouter from './routes/jira';
import aiRouter from './routes/ai';
import './db';

const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
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
