require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const S8_BASE = process.env.SERVICEM8_BASE || 'https://api.servicem8.com/api_1.0';
const S8_TOKEN = process.env.SERVICEM8_API_TOKEN || '';

// lowdb setup
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { messages: [], users: [] });

async function initDB(){
  await db.read();

  db.data.messages ||= [];
  db.data.users ||= [];

  await db.write();
}
initDB();

// session token implementation 
app.post('/api/login', async (req, res) => {
  const { email, phone } = req.body;
  if (!email || !phone) return res.status(400).json({ error: 'email and phone required' });

  await db.read();
  let user = db.data.users.find(u => u.email === email && u.phone === phone);
  if (!user) {
    user = { id: nanoid(), email, phone };
    db.data.users.push(user);
    await db.write();
  }

  // issue a simple token
  const token = nanoid(24);
  // store token in user for session
  user.token = token;
  await db.write();

  res.json({ token, user: { id: user.id, email: user.email, phone: user.phone }});
});

// Middleware to check session token
async function authMiddleware(req, res, next) {
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'Missing session token in x-session-token header' });
  await db.read();
  const user = db.data.users.find(u => u.token === token);
  if (!user) return res.status(401).json({ error: 'Invalid session token' });
  req.user = user;
  next();
}

// ServiceM8 proxy helper
async function servicem8Get(path, params = {}) {
  if (!S8_TOKEN) throw new Error('Missing ServiceM8 token - set SERVICEM8_API_TOKEN in .env');
  const url = `${S8_BASE}${path}`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${S8_TOKEN}`,
      Accept: 'application/json'
    },
    params
  });
  return resp.data;
}

// List bookings for user
app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { customer_email } = req.query;

    const filter = customer_email ? `?${encodeURIComponent("$filter")}=customer_email eq '${customer_email}'` : '';

    let data;
    try {
      data = await servicem8Get(`/jobactivity.json`, { /* optional query params */ });
    } catch (e) {
      console.warn('ServiceM8 fetch failed:', e.message);
      data = null;
    }
    if (!data) {
      // fallback mock data
      const now = new Date().toISOString();
      data = [
        { uuid: 'mock-1', job_uuid: 'job-1', title: 'Mock Booking A', scheduled_for: now, notes: 'Demo booking' },
        { uuid: 'mock-2', job_uuid: 'job-2', title: 'Mock Booking B', scheduled_for: now, notes: 'Demo booking 2' }
      ];
    }
    res.json({ bookings: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get booking detail - job or job activity
app.get('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    let data;
    try {
      data = await servicem8Get(`/job.json`, { $filter: `uuid eq '${id}'` });
    } catch (e) {
      console.log('job endpoint fetch failed, trying jobactivity');
      try {
        data = await servicem8Get(`/jobactivity.json`, { $filter: `uuid eq '${id}'` });
      } catch (e2) {
        console.warn('both S8 fetches failed', e2.message);
        data = null;
      }
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      // fallback mock
      data = { uuid: id, title: `Mock booking ${id}`, description: 'Fallback detail' };
    }
    res.json({ booking: data });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// Get attachments for booking - by job_uuid
app.get('/api/bookings/:id/attachments', authMiddleware, async (req, res) => {
  try {

    let attachments;
    try {
      attachments = await servicem8Get(`/attachment.json`, { $filter: `job_uuid eq '${req.params.id}'` });
    } catch (e) {
      console.warn('attachment fetch failed', e.message);
      attachments = null;
    }

    if (!attachments) {
      attachments = [
        { uuid: 'att-mock-1', filename: 'photo1.jpg', job_uuid: req.params.id },
        { uuid: 'att-mock-2', filename: 'invoice.pdf', job_uuid: req.params.id }
      ];
    }
    res.json({ attachments });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// Proxy attachment download
app.get('/api/attachments/:uuid/download', authMiddleware, async (req, res) => {
  try {
    const attUuid = req.params.uuid;
    if (!S8_TOKEN) return res.status(500).json({ error: 'ServiceM8 token not configured' });
    const url = `${S8_BASE}/attachment/${attUuid}.file`;

    const response = await axios.get(url, {
      responseType: 'stream',
      headers: { Authorization: `Bearer ${S8_TOKEN}` }
    });
    res.setHeader('content-type', response.headers['content-type'] || 'application/octet-stream');
    response.data.pipe(res);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'could not fetch attachment' });
  }
});

// Messages - persisted to db.json
app.get('/api/bookings/:id/messages', authMiddleware, async (req, res) => {
  await db.read();
  const msgs = db.data.messages.filter(m => m.bookingId === req.params.id);
  res.json({ messages: msgs });
});

app.post('/api/bookings/:id/messages', authMiddleware, async (req, res) => {
  const body = req.body;
  if (!body || !body.text) return res.status(400).json({ error: 'text required' });
  await db.read();
  const msg = {
    id: nanoid(),
    bookingId: req.params.id,
    userId: req.user.id,
    text: body.text,
    createdAt: new Date().toISOString()
  };
  db.data.messages.push(msg);
  await db.write();
  res.json({ message: msg });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
