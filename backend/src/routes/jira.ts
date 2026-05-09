import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { config } from '../config';

const router = Router();

// Proxy all requests: GET/POST /api/jira/* → Jira REST API v2
router.all('/*', async (req: Request, res: Response) => {
  const rawAuth = req.headers['x-jira-auth'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing X-Jira-Auth header' });
  }

  const jiraPath = req.params[0]; // everything after /api/jira/
  const jiraUrl = `${config.jiraBaseUrl}/rest/api/2/${jiraPath}`;

  try {
    const response = await axios({
      method: req.method,
      url: jiraUrl,
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      params: req.query,
      data: req.method !== 'GET' ? req.body : undefined,
    });

    return res.status(response.status).json(response.data);
  } catch (err) {
    const error = err as AxiosError;
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Jira API error' };
    return res.status(status).json(data);
  }
});

export default router;
