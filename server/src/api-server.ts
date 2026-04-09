import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { Server } from 'socket.io';
import { mockTrafficService } from './mockTrafficService';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize the Mock Traffic generator
mockTrafficService.initialize(io);

// Express Routes matching the frontend lib/api.ts logic
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/session', async (req, res) => {
  try {
    const session = await mockTrafficService.createSession(req.body);
    res.json({ session });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session and fetch traffic' });
  }
});

app.get('/api/session/:userId', (req, res) => {
  const session = mockTrafficService.getSession(req.params.userId);
  if (session) res.json({ session });
  else res.status(404).json({ error: 'Session not found' });
});

app.put('/api/session/:userId/location', (req, res) => {
  const session = mockTrafficService.updateLocation(req.params.userId, req.body.location);
  res.json({ session });
});

app.get('/api/traffic/:userId', (req, res) => {
  const traffic = mockTrafficService.getTraffic(req.params.userId);
  if (traffic) res.json({ traffic });
  else res.status(404).json({ error: 'Traffic data not found' });
});

app.delete('/api/session/:userId', (req, res) => {
  mockTrafficService.stopSession(req.params.userId);
  res.json({ success: true });
});

app.put('/api/session/:userId/settings', (req, res) => {
  const session = mockTrafficService.updateSettings(req.params.userId, req.body);
  res.json({ session });
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log('A client connected via WebSocket:', socket.id);

  socket.on('check_traffic', async (data) => {
    console.log(`Client requested force traffic check for user: ${data.userId}`);
    await mockTrafficService.forceCheck(data.userId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
