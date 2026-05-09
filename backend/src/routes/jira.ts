import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { config } from '../config';

const router = Router();

// ─── Attachment proxy: stream binary content with auth ───────────────────────
// GET /api/jira/attachment-content/:id → streams image/file from Jira
// NOTE: Jira Server does NOT support ?redirect=false (Cloud only).
// We use maxRedirects + keep Authorization on redirect via httpAgent workaround.
router.get('/attachment-content/:id', async (req: Request, res: Response) => {
  const rawAuth = req.headers['x-jira-auth'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing auth' });
  }

  const id = req.params.id;
  // Jira Server: /secure/attachment/{id}/{filename} OR /rest/api/2/attachment/content/{id}
  // Both redirect to the actual file. Use the direct secure URL which redirects less.
  const jiraUrl = `${config.jiraBaseUrl}/rest/api/2/attachment/content/${id}`;

  try {
    const response = await axios({
      method: 'GET',
      url: jiraUrl,
      headers: {
        Authorization: `Basic ${authHeader}`,
        // Keep auth on redirect (Jira Server redirects to /secure/attachment/...)
        'X-Atlassian-Token': 'no-check',
      },
      responseType: 'stream',
      maxRedirects: 5,
      // axios strips Authorization on redirect by default — override with beforeRedirect
      beforeRedirect: (options: Record<string, unknown>) => {
        (options.headers as Record<string, string>)['Authorization'] = `Basic ${authHeader}`;
      },
    });

    const contentType =
      (response.headers['content-type'] as string) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    response.data.pipe(res);
  } catch (err) {
    const error = err as AxiosError;
    return res.status(error.response?.status || 500).json({ error: 'Attachment fetch failed' });
  }
});

// ─── Thumbnail proxy ─────────────────────────────────────────────────────────
// GET /api/jira/attachment-thumbnail/:id → thumbnail (smaller)
router.get('/attachment-thumbnail/:id', async (req: Request, res: Response) => {
  const rawAuth = req.headers['x-jira-auth'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing auth' });
  }

  const id = req.params.id;
  // Jira Server thumbnail: /secure/thumbnail/{id}/_thumb_{id}.png
  // REST thumbnail endpoint may not exist on Server — fall back to content
  const jiraUrl = `${config.jiraBaseUrl}/secure/thumbnail/${id}/_thumb_${id}.png`;

  try {
    const response = await axios({
      method: 'GET',
      url: jiraUrl,
      headers: {
        Authorization: `Basic ${authHeader}`,
        'X-Atlassian-Token': 'no-check',
      },
      responseType: 'stream',
      maxRedirects: 5,
      beforeRedirect: (options: Record<string, unknown>) => {
        (options.headers as Record<string, string>)['Authorization'] = `Basic ${authHeader}`;
      },
    });

    const contentType =
      (response.headers['content-type'] as string) || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    response.data.pipe(res);
  } catch {
    // Thumbnail not available — fall back to full content
    const fallbackUrl = `${config.jiraBaseUrl}/rest/api/2/attachment/content/${id}`;
    try {
      const response = await axios({
        method: 'GET',
        url: fallbackUrl,
        headers: { Authorization: `Basic ${authHeader}` },
        responseType: 'stream',
        maxRedirects: 5,
        beforeRedirect: (options: Record<string, unknown>) => {
          (options.headers as Record<string, string>)['Authorization'] = `Basic ${authHeader}`;
        },
      });
      const contentType = (response.headers['content-type'] as string) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      response.data.pipe(res);
    } catch (err2) {
      const error = err2 as AxiosError;
      return res.status(error.response?.status || 500).json({ error: 'Thumbnail fetch failed' });
    }
  }
});

// ─── Generic proxy: all other /api/jira/* requests ──────────────────────────
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
