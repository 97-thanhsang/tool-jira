import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { config } from '../config';

const router = Router();

// Proxy all requests: GET/POST /api/jira/* → Jira REST API v2
// Express v5 uses path-to-regexp v8: wildcards must be named (/*path not /*)
router.all('/*path', async (req: Request, res: Response) => {
  const rawAuth = req.headers['x-jira-auth'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing X-Jira-Auth header' });
  }

  // Express v5 path-to-regexp v8: /*path captures an ARRAY of segments, not a string
  // e.g. /issue/PROJ-123/transitions → ['issue', 'PROJ-123', 'transitions']
  const rawPath = req.params['path'];
  const jiraPath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '');
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
