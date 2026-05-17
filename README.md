# GoalFlow — In-House Goal Setting & Tracking Portal
### AtomQuest Hackathon 1.0

---

##  How to Run 

### Option 1 — Open directly in browser 
1. Download / extract this ZIP
2. Double-click **`index.html`**
3. Done! The full app loads instantly.

### Option 2 — Run with a local server
```bash
npm install
node server.js
# Then open http://localhost:3001
```

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Employee** | priya@atomquest.in | emp123 |
| **Employee 2** | rahul@atomquest.in | emp123 |
| **Manager** | meera@atomquest.in | mgr123 |
| **Admin** | admin@atomquest.in | admin123 |

> 

---

## ✅ Features Implemented

### Employee Role
- Create goals (Thrust Area, Title, Description, UoM, Target, Weightage)
- Validation: total weightage = 100%, min 10% per goal, max 8 goals
- Submit goals for manager approval
- Quarterly check-in (Q1–Q4) with Planned vs Actual
- View progress scores (live calculated)

### Manager Role
- Review pending goal submissions
- Inline edit goals before approval
- Approve / Reject with comments
- Team goals dashboard
- Check-in comment module
- Analytics dashboard

### Admin Role
- Cycle management & schedule
- Unlock approved goals (exception handling)
- Org hierarchy view
- Reports with CSV/Excel export
- Audit trail (who changed what, when)
- Analytics & heatmaps

---

##  Score Formulas (All 4 UoM Types)

| UoM | Formula |
|-----|---------|
| Numeric Min (Higher is Better) | (Actual ÷ Target) × 100 |
| Numeric Max (Lower is Better) | (Target ÷ Actual) × 100 |
| Timeline | On time = 100%, Late = 60% |
| Zero-based | Actual = 0 → 100%, else 0% |

---


