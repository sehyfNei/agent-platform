const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3-32b';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

const llmProviders = [
  { name: 'Groq', models: ['qwen/qwen3-32b', 'llama-3.3-70b-versatile'], active: true },
  { name: 'GPT OSS', models: ['gpt-oss-*'], active: 'config-only' },
  { name: 'Llama', models: ['llama-*'], active: 'config-only' }
];

const dataAgents = [
  { id: 'rbi-agent', source: 'RBI bulletins and databases', cadence: 'daily', purpose: 'inflation, repo, money supply' },
  { id: 'gov-agent', source: 'State and central government reports', cadence: 'weekly', purpose: 'budget and scheme metrics' },
  { id: 'market-agent', source: 'AngelOne, Yahoo Finance, Zerodha Open APIs', cadence: 'hourly', purpose: 'markets and sentiment' },
  { id: 'news-agent', source: 'Daily scraped economics news sources', cadence: 'daily', purpose: 'article summaries' },
  { id: 'wef-agent', source: 'WEF publications', cadence: 'weekly', purpose: 'global macro context' }
];

async function readJsonBody(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 2_000_000) throw new Error('Payload too large');
  }
  return data ? JSON.parse(data) : {};
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(payload));
}

function cleanText(raw = '') {
  return String(raw).replace(/\s+/g, ' ').replace(/[\u0000-\u001f]+/g, ' ').trim();
}

function stripHtmlToText(html) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
  );
}

async function fetchArticleText(link) {
  const url = new URL(link);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid URL protocol');
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Unable to fetch article: ${response.status}`);
  const html = await response.text();
  return stripHtmlToText(html).slice(0, 9000);
}

async function summarizeWithGroq({ title, content, sourceType }) {
  if (!GROQ_API_KEY) {
    return {
      mode: 'fallback',
      summary: {
        topic: title || 'Economics topic',
        easyExplanation: 'Set GROQ_API_KEY to enable live AI summaries.',
        examAngle: [
          'Identify concept, trend, and policy response.',
          'Link with RBI/budget context for exam answers.',
          'Use 2-3 current data points in your answer.'
        ],
        quickRevision: ['Definition', 'Recent trend', 'Policy action', 'Way forward']
      }
    };
  }

  const prompt = `You are an economics mentor for Indian competitive exams.
Return strict JSON with keys: topic, easyExplanation, examAngle(array of 3), quickRevision(array of 4), likelyQuestions(array of 3).
Keep language simple and accurate.
SourceType: ${sourceType}
Title: ${title || 'N/A'}
Content:\n${content.slice(0, 8000)}`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You produce concise exam-oriented economics explanations in JSON only.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Groq API error ${r.status}: ${err.slice(0, 400)}`);
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { topic: title || 'Economics topic', easyExplanation: text, examAngle: [], quickRevision: [], likelyQuestions: [] };
    }

    return {
      mode: 'groq-live',
      model: GROQ_MODEL,
      summary: parsed
    };
  } catch (error) {
    return {
      mode: 'fallback',
      warning: `Live Groq call failed: ${error.message}`,
      summary: {
        topic: title || 'Economics topic',
        easyExplanation: 'Live AI is unreachable from current network. Using local backup summary format.',
        examAngle: [
          'State what changed in the economy and why it matters.',
          'Connect with policy tools: repo rate, fiscal spending, reforms.',
          'Mention one data point and one risk factor.'
        ],
        quickRevision: ['Concept', 'Latest trend', 'Policy response', 'Exam-ready conclusion'],
        likelyQuestions: ['Why did this indicator change?', 'How will policy respond?', 'Impact on growth and inflation?']
      }
    };
  }
}

async function loadDataset() {
  const datasetPath = path.join(PUBLIC_DIR, 'data', 'economics-dataset.json');
  const raw = await fs.readFile(datasetPath, 'utf-8');
  return JSON.parse(raw);
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'economics-dashboard-api',
      runtime: 'node-http-native',
      groqConfigured: Boolean(GROQ_API_KEY),
      llmProviders,
      dbTargets: ['Railway PostgreSQL', 'Hostinger MySQL']
    });
  }

  if (req.method === 'GET' && pathname === '/api/agents') {
    return sendJson(res, 200, { agents: dataAgents });
  }

  if (req.method === 'GET' && pathname === '/api/dashboard/economics') {
    const dataset = await loadDataset();
    return sendJson(res, 200, { generatedAt: new Date().toISOString(), dashboard: dataset.economics });
  }

  if (req.method === 'GET' && pathname === '/api/dashboard/econometrics') {
    const dataset = await loadDataset();
    return sendJson(res, 200, { generatedAt: new Date().toISOString(), dashboard: dataset.econometrics });
  }

  if (req.method === 'GET' && pathname === '/api/config/stack') {
    return sendJson(res, 200, {
      hosting: ['Hostinger', 'Railway'],
      database: ['Railway PostgreSQL', 'Hostinger MySQL'],
      dataSources: ['RBI', 'WEF', 'State and central government reports', 'AngelOne API', 'Yahoo Finance API', 'Zerodha Open API', 'Daily scraped economic news'],
      architecture: 'Autonomous AI agents per data-source microservice with orchestration gateway.'
    });
  }

  if (req.method === 'POST' && pathname === '/api/ai/summarize') {
    const body = await readJsonBody(req);
    const sourceType = body.sourceType || 'text';
    const sourceLink = cleanText(body.sourceLink || '');
    const inputText = cleanText(body.inputText || body.extractedText || '');

    if (!sourceLink && !inputText) {
      return sendJson(res, 400, { error: 'Provide sourceLink, inputText, or extractedText.' });
    }

    let content = inputText;
    if (sourceLink && !content) {
      content = await fetchArticleText(sourceLink);
    }

    const result = await summarizeWithGroq({
      title: sourceLink || 'Pasted economics content',
      content,
      sourceType
    });

    return sendJson(res, 200, {
      provider: 'Groq',
      sourceType,
      sourceLink,
      inputCharacters: content.length,
      ...result
    });
  }

  return sendJson(res, 404, { error: 'API route not found' });
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsed.pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      return res.end();
    }

    if (pathname.startsWith('/api/')) {
      return await handleApi(req, res, pathname);
    }

    return await serveStatic(req, res, pathname);
  } catch (error) {
    return sendJson(res, 500, { error: 'Internal server error', detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Economics dashboard running on http://localhost:${PORT}`);
});
