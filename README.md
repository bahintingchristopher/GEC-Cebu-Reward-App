# ?? Reward App

A **fully offline, local-network** student reward system. Students earn points by completing tasks, and redeem them for rewards ï¿½ all data stays inside your building. No cloud, no internet required.

```
+-------------------------+          +--------------------------+
ï¿½   Admin PC (Windows)    ï¿½          ï¿½  Students (Flutter app)  ï¿½
ï¿½  +-------------------+  ï¿½   Wi-Fi  ï¿½   +------------------+   ï¿½
ï¿½  ï¿½ Express.js Server  ï¿½ ?+----------+--?ï¿½  Student App      ï¿½   ï¿½
ï¿½  ï¿½ + SQLite database  ï¿½  ï¿½          ï¿½   ï¿½  Tasks / Points  ï¿½   ï¿½
ï¿½  ï¿½ + Web Dashboard    ï¿½  ï¿½          ï¿½   ï¿½  Rewards / Historyï¿½  ï¿½
ï¿½  +-------------------+  ï¿½          ï¿½   +------------------+   ï¿½
+-------------------------+          +--------------------------+
```

## Features

**Admin (Web Dashboard)**
- Manage tasks (create / edit / delete) ï¿½ e.g. Attend Devotional, Attend Friday Activity, Attend Special Class, Attend Face-to-Face Class, First to Enroll in Each Block
- Manage rewards (create / edit / delete, points cost, stock)
- **?? Scan QR for automatic attendance** ï¿½ pick the current task, then scan each student's QR from their app. Attendance is logged and points are added automatically. No manual approval.
- View the attendance log per task (who checked in, when, points awarded)
- Manual check-in fallback (type the code under a student's QR)
- View **Claims** ï¿½ list of students who have claimed (auto-redeemed) rewards, what they claimed, and points spent
- Cancel a redemption only to reverse a mistake (refunds points &amp; restocks)
- View all students and their accumulated points
- Dashboard overview stats (including "checked in today")

**Student (Flutter App)**
- Login / Register
- **Personal QR code** on the app's front page ï¿½ show it to the admin when attending
- View task list with attended / not-attended status
- Points are added **automatically** when the admin scans your QR
- View accumulated points balance
- Browse rewards and **redeem instantly** ï¿½ if you have enough points, the reward is claimed automatically (no waiting for approval)
- View redemption history with dates and status

## Quick Start

### 1. On the Admin PC ï¿½ Start the backend + dashboard
```bash
cd backend
npm install        # first time only
npm start          # or double-click start-backend.bat
```
Then open your browser: **http://localhost:5000**

> ?? **QR scanning & camera:** Web browsers only allow camera access on secure origins.
> Use **http://localhost:5000** (the server's own machine) for the ?? Scan QR tab ï¿½ the camera
> will work there. From other devices on the network, use the manual-entry field instead
> (type the 8-character code shown under the student's QR).

### 2. Set the server IP (for student phones)
1. Find this PC's local IP:
   ```
   ipconfig
   ```
   Look for **IPv4 Address**, e.g. `192.168.1.50`

2. Edit `student_app/lib/config/api_config.dart`:
   ```dart
   static const String baseUrl = "http://192.168.1.50:5000/api";
   ```
   (use *your* IP instead of 192.168.1.50)

3. **Windows Firewall** ï¿½ allow inbound port **5000**:
   - Run PowerShell as Admin:
   ```powershell
   netsh advfirewall firewall add rule name="RewardApp" dir=in action=allow protocol=TCP localport=5000
   ```

### 3. Build & install the Flutter app on student phones
```bash
cd student_app
flutter build apk --release
```
The APK will be at `student_app/build/app/outputs/flutter-apk/app-release.apk`. Distribute it to students (e.g. via shared folder / USB). Students connect to the **same Wi-Fi** and the app finds the server automatically.

### 4. iOS / iPadOS users (PWA - "Add to Home Screen")
No App Store required. iOS users open the app from Safari and install it as a
home-screen web app (PWA).

**Build & deploy the web PWA once.**
```bash
cd student_app
flutter build web --release
```
Copy the build output into the server's public folder (replaces the old PWA):
```bash
# Windows PowerShell (from repo root)
Copy-Item -Recurse -Force student_app\build\web\* backend\public\
```
The server serves the student app at **http://<server-ip>:5000/**. The admin
dashboard is at **/login.html** (login) and **/dashboard.html**.

**On each iPhone / iPad:**
1. Join the same Wi-Fi as the server.
2. Open **Safari** and go to `http://192.168.107.135:5000`.
3. Tap **Share** -> **Add to Home Screen**.
4. Open the new home-screen icon - it launches full screen (standalone).

Notes:
- The PWA talks to the server over the same-origin HTTP address, so no HTTPS is
  needed for this local-network setup.
- For a sharp home-screen icon on iOS, the app ships a 180x180
  `apple-touch-icon` (`icons/Icon-180.png`).
- iOS PWA data (login/JWT) is stored per-device by Safari. If a device shows a
  blank/limited standalone screen on some iOS versions, opening the URL as a
  Safari bookmark instead works as a fallback.

> ?? **Tip:** Set a **static IP** on the admin PC so its address never changes:
> Windows ? Settings ? Network ? your adapter ? edit IP assignment ? Manual ? e.g. IP `192.168.1.50`, subnet `255.255.255.0`, gateway `192.168.1.1`.

## Data & Privacy
- All data is stored in a single local file: `backend/reward_app.db`
- Nothing is sent to the internet ï¿½ requests only travel over your local Wi-Fi
- Passwords are hashed, logins use JWT tokens (24h expiry)
- Fully functional even with no internet connection

## Project Structure
```
reward_app/
+-- backend/                 # Express.js + SQLite server
ï¿½   +-- server.js            # Entry point (listens on 0.0.0.0:5000)
ï¿½   +-- config/database.js   # DB schema + seed data
ï¿½   +-- middleware/auth.js   # JWT auth
ï¿½   +-- routes/
ï¿½   ï¿½   +-- auth.js          # login / register
ï¿½   ï¿½   +-- admin.js         # tasks, rewards, approvals, redemptions
ï¿½   ï¿½   +-- student.js       # tasks, rewards, history
ï¿½   +-- public/              # Admin web dashboard
+-- student_app/             # Flutter student app
ï¿½   +-- lib/
ï¿½       +-- config/api_config.dart   # ? set server IP here
ï¿½       +-- models/          # user, task, reward, redemption
ï¿½       +-- repositories/    # API calls
ï¿½       +-- blocs/           # auth, tasks, rewards, history
ï¿½       +-- screens/         # login, onboarding, dashboard (3 tabs)
ï¿½       +-- widgets/         # task card, reward card, history tile...
+-- start-backend.bat        # one-click server start (Windows)
+-- README.md
```

## API Overview
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/login | Student & admin login |
| POST | /api/auth/register | Student registration |
| GET  | /api/student/tasks | List active tasks + my attended status |
| GET  | /api/student/attendance | My attendance history (points earned) |
| GET  | /api/student/profile | Profile + total points + qr_token |
| GET  | /api/student/rewards | Reward catalog (in stock) |
| POST | /api/student/rewards/:id/redeem | Redeem reward (auto-claimed, no approval) |
| GET  | /api/student/history | Redemption history |
| GET/POST/PUT/DELETE | /api/admin/tasks | Manage tasks |
| GET/POST/PUT/DELETE | /api/admin/rewards | Manage rewards |
| POST | /api/admin/attendance/scan | Scan student QR -> log attendance + auto-award points (accepts `RA:CODE` or plain code) |
| GET  | /api/admin/attendance/task/:taskId | Attendance log for one task (who/when/points) |
| GET  | /api/admin/attendance/log | Recent attendance across all tasks |
| GET  | /api/admin/redemptions | List redemptions |
| POST | /api/admin/redemptions/:id/claim | Deliver reward |
| POST | /api/admin/redemptions/:id/cancel | Cancel + refund |
| GET  | /api/admin/students | List students + points + QR codes |
| GET  | /api/admin/stats | Dashboard stats |


