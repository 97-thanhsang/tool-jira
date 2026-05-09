import express from 'express';
import cors from 'cors';
import { config } from './config';
import jiraRouter from './routes/jira';
import './db';

const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Jira proxy: /api/jira/* → Jira REST API
app.use('/api/jira', jiraRouter);

app.listen(config.port, () => {
  console.log(`Backend running at http://localhost:${config.port}`);
});
