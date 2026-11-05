# Campus Network Security System - Cisco Packet Tracer Topology

## 1. Network Overview & Architecture

This campus network is designed for security monitoring, threat detection, and ACL-based mitigation in Cisco Packet Tracer.
It uses **Inter-VLAN Routing** via a central Cisco Router (e.g. Cisco 2911 or 4321 / 2811) with a Cisco 2960 Catalyst Switch.

```text
                             [ Central Router ]
                                (Gateway)
                                    |
                    Trunk Link (GigabitEthernet0/0)
                                    |
                         [ Core/Access Switch ]
                                (2960)
                     /              |             \
       [VLAN 10: Student]   [VLAN 20: Faculty]   [VLAN 30: Server]
        FastEthernet0/1-10   FastEthernet0/11-15  FastEthernet0/16-24
              |                     |                    |
        - Student PC          - Faculty PC         - Campus Web/Auth
          192.168.10.20         192.168.20.10        Server: 192.168.30.10
        - Attacker PC                                (HTTP / SSH / FTP)
          192.168.10.45
```

---

## 2. Logical Subnets & VLAN Allocation

| VLAN ID | Segment Name | Subnet / CIDR | Default Gateway | Key Devices |
| :--- | :--- | :--- | :--- | :--- |
| **VLAN 10** | Student Network | `192.168.10.0/24` | `192.168.10.1` | Student PC (`192.168.10.20`), Attacker PC (`192.168.10.45`) |
| **VLAN 20** | Faculty Network | `192.168.20.0/24` | `192.168.20.1` | Faculty PC (`192.168.20.10`) |
| **VLAN 30** | Server Farm | `192.168.30.0/24` | `192.168.30.1` | Campus Server (`192.168.30.10`) |

---

## 3. Router Interface Configuration (Router-on-a-Stick)

The central router connects to the switch via a trunk line on physical interface `GigabitEthernet0/0` (or `GigabitEthernet0/0/0` depending on the Cisco model).

### Configurable Interfaces Note
> **Note**: While standard Router-on-a-Stick subinterfaces are used below, the interface name and ACL direction are **fully configurable** in the application settings and mitigation generator.

```cisco
! Enable main physical interface without IP
interface GigabitEthernet0/0
 no shutdown
exit

! VLAN 10 Subinterface (Student Network)
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
 no shutdown
exit

! VLAN 20 Subinterface (Faculty Network)
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
 no shutdown
exit

! VLAN 30 Subinterface (Server Network)
interface GigabitEthernet0/0.30
 encapsulation dot1Q 30
 ip address 192.168.30.1 255.255.255.0
 no shutdown
exit
```

---

## 4. Switch Configuration (Cisco Catalyst 2960)

```cisco
! Create VLANs
vlan 10
 name Student_Network
vlan 20
 name Faculty_Network
vlan 30
 name Server_Network
exit

! Configure Trunk to Router
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
 no shutdown
exit

! Assign Access Ports for VLAN 10 (Student)
interface range FastEthernet0/1 - 10
 switchport mode access
 switchport access vlan 10
 no shutdown
exit

! Assign Access Ports for VLAN 20 (Faculty)
interface range FastEthernet0/11 - 15
 switchport mode access
 switchport access vlan 20
 no shutdown
exit

! Assign Access Ports for VLAN 30 (Servers)
interface range FastEthernet0/16 - 24
 switchport mode access
 switchport access vlan 30
 no shutdown
exit
```

---

## 5. Threat Demonstration & Mitigation Walkthrough

### Scenario
1. **Normal State**: Attacker PC (`192.168.10.45`) can reach Campus Server (`192.168.30.10`) via ping / HTTP.
2. **Attack Detected**: The application analyzes uploaded traffic logs, detects malicious activity (e.g. DoS flood or port scan from `192.168.10.45`), and alerts the administrator.
3. **Mitigation Generated**: The web application generates an Extended ACL:
   ```cisco
   configure terminal
   ip access-list extended BLOCK_ATTACKER_VLAN10
    deny ip host 192.168.10.45 any
    permit ip any any
   exit
   interface GigabitEthernet0/0.10
    ip access-group BLOCK_ATTACKER_VLAN10 in
   end
   ```
4. **Manual Verification**:
   - In Packet Tracer on Attacker PC (`192.168.10.45`): `ping 192.168.30.10` $\rightarrow$ Result: **Destination Host Unreachable** (Blocked).
   - On Student PC (`192.168.10.20`): `ping 192.168.30.10` $\rightarrow$ Result: **Success (Reply received)** (Legitimate traffic permitted).
   - In Router CLI: `show ip access-lists BLOCK_ATTACKER_VLAN10` $\rightarrow$ Confirm packet match counters increment.
