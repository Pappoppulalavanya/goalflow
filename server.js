/**
 * GoalFlow - Backend API Server (Production Reference)
 * 
 * NOTE: For the hackathon demo, open index.html directly in a browser.
 *       This file is the production Node.js/Express backend reference.
 * 
 * To run this server:
 *   npm install
 *   node server.js
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'goalflow-secret-key';

// ── Mock Users DB ─────────────────────────────────────────────────────────────
const USERS = [
  { id: 1, name: 'Priya Sharma',  email: 'priya@atomquest.in',  password: 'emp123',   role: 'employee', managerId: 3, dept: 'Engineering' },
  { id: 2, name: 'Rahul Verma',   email: 'rahul@atomquest.in',  password: 'emp123',   role: 'employee', managerId: 3, dept: 'Product'     },
  { id: 3, name: 'Meera Nair',    email: 'meera@atomquest.in',  password: 'mgr123',   role: 'manager',  managerId: null, dept: 'Engineering' },
  { id: 4, name: 'Admin User',    email: 'admin@atomquest.in',  password: 'admin123', role: 'admin',    managerId: null, dept: 'HR'          },
];

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '8h' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ── Middleware: Auth Check ────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Goals API ─────────────────────────────────────────────────────────────────
let goalsDB = [];
let goalIdCounter = 1;

// GET /api/goals - get goals (employee sees own, manager sees team)
app.get('/api/goals', authMiddleware, (req, res) => {
  let goals = goalsDB;
  if (req.user.role === 'employee') {
    goals = goals.filter(g => g.employeeId === req.user.id);
  } else if (req.user.role === 'manager') {
    const teamIds = USERS.filter(u => u.managerId === req.user.id).map(u => u.id);
    goals = goals.filter(g => teamIds.includes(g.employeeId));
  }
  res.json({ goals });
});

// POST /api/goals - create a goal
app.post('/api/goals', authMiddleware, (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Only employees can create goals' });

  const myGoals = goalsDB.filter(g => g.employeeId === req.user.id);
  if (myGoals.length >= 8) return res.status(400).json({ error: 'Maximum 8 goals allowed' });

  const { title, thrustArea, description, uom, target, weightage } = req.body;
  if (!weightage || weightage < 10) return res.status(400).json({ error: 'Minimum weightage is 10%' });

  const usedWeight = myGoals.reduce((s, g) => s + g.weightage, 0);
  if (usedWeight + weightage > 100) return res.status(400).json({ error: `Total weightage would exceed 100% (current: ${usedWeight}%)` });

  const goal = {
    id: goalIdCounter++,
    employeeId: req.user.id,
    title, thrustArea, description, uom, target,
    weightage: parseFloat(weightage),
    approvalStatus: 'draft',
    status: 'Not Started',
    isShared: false,
    q1Actual: null, q2Actual: null, q3Actual: null, q4Actual: null,
    comments: [],
    createdAt: new Date().toISOString(),
  };
  goalsDB.push(goal);
  res.status(201).json({ goal });
});

// PUT /api/goals/:id - update a goal
app.put('/api/goals/:id', authMiddleware, (req, res) => {
  const goal = goalsDB.find(g => g.id === parseInt(req.params.id));
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.approvalStatus === 'approved' && req.user.role === 'employee') {
    return res.status(403).json({ error: 'Approved goals are locked. Contact admin to unlock.' });
  }
  Object.assign(goal, req.body, { id: goal.id, employeeId: goal.employeeId });
  res.json({ goal });
});

// DELETE /api/goals/:id
app.delete('/api/goals/:id', authMiddleware, (req, res) => {
  const idx = goalsDB.findIndex(g => g.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Goal not found' });
  if (goalsDB[idx].approvalStatus === 'approved') {
    return res.status(403).json({ error: 'Cannot delete approved goals' });
  }
  goalsDB.splice(idx, 1);
  res.json({ success: true });
});

// POST /api/goals/:id/approve - manager approves
app.post('/api/goals/:id/approve', authMiddleware, (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager only' });
  const goal = goalsDB.find(g => g.id === parseInt(req.params.id));
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  goal.approvalStatus = 'approved';
  res.json({ goal });
});

// POST /api/goals/:id/reject - manager rejects
app.post('/api/goals/:id/reject', authMiddleware, (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager only' });
  const goal = goalsDB.find(g => g.id === parseInt(req.params.id));
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  goal.approvalStatus = 'rejected';
  goal.comments.push({ by: req.user.name || 'Manager', text: req.body.comment || 'Returned for rework', time: new Date().toISOString() });
  res.json({ goal });
});

// POST /api/goals/submit - employee submits all goals for approval
app.post('/api/goals/submit', authMiddleware, (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Employee only' });
  const myGoals = goalsDB.filter(g => g.employeeId === req.user.id);
  const total = myGoals.reduce((s, g) => s + g.weightage, 0);
  if (total !== 100) return res.status(400).json({ error: `Total weightage must be 100%. Current: ${total}%` });
  myGoals.forEach(g => { if (g.approvalStatus !== 'approved') g.approvalStatus = 'pending'; });
  res.json({ success: true, goals: myGoals });
});

// ── Check-in API ──────────────────────────────────────────────────────────────
app.post('/api/checkins', authMiddleware, (req, res) => {
  const { goalId, quarter, actual, status } = req.body;
  const goal = goalsDB.find(g => g.id === parseInt(goalId));
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.approvalStatus !== 'approved') return res.status(400).json({ error: 'Goal must be approved before check-in' });
  goal[`q${quarter}Actual`] = actual;
  if (status) goal.status = status;
  res.json({ goal });
});

// ── Reports ───────────────────────────────────────────────────────────────────
app.get('/api/reports/export', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const rows = [['Employee ID', 'Goal', 'Thrust Area', 'UoM', 'Target', 'Q1', 'Q2', 'Q3', 'Q4', 'Status', 'Approval', 'Weight%']];
  goalsDB.forEach(g => {
    rows.push([g.employeeId, g.title, g.thrustArea, g.uom, g.target, g.q1Actual ?? '', g.q2Actual ?? '', g.q3Actual ?? '', g.q4Actual ?? '', g.status, g.approvalStatus, g.weightage + '%']);
  });
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=goalflow-report.csv');
  res.send(csv);
});

// ── Admin: Unlock Goals ───────────────────────────────────────────────────────
app.post('/api/admin/unlock', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { employeeId } = req.body;
  const affected = goalsDB.filter(g => g.employeeId === parseInt(employeeId) && g.approvalStatus === 'approved');
  affected.forEach(g => g.approvalStatus = 'pending');
  res.json({ success: true, unlocked: affected.length });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'GoalFlow API v1.0' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`GoalFlow API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
