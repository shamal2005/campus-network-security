# AI-Powered Campus Network Security System

A complete, production-grade cybersecurity web application that detects suspicious network activity in a simulated campus network, explains detected threats using Google Gemini AI (with a fully transparent Offline Fallback Mode), generates deterministic Cisco Extended Access Control List (ACL) commands, and verifies mitigation inside Cisco Packet Tracer.

---

## 1. Project Architecture & Layer Breakdown

| Layer | Component | Status | Description |
| :--- | :--- | :--- | :--- |
| **Layer 1** | Project Foundation & UI | **Completed** | React + TypeScript + Vite + Tailwind CSS dashboard with dark theme and SOC aesthetic. |
| **Layer 2** | Campus Network Map | **Completed** | Interactive topology visualization of Student VLAN 10, Faculty VLAN 20, and Server VLAN 30 with ping tests and device inspection. |
| **Layer 3** | CSV Upload & Threat Detection | **Completed** | FastAPI ingestion with Pandas validation and deterministic detection rules for Port Scanning, DoS Flooding, and SSH Brute Force. |
| **Layer 4** | SQLite & Incident Lifecycle | **Completed** | Persistent SQLite storage (`campus_security.db`) with complete audit trails, status progression (`NEW` &rarr; `INVESTIGATING` &rarr; `MITIGATED` &rarr; `RESOLVED`). |
| **Layer 5** | Gemini AI & Fallback Handling | **Completed** | Integration with Google Gemini (`gemini-1.5-flash`), with an automated, clearly-labelled **Offline Fallback Mode** when no API key is set. |
| **Layer 6** | Cisco ACL Generator | **Completed** | Configurable subinterfaces (`GigabitEthernet0/0.10`), direction (`in`/`out`), rollback scripts, and Cisco IOS syntax validation. |
| **Layer 7** | Mitigation Verification & Audit | **Completed** | Recording of manual Packet Tracer testing results directly to database with timestamped audit logging. |
| **Layer 8** | Testing & Topology Guide | **Completed** | 22 comprehensive Pytest test cases, complete Packet Tracer topology guide, and one-click launch scripts. |

---

## 2. Directory Structure

```text
campus-network-security/
├── start.bat                   # One-click Windows batch launcher for backend + frontend
├── start.ps1                   # PowerShell launcher for backend + frontend
├── packet_tracer/
│   └── TOPOLOGY.md             # Cisco Router & Switch configuration guide
├── sample_data/                # Demonstration CSV datasets
│   ├── normal_traffic.csv      # Baseline campus traffic (no threats)
│   ├── port_scan_attack.csv    # Port sweep against 192.168.30.10
│   ├── dos_flood_attack.csv    # Volumetric traffic spike against Server
│   └── auth_brute_force.csv    # SSH failed login attempts
├── backend/                    # Python FastAPI Engine
│   ├── app/
│   │   ├── main.py             # FastAPI entry point, CORS, and health endpoints
│   │   ├── database.py         # SQLAlchemy engine and SQLite session factory
│   │   ├── models/             # Database ORM models and Pydantic schemas
│   │   ├── routers/            # detection, incidents, and settings routers
│   │   └── services/           # validator, detector, gemini_ai, and cisco_acl services
│   ├── tests/                  # 22 unit tests covering all rules and endpoints
│   ├── campus_security.db      # SQLite persistent storage
│   ├── requirements.txt        # Backend dependencies
│   └── run.py                  # Uvicorn server launcher (port 8000)
└── frontend/                   # React + TypeScript + Vite UI
    ├── src/
    │   ├── pages/              # Overview, NetworkMap, ThreatDetection, IncidentDetails, MitigationCenter, History, Settings
    │   ├── components/         # Sidebar, Header, StatCard, Badges
    │   ├── data/               # Local demonstration mock data
    │   └── types/              # Domain TypeScript interfaces
    └── package.json
```

---

## 3. Quick Start Guide

### Option A: One-Click Launcher (Windows)
Double-click `start.bat` or run in PowerShell:
```powershell
.\start.ps1
```
This automatically starts both the FastAPI backend (`http://127.0.0.1:8000`) and the Vite React frontend (`http://localhost:5173`).

---

### Option B: Manual Startup

#### 1. Start the Backend API
```powershell
cd backend
.\venv\Scripts\activate
python run.py
```
- API Endpoint: `http://127.0.0.1:8000`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

#### 2. Start the Frontend Dashboard
```powershell
cd frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 4. Threat Detection Rules & Thresholds

All thresholds are configurable via the `/api/settings` endpoint and the UI Settings page:

1. **Port Scanning Detection**:
   - Signature: Single source IP contacting $\ge 10$ distinct destination ports within the log time window.
   - Severity: `HIGH`
2. **DoS Volumetric Flood Detection**:
   - Signature: Source host generating $\ge 4,000$ packets or $\ge 5$ MB volume in a short time window.
   - Severity: `CRITICAL`
3. **SSH Brute-Force Detection**:
   - Signature: $\ge 5$ consecutive `FAILURE` authentication attempts targeting a service (e.g., SSH).
   - Severity: `HIGH`

---

## 5. Cisco ACL Mitigation & Packet Tracer Verification

The system generates standard Cisco IOS Extended Named ACLs:

```cisco
configure terminal
ip access-list extended BLOCK_HOST_192_168_10_45
 remark --- Security Mitigation: Block Malicious Host 192.168.10.45 ---
 deny ip host 192.168.10.45 any
 permit ip any any
exit
interface GigabitEthernet0/0.10
 ip access-group BLOCK_HOST_192_168_10_45 in
exit
end
write memory
```

### Verification in Cisco Packet Tracer:
1. Paste the generated ACL into Router R1 CLI.
2. From Attacker PC (`192.168.10.45`), run `ping 192.168.30.10`. Verify that packets are dropped (`Destination host unreachable`).
3. From Student PC (`192.168.10.20`), run `ping 192.168.30.10`. Verify that replies are received (legitimate traffic permitted by `permit ip any any`).
4. Record the verification notes in the web UI Mitigation Center to update the audit trail in SQLite.

---

## 6. Running the Test Suite

Run the full pytest suite in the backend:
```powershell
cd backend
.\venv\Scripts\python -m pytest -v tests
```
All **22 tests** covering CSV validation, threat detection rules, SQLite incident lifecycle, Gemini fallback mode, and Cisco ACL generation execute and pass.
