# Software Requirements Specification (SRS)
## Faculty Subject Assignment Management System (FSAMS)

---

### 1. Introduction
**1.1 Purpose**
The Faculty Subject Assignment Management System (FSAMS) is a lightweight, centralized academic planning application designed for a core administrative team (HODs, Principals, and Vice Principals) to manage faculty-subject-class assignments efficiently. The system focuses strictly on assignment management, workload tracking, and visual capacity planning.

**1.2 Objective**
*   Simplify the subject allocation workflow.
*   Replace manual Excel dependency with a unified, always-online matrix.
*   Prevent duplicate assignments and tracking errors.
*   Provide real-time, visual workload tracking for faculty members.
*   Deliver a fast, operational tool optimized for a small, co-located team (~5 users).

**1.3 Scope Exemptions**
The application will **not** generate timetables, manage student attendance, handle examinations, or process student grades.

---

### 2. Architecture & Technology Stack
The application is designed for a hosted environment optimized for low-concurrency, CRUD-heavy internal operations.

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend** | Next.js (Client-Side Rendering focused) | Fast, responsive UI for dashboard operations. |
| **Backend** | Next.js API Routes | Sufficient and efficient for a 5-user internal tool. |
| **Database** | PostgreSQL (Hosted via Supabase) | Always-online, reliable relational data storage. |
| **ORM** | Drizzle ORM | Type-safe database interactions. |
| **UI Framework** | TailwindCSS + Hero UI | Rapid, minimalist, and accessible component design. |
| **Hosting** | Vercel (App) + Supabase (DB) | Zero-maintenance cloud deployment. |

---

### 3. Authentication & User Roles
**3.1 Admin Initialization**
*   Administrators (HOD, Principal, Vice Principal) are directly seeded into the database.
*   There is no front-facing "Root Admin" dashboard for account creation.

**3.2 First-Time Login & Security**
*   Admins log in using their seeded Email and Password.
*   **Forced Password Change:** Upon the very first login, the system shall trigger an immediate popup requiring the user to change their default password.
*   The dashboard and all system routes shall remain strictly locked until this initial password change is completed.

---

### 4. Settings Module
**4.1 Academic Settings**
*   **Courses:** Admins can manage core courses (e.g., `BCA`, `BBA`, `MMS`).
*   **Specializations:** Admins can manage specializations linked to courses, including a Short Code (e.g., Data Science $\rightarrow$ `DS`, Artificial Intelligence $\rightarrow$ `AI`).

**4.2 Workload Configuration**
*   **Global Workload Limit:** The system shall maintain a global setting for maximum weekly workload (e.g., 18 credits). This limit applies uniformly to all faculty members.

---

### 5. Faculty Module
**5.1 Faculty Data & Listing**
*   **Table View:** Displays Faculty Code, Assigned Subjects + Classes, and Total Load.
*   **Hover Behavior:** Hovering over the Faculty Code reveals the full name. Hovering over the assignment summary reveals the full subject name and code.

**5.2 Faculty Creation**
*   **Fields:** Faculty Name, Faculty Code, Course (Dropdown).
*   **Auto-Suggestion:** The system shall auto-suggest a unique Faculty Code based on initials (e.g., *Priyanka Dhawal Chauhan* $\rightarrow$ `PDC`). Admins may manually override this.

---

### 6. Subject Module
**6.1 Subject Data & Listing**
*   **Table View:** Displays Subject Code, Short Code, and Assigned Classes + Faculty.
*   **Fields:** Subject Code (Unique), Subject Name, Short Code, Credit (Integer), Type.
*   **Subject Types:** `Theory`, `Practical`, `Both`, `ProjectMinor`, `ProjectMajor`.
*   **Auto-Suggestion:** The system auto-suggests a Short Code by splitting spaces (e.g., *Machine Learning* $\rightarrow$ `ML`).

**6.2 Credit to Workload Translation**
*   1 Credit is strictly equal to 1 Hour of teaching load.
*   This ratio applies universally regardless of the subject type (Theory, Practical, Both). For example, a 4-credit subject consumes 4 hours of the faculty's workload limit without splitting.

---

### 7. Class Module
**7.1 Class Data & Listing**
*   **Table View:** Displays Class Name and assigned Subject + Faculty Codes.

**7.2 Class Creation & Auto-Naming**
*   **Fields:** Year, Semester, Course, Specialization, Class Number.
*   **Naming Convention:** Generated automatically as `[YY][COURSE][SPECIALIZATION][DIVISION_NO]`. Example: `26BCAAI1`.
*   **Validation:** Division numbers must remain sequential and unique across the same semester and course (e.g., Semester 1 BCA cannot have both `26BCAAI1` and `26BCADS1`; the DS specialization must take division `2` or higher).

---

### 8. Assignment Module
**8.1 Matrix View & Dynamic Divisions**
*   The primary interface is a matrix displaying Subjects against Divisions (`DIV1`, `DIV2`, `DIV3`, etc.).
*   Division columns render dynamically based on the maximum divisions available for the selected Course and Semester. Cells for non-existent divisions are blocked/read-only.

**8.2 Data Entry & Validation**
*   **Assignment:** Admins assign faculty by directly typing the Faculty Code or partially typing the name to trigger autocomplete (e.g., typing "Priy" suggests "PDC").
*   **Validation:** The system validates faculty existence and prevents duplicate assignments in the same cell.
*   **Removal:** Admins can unassign a faculty member from a cell by pressing the `Delete`/`Backspace` key while focused on the cell, or by clicking a `Clear` button that appears on hover.

**8.3 Visual Workload Tracking**
The Assignment Matrix shall provide visual workload indicators within each faculty assignment cell. 
*   When a faculty member is assigned, the system calculates their total allocated workload based on subject credits. 
*   Each cell shall display an Excel-style progress indicator representing the current workload usage against the Global Workload Limit. 
*   If a faculty member is assigned 9 credits out of an 18-credit limit, the indicator shall appear half-filled. 
*   When the workload reaches the maximum limit, the indicator shall appear fully filled and highlighted in red. 
*   Hovering over the faculty code inside the cell shall display detailed workload information: full name, currently allocated credits, remaining credits, and maximum limit. 
*   The system shall generate overload warnings when limits are exceeded; however, administrators are allowed to forcefully save assignments beyond the maximum workload if required.

---

### 9. System Filtering & UI Behavior
**9.1 Global Filtering**
*   All major modules must support a primary Course Filter. Only one course can be active at a time to maintain context. Specialization filters are not required globally.

**9.2 Interface Standards**
*   **Theme:** Light theme utilizing a pastel/light academic color palette with minimal dark accents.
*   **UX Priorities:** Compact tables, hover-based context reveals, and strong keyboard navigation support (especially within the assignment matrix).
*   **State Management:** Simple refresh-after-save and lightweight cache invalidation. Complex optimistic realtime syncing is not required due to physical proximity of users and low concurrency.

Example Views:
```tsv id="g9r8m1"
Faculty Code	Faculty Name	Course	Assign 1	Assign 2	Assign 3	Total Load
PDC	Priyanka Dhawal Chauhan	BCA	24BCAAI1/ML	24BCADS2/LOS	-	8
RKP	Ravi Kumar Patel	BCA	24BCAAI1/SE	24BCADS2/DBMS	-	7
MSP	Mehul S Patel	BCA	24BCADS2/PY	24BCAAI1/AI	-	9
AKS	Ankit Kumar Shah	BCA	24BCADS2/CN	-	-	4
```

### Hover Details

| Hover On     | Show                                |
| ------------ | ----------------------------------- |
| Faculty Code | Full Faculty Name                   |
| Assignment   | Full Class Name + Full Subject Name |

Example:

```txt id="3g4g1x"
Hover: 24BCAAI1/ML

Show:
Class: 24BCAAI1
Subject: Machine Learning (501)
Faculty: Priyanka Dhawal Chauhan
Credits: 4
```

---

```tsv id="m8k0p2"
Subject Code	Short	Subject Name	Credit	Type	Assign 1	Assign 2	Assign 3
501	ML	Machine Learning	4	Both	24BCAAI1/PDC	24BCADS2/RKP	-
502	LOS	Linux Operating System	4	Theory	24BCADS2/PDC	-	-
503	DBMS	Database Management System	3	Both	24BCADS2/RKP	-	-
504	SE	Software Engineering	4	Theory	24BCAAI1/RKP	-	-
505	CN	Computer Networks	4	Theory	24BCADS2/AKS	-	-
```

### Hover Details

| Hover On   | Show                                |
| ---------- | ----------------------------------- |
| Short      | Full Subject Name                   |
| Assignment | Full Class Name + Full Faculty Name |

Example:

```txt id="u4h6j9"
Hover: ML

Show:
Machine Learning
Code: 501
Credits: 4
Type: Both
```

---

```tsv id="k0a1d7"
Class Name	Semester	Specialization	Assign 1	Assign 2	Assign 3
24BCAAI1	5	AI	ML/PDC	SE/RKP	AI/MSP
24BCADS2	5	DS	LOS/PDC	DBMS/RKP	CN/AKS
24BCAAI3	5	AI	-	-	-
24BCADS4	5	DS	-	-	-
```

### Hover Details

| Hover On       | Show                             |
| -------------- | -------------------------------- |
| Specialization | Full Specialization Name         |
| Assignment     | Full Subject + Full Faculty Name |

Example:

```txt id="r4t1xn"
Hover: DS

Show:
Data Science
```

---

```tsv id="j2n4p8"
Subject Code	Short	Sem	CR	DIV1	DIV2	DIV3	DIV4
501	ML	5	4	PDC	RKP	-	-
502	LOS	5	4	PDC	-	MSP	-
503	DBMS	5	3	RKP	AKS	-	-
504	SE	5	4	MSP	PDC	RKP	-
505	CN	5	4	AKS	-	-	-
```

### Assignment Matrix Hover Details

| Hover On             | Show                                |
| -------------------- | ----------------------------------- |
| Faculty Code in Cell | Full Faculty Information + Workload |
| Subject Short        | Full Subject Information            |

Example:

```txt id="5v7lq2"
Hover: PDC

Show:
Priyanka Dhawal Chauhan
Current Load: 8 / 18
Remaining: 10
Assignments:
- ML → 24BCAAI1
- LOS → 24BCADS2
```

Example:

```txt id="7d8mxa"
Hover: ML

Show:
Machine Learning
Code: 501
Credits: 4
Type: Both
```
