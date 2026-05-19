1. **Leave and Proxy Management Module**
   In the ERP, there is a leave and proxy management module for faculty members. For example, if Priya Mam wants to apply for leave for a specific date, such as 13 July (Monday), she will open the Leave page and create a new leave request. After selecting the leave date, the system will automatically fetch all lectures assigned to her on that day.

For each lecture, Priya Mam must assign a proxy faculty member. For example, if her first lecture is for class `24BCAAI1`, the system will display a dropdown containing only faculty members who are free during that lecture slot. She will repeat this process for all lectures scheduled on that day. After completing proxy assignments, she will submit the leave request along with the leave reason and other required details.

The request will then go to the HOD for approval. The HOD can either directly approve the request with the selected proxies or override/change proxy assignments before approval.

Once approved, all faculty members who receive proxy lectures will receive notifications. On the day of the leave (for example, 13 July), the assigned proxy lectures will appear in the faculty dashboard and timetable with a special highlight indicating that the lecture is a proxy lecture, along with the class information and the original faculty name. For example, if Kajal Mam is assigned a proxy lecture, the timetable will clearly display that it is a proxy lecture for Priya Mam in class `24BCAAI1`.

---

2. **Examination Seating and Eligibility Management System**
   Another major requirement is a highly sensitive examination management system. The college uses classroom identifiers such as `G1`, `G2` (Ground Floor), `F1`, `F2` (First Floor), `S1`, `S2`, etc. Along with classrooms, the system must also manage individual benches in a visual layout similar to a BookMyShow-style seat arrangement system. This is important because the entire seating arrangement will later be generated automatically.

When the HOD wants to schedule mid-semester examinations, they will select:

* the academic year,
* classes/divisions,
* examination dates,
* and the minimum attendance eligibility percentage (for example, 70%).

The system will automatically calculate eligible and ineligible students class-wise. Ineligible students will receive notifications informing them that they are not eligible for the examination due to low attendance.

The HOD dashboard will display reports such as:

* Class A → 74 eligible students,
* Class B → 79 eligible students,
* total eligible students for the year,
* and overall totals.

The HOD can also define an appeal submission deadline, typically 2–3 days later, during which students can submit explanations and supporting documents for low attendance. These requests can then be reviewed by the HOD or the class counselor. If approved, the student’s eligibility will be updated; if rejected, the student remains ineligible.

After the appeal period ends, the system will automatically generate seating arrangements. Seating allocation will follow sequential student ordering. For example:

* 1, 2, 3,
* if student 4 is absent or ineligible, the system directly places student 5.

The system must also enforce anti-cheating seating rules:

* each bench can contain only one student from the same semester,
* if only one semester has exams, one student may occupy a bench,
* if multiple semesters have exams simultaneously, benches may contain combinations such as:

  * 1st semester + 3rd semester,
  * but never 1st semester + 1st semester.

Using the bench structure, the ERP will automatically generate the complete seating arrangement for all classrooms.

The system must also automatically assign faculty members as examination supervisors. The assignment rules include:

* the faculty member must be free during the exam slot,
* normal lectures are considered cancelled during examinations,
* supervision workload must be distributed fairly,
* faculty should not repeatedly supervise the same class or room,
* supervision duties should rotate across examination days.

The final allocation should be balanced, for example:

* Faculty A → 3 supervision duties,
* Faculty B → 3 supervision duties,

instead of unfair distributions such as:

* Faculty A → 5 duties,
* Faculty B → 1 duty.

---

3. **Secure Internal Examination Paper Generation System**
   Another highly sensitive requirement is the internal examination paper management system. When an internal exam is scheduled for a subject, such as Deep Learning, the ERP must identify all unique faculty members teaching that subject, regardless of the number of divisions they handle.

Each faculty member must generate and upload two separate question papers. For example:

* if Deep Learning is taught by two faculty members,
* total uploaded papers will be four.

Once uploaded, question papers must remain completely hidden and inaccessible to everyone, including other faculty members.

At the time of printing, just before the examination, the HOD will click a “Generate Final Paper” action. This process must require secure verification such as:

* admin password,
* OTP verification,
* or both.

Only at that moment will the ERP randomly select one paper from all submitted papers. This randomization prevents human bias and ensures that no one knows in advance which paper will be used for the examination.

The selected paper is locked immediately after selection and becomes the official exam paper. The ERP will also automatically calculate the required print count based on the number of students appearing for that subject examination.

---

4. **Internal Evaluation Calculation System**  
The ERP already includes a marks upload system. In addition to this, there is a requirement for an internal evaluation engine where the HOD can define evaluation weightage ratios.  

For example:
- Mid-Sem Examination → 70%
- Attendance → 15%
- Assignments → 15%

The ERP will automatically calculate the final internal evaluation score for each student using the configured weight distribution. This evaluation system should remain flexible so that different subjects or semesters can use different evaluation patterns in the future.  

The system will maintain two result layers:

- **V1 (Immutable Evaluation Layer)**  
  This is the original weighted evaluation generated directly from the configured rules and actual student data. Once generated, this result is permanently locked and cannot be modified by anyone, including faculty members or HODs. This layer acts as the official source of truth for audits, verification, and historical accuracy.

- **V2 (Operational / Published Result Layer)**  
  Any grace marks, moderation, rounding adjustments, or manual result changes will be applied only in V2. The original V1 evaluation remains untouched. Students and final published results will use the V2 layer, while V1 remains preserved for integrity and audit purposes.