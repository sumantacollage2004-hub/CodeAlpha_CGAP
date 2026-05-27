/* ===========================
   CGPA CALCULATOR — SCRIPT.JS
=========================== */

// ---- DOM References ----
const stepCourses  = document.getElementById('step-courses');
const stepGrades   = document.getElementById('step-grades');
const stepResults  = document.getElementById('step-results');

const numCoursesEl = document.getElementById('numCourses');
const btnGenerate  = document.getElementById('btnGenerate');
const courseInputs = document.getElementById('courseInputs');
const btnCalculate = document.getElementById('btnCalculate');
const btnReset     = document.getElementById('btnReset');

const gpaDisplay     = document.getElementById('gpaDisplay');
const cgpaDisplay    = document.getElementById('cgpaDisplay');
const creditsDisplay = document.getElementById('creditsDisplay');
const cgpaBar        = document.getElementById('cgpaBar');
const gradeRemark    = document.getElementById('gradeRemark');
const breakdownTable = document.getElementById('breakdownTable');

// ---- Cumulative State ----
// For a real multi-semester CGPA, we'd store semesters.
// Here we compute semester GPA = CGPA (single semester scenario).
let semesterHistory = []; // could be extended for multi-semester

// ---- Grade Color Classifier ----
function gradeClass(g) {
  if (g >= 10)  return 'grade-ex';
  if (g >= 9)   return 'grade-a';
  if (g >= 7)   return 'grade-b';
  if (g >= 5)   return 'grade-c';
  if (g >= 4)   return 'grade-d';
  return 'grade-f';
}

function gradeLabel(g) {
  if (g >= 10) return 'O';
  if (g >= 9)  return 'A+';
  if (g >= 8)  return 'A';
  if (g >= 7)  return 'B+';
  if (g >= 6)  return 'B';
  if (g >= 5)  return 'C';
  if (g >= 4)  return 'D';
  return 'F';
}

function gradeColor(g) {
  if (g >= 10) return '#a78bfa';
  if (g >= 9)  return '#4effa0';
  if (g >= 7)  return '#47c8ff';
  if (g >= 5)  return '#b8c800';
  if (g >= 4)  return '#ffa94e';
  return '#ff5f5f';
}

// ---- Step 1 → Step 2: Generate Course Rows ----
btnGenerate.addEventListener('click', () => {
  const n = parseInt(numCoursesEl.value);

  if (!n || n < 1 || n > 20) {
    shake(numCoursesEl);
    showToast('Please enter a number between 1 and 20.');
    return;
  }

  courseInputs.innerHTML = '';

  for (let i = 1; i <= n; i++) {
    const row = document.createElement('div');
    row.className = 'course-row';
    row.style.animationDelay = `${(i - 1) * 40}ms`;
    row.innerHTML = `
      <div class="course-num">C-${String(i).padStart(2,'0')}</div>
      <input
        type="text"
        class="course-input"
        placeholder="Course name"
        id="name-${i}"
      />
      <input
        type="number"
        class="course-input grade-input"
        placeholder="Grade"
        id="grade-${i}"
        min="0"
        max="10"
        step="0.1"
      />
      <input
        type="number"
        class="course-input credit-input"
        placeholder="Credits"
        id="credit-${i}"
        min="0.5"
        max="10"
        step="0.5"
      />
    `;
    courseInputs.appendChild(row);

    // Live grade color feedback
    const gradeInput = row.querySelector(`#grade-${i}`);
    gradeInput.addEventListener('input', () => {
      const val = parseFloat(gradeInput.value);
      gradeInput.className = 'course-input grade-input';
      if (!isNaN(val)) {
        gradeInput.classList.add(gradeClass(val));
      }
    });
  }

  stepGrades.classList.remove('hidden');
  stepGrades.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Allow Enter key to trigger Generate
numCoursesEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnGenerate.click();
});

// ---- Step 2 → Step 3: Calculate ----
btnCalculate.addEventListener('click', () => {
  const n = parseInt(numCoursesEl.value);
  const courses = [];
  let valid = true;

  for (let i = 1; i <= n; i++) {
    const nameEl   = document.getElementById(`name-${i}`);
    const gradeEl  = document.getElementById(`grade-${i}`);
    const creditEl = document.getElementById(`credit-${i}`);

    const name   = nameEl.value.trim() || `Course ${i}`;
    const grade  = parseFloat(gradeEl.value);
    const credit = parseFloat(creditEl.value);

    if (isNaN(grade) || grade < 0 || grade > 10) {
      shake(gradeEl);
      valid = false;
      continue;
    }
    if (isNaN(credit) || credit <= 0) {
      shake(creditEl);
      valid = false;
      continue;
    }

    courses.push({ name, grade, credit });
  }

  if (!valid) {
    showToast('Please fix the highlighted fields.');
    return;
  }

  // ---- Compute GPA ----
  let totalGradePoints = 0;
  let totalCredits = 0;

  courses.forEach(c => {
    totalGradePoints += c.grade * c.credit;
    totalCredits     += c.credit;
  });

  const semesterGPA = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

  // ---- CGPA (cumulative across semesters stored) ----
  semesterHistory.push({ gpa: semesterGPA, credits: totalCredits, points: totalGradePoints });

  const cumulativePoints  = semesterHistory.reduce((s, h) => s + h.points, 0);
  const cumulativeCredits = semesterHistory.reduce((s, h) => s + h.credits, 0);
  const cgpa = cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

  // ---- Display ----
  gpaDisplay.textContent     = semesterGPA.toFixed(2);
  cgpaDisplay.textContent    = cgpa.toFixed(2);
  creditsDisplay.textContent = totalCredits.toFixed(1);

  // Animate bar (scale 0–10)
  setTimeout(() => {
    cgpaBar.style.width = `${Math.min((cgpa / 10) * 100, 100)}%`;
  }, 100);

  // Grade Remark
  const { text, cls } = getRemark(cgpa);
  gradeRemark.textContent = text;
  gradeRemark.className   = `grade-remark ${cls}`;

  // ---- Breakdown Table ----
  breakdownTable.innerHTML = `
    <div class="breakdown-header">
      <span>#</span>
      <span>Course</span>
      <span>Grade</span>
      <span>Credits</span>
      <span>Points</span>
    </div>
  `;

  courses.forEach((c, idx) => {
    const pts   = (c.grade * c.credit).toFixed(2);
    const label = gradeLabel(c.grade);
    const color = gradeColor(c.grade);

    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.style.animationDelay = `${idx * 50}ms`;
    row.innerHTML = `
      <span class="br-num">C-${String(idx + 1).padStart(2,'0')}</span>
      <span class="br-name">${escapeHTML(c.name)}</span>
      <span class="br-grade" style="background:${color}22; color:${color};">${label} (${c.grade})</span>
      <span class="br-credits">${c.credit} cr</span>
      <span class="br-points">${pts} pts</span>
    `;
    breakdownTable.appendChild(row);
  });

  // Totals row
  const totRow = document.createElement('div');
  totRow.className = 'breakdown-row';
  totRow.style.borderColor = 'rgba(232,255,71,0.25)';
  totRow.innerHTML = `
    <span class="br-num" style="color:#e8ff47">Σ</span>
    <span class="br-name" style="color:#e8ff47; font-family:'Syne',sans-serif; font-weight:700;">Total</span>
    <span class="br-grade" style="background:rgba(232,255,71,0.12); color:#e8ff47;">GPA ${semesterGPA.toFixed(2)}</span>
    <span class="br-credits" style="color:#e8ff47;">${totalCredits} cr</span>
    <span class="br-points" style="color:#e8ff47;">${totalGradePoints.toFixed(2)} pts</span>
  `;
  breakdownTable.appendChild(totRow);

  stepResults.classList.remove('hidden');
  stepResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---- Reset ----
btnReset.addEventListener('click', () => {
  semesterHistory = [];
  numCoursesEl.value = '';
  courseInputs.innerHTML = '';
  stepGrades.classList.add('hidden');
  stepResults.classList.add('hidden');
  cgpaBar.style.width = '0%';
  stepCourses.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---- Helper: Remark based on CGPA ----
function getRemark(cgpa) {
  if (cgpa >= 9.5) return { text: '🏆 Outstanding — Exceptional Performance!', cls: 'remark-ex' };
  if (cgpa >= 8.5) return { text: '🌟 Excellent — Keep it up!',                 cls: 'remark-a'  };
  if (cgpa >= 7.0) return { text: '✅ Very Good — Solid academic standing.',     cls: 'remark-b'  };
  if (cgpa >= 5.5) return { text: '📘 Good — Room to grow!',                     cls: 'remark-c'  };
  if (cgpa >= 4.0) return { text: '⚠️  Average — More effort needed.',           cls: 'remark-d'  };
  return                  { text: '❌ Below Average — Please seek guidance.',    cls: 'remark-f'  };
}

// ---- Helper: Shake animation on invalid input ----
function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shakeX 0.4s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

// ---- Helper: Toast notification ----
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
      background: #ff5f5f; color: #fff; font-family: 'DM Mono', monospace;
      font-size: 13px; padding: 12px 24px; border-radius: 8px;
      z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      animation: toastIn 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.remove(), 3000);
}

// ---- Inject keyframes ----
const style = document.createElement('style');
style.textContent = `
  @keyframes shakeX {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-6px); }
    80%       { transform: translateX(6px); }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(16px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(style);

// ---- Helper: escape HTML ----
function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
