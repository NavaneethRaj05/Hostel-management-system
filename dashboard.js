const API_BASE = 'http://localhost:3001/api';

// Global variables
let currentUser = null;
let dashboardData = {
    students: [],
    notices: [],
    rooms: [],
    fees: [],
    grievances: [],
    complaints: [],
    visitors: []
};
let currentPage = 1;
let studentsPerPage = 20;
let totalStudents = 0;
let totalPages = 0;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboardData();
    
    // Setup update profile form
    setupUpdateProfileForm();
    
    // Add search input event listener
    const searchInput = document.getElementById('studentSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchStudents();
            }, 500); // Debounce search by 500ms
        });
    }
    
    // Add visitor search input event listener
    const visitorSearchInput = document.getElementById('visitorSearch');
    if (visitorSearchInput) {
        let visitorSearchTimeout;
        visitorSearchInput.addEventListener('input', function() {
            clearTimeout(visitorSearchTimeout);
            visitorSearchTimeout = setTimeout(() => {
                searchVisitors();
            }, 500); // Debounce search by 500ms
        });
    }
});

// Check if user is authenticated
function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(user);
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;
    
    // Show/hide sections based on role
    if (currentUser.role === 'student') {
        showStudentDashboard();
    } else {
        showWardenDashboard();
    }
}

// Show student-specific dashboard
function showStudentDashboard() {
    // Hide warden-only sections (but keep grievances for students to view their own)
    const wardenSections = ['students', 'rooms', 'fees', 'visitors'];
    wardenSections.forEach(section => {
        const navLink = document.querySelector(`a[onclick="showSection('${section}')"]`);
        if (navLink) navLink.style.display = 'none';
    });
    
    // Update page title
    document.getElementById('pageTitle').textContent = 'Student Dashboard';
    
    // Update overview for student view
    updateStudentOverview();
    
    // Add student-specific navigation
    addStudentNavigation();
}

// Add student-specific navigation
function addStudentNavigation() {
    const sidebar = document.querySelector('.sidebar .nav.flex-column');
    
    // Add profile section
    const profileNav = document.createElement('li');
    profileNav.className = 'nav-item';
    profileNav.innerHTML = `
        <a class="nav-link" href="#" onclick="showSection('profile')">
            <i class="bi bi-person-circle"></i> My Profile
        </a>
    `;
    
    
    // Insert before logout button
    const logoutNav = sidebar.querySelector('li:last-child');
    sidebar.insertBefore(profileNav, logoutNav);
}

// Show warden-specific dashboard
function showWardenDashboard() {
    // All sections are available for warden
    document.getElementById('pageTitle').textContent = 'Warden Dashboard';
    const staffLink = document.getElementById('nav-staff-assistant');
    if (staffLink) staffLink.style.display = 'block';
}

// Update overview for student view
function updateStudentOverview() {
    // Update labels for student view
    document.getElementById('stat1Label').textContent = 'Your Status';
    document.getElementById('stat2Label').textContent = 'Your Room';
    document.getElementById('stat3Label').textContent = 'Fee Status';
    document.getElementById('tableHeader').textContent = 'Your Profile';
    
    // Update statistics for student view
    document.getElementById('totalStudents').textContent = 'Active';
    document.getElementById('occupiedRooms').textContent = currentUser.roomNumber || 'Not Assigned';
    document.getElementById('pendingFees').textContent = currentUser.feesStatus || 'Pending';
    document.getElementById('activeNotices').textContent = dashboardData.notices.length;

    // Show AI billing summary button for students
    const aiBtnContainer = document.getElementById('aiSummaryBtnContainer');
    if (aiBtnContainer) aiBtnContainer.style.display = 'block';

    // Update recent students table for student view
    updateStudentProfileTable();
    
    // Update recent notices
    updateRecentNotices();
}


// Update student profile table
function updateStudentProfileTable() {
    const tbody = document.getElementById('recentStudentsTable');
    tbody.innerHTML = '';
    
    // Show current student's information
    const student = dashboardData.students.find(s => s.email === currentUser.email) || {
        name: currentUser.name,
        email: currentUser.email,
        roomNumber: 'Not Assigned',
        feesStatus: 'Pending'
    };
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><strong>${student.name}</strong></td>
        <td>${student.email}</td>
        <td>${student.roomNumber || 'Not Assigned'}</td>
        <td><span class="badge ${student.feesStatus === 'Paid' ? 'bg-success' : 'bg-warning'}">${student.feesStatus || 'Pending'}</span></td>
    `;
    tbody.appendChild(row);
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStudents(currentPage),
            loadNotices(),
            loadRooms(),
            loadFees(),
            loadGrievances(),
            loadComplaints(),
            loadVisitors()
        ]);
        updateOverview();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Complaints persistence (localStorage)
function getStoredComplaints() {
    try {
        return JSON.parse(localStorage.getItem('complaints') || '[]');
    } catch (_) { return []; }
}

// Attendance view setup
function setupAttendanceView() {
    const wardenRow = document.getElementById('attendanceWardenRow');
    const studentRow = document.getElementById('attendanceStudentRow');
    const dateInput = document.getElementById('attendanceDate');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (dateInput && !dateInput.value) dateInput.value = `${yyyy}-${mm}-${dd}`;
    if (currentUser.role === 'warden') {
        if (attendanceRefreshTimer) {
            clearInterval(attendanceRefreshTimer);
            attendanceRefreshTimer = null;
        }
        if (wardenRow) wardenRow.style.display = '';
        if (studentRow) studentRow.style.display = 'none';
        loadAttendanceForDate();
    } else {
        if (wardenRow) wardenRow.style.display = 'none';
        if (studentRow) studentRow.style.display = '';
        loadMyAttendance();
        if (!attendanceRefreshTimer) {
            attendanceRefreshTimer = setInterval(loadMyAttendance, 60000);
        }
        if (!attendanceStorageListenerAdded) {
            window.addEventListener('storage', (event) => {
                if (event.key === 'attendanceUpdate') {
                    loadMyAttendance();
                }
            });
            attendanceStorageListenerAdded = true;
        }
    }
}

async function loadAttendanceForDate() {
    const date = document.getElementById('attendanceDate')?.value;
    if (!date) return;
    try {
        const res = await fetch(`${API_BASE}/attendance?date=${encodeURIComponent(date)}`);
        const data = await res.json();
        renderAttendanceTable(data.attendance || [], date);
    } catch (e) {
        console.error('Failed to load attendance', e);
        renderAttendanceTable([], date);
    }
}

function renderAttendanceTable(rows, date) {
    const tbody = document.getElementById('attendanceTable');
    if (!tbody) return;
    if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No students</td></tr>';
        const stats = document.getElementById('attendanceStats');
        if (stats) stats.innerHTML = '';
        return;
    }
    const total = rows.length;
    const present = rows.filter(r => r.status === 'present').length;
    const absent = rows.filter(r => r.status === 'absent').length;
    const pending = total - present - absent;
    const percent = total ? Math.round((present / total) * 100) : 0;
    const stats = document.getElementById('attendanceStats');
    if (stats) {
        stats.innerHTML = `
            <div class="col-md-3 mb-3">
                <div class="card bg-dark text-white text-center">
                    <div class="card-body">
                        <h5>${total}</h5>
                        <small>Total Students</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-success text-white text-center">
                    <div class="card-body">
                        <h5>${present}</h5>
                        <small>Present</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-warning text-white text-center">
                    <div class="card-body">
                        <h5>${absent}</h5>
                        <small>Absent</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-info text-white text-center">
                    <div class="card-body">
                        <h5>${percent}%</h5>
                        <small>Attendance Rate</small>
                    </div>
                </div>
            </div>
        `;
    }
    tbody.innerHTML = '';
    rows.forEach(r => {
        const tr = document.createElement('tr');
        const presentChecked = r.status === 'present' ? 'checked' : '';
        const absentChecked = r.status === 'absent' ? 'checked' : '';
        tr.innerHTML = `
            <td>${r.name}</td>
            <td><span class="badge bg-info">${r.usn || r.id}</span></td>
            <td>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="att-${r.id}" id="att-${r.id}-p" value="present" ${presentChecked}
                        onchange="editAttendanceInline('${r.id}','${date}','present')">
                    <label class="form-check-label" for="att-${r.id}-p">Present</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="att-${r.id}" id="att-${r.id}-a" value="absent" ${absentChecked}
                        onchange="editAttendanceInline('${r.id}','${date}','absent')">
                    <label class="form-check-label" for="att-${r.id}-a">Absent</label>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// staged changes kept in-memory until saved
let pendingAttendanceChanges = {};
let attendanceRefreshTimer = null;
let attendanceStorageListenerAdded = false;

function editAttendanceInline(studentId, date, status) {
    if (!pendingAttendanceChanges[studentId]) pendingAttendanceChanges[studentId] = {};
    pendingAttendanceChanges[studentId][date] = status;
}

async function saveAttendanceChanges() {
    const date = document.getElementById('attendanceDate')?.value;
    const entries = Object.entries(pendingAttendanceChanges);
    for (const [studentId, byDate] of entries) {
        const status = byDate[date];
        if (!status) continue;
        try {
            await fetch(`${API_BASE}/attendance/${encodeURIComponent(studentId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, status })
            });
        } catch (e) {
            console.error('Failed to save attendance for', studentId, e);
        }
    }
    pendingAttendanceChanges = {};
    loadAttendanceForDate();
    try {
        localStorage.setItem('attendanceUpdate', JSON.stringify({ ts: Date.now() }));
    } catch (_) {}
}

function setAllAttendance(status) {
    const date = document.getElementById('attendanceDate')?.value;
    const rows = document.querySelectorAll('#attendanceTable tr');
    rows.forEach(row => {
        const usnBadge = row.querySelector('td:nth-child(2) .badge');
        if (!usnBadge) return;
        const id = usnBadge.textContent.trim();
        const radioId = status === 'present' ? `att-${id}-p` : `att-${id}-a`;
        const radio = document.getElementById(radioId);
        if (radio) radio.checked = true;
        if (!pendingAttendanceChanges[id]) pendingAttendanceChanges[id] = {};
        pendingAttendanceChanges[id][date] = status;
    });
}

async function downloadAttendance() {
    const date = document.getElementById('attendanceDate')?.value;
    if (!date) return;
    try {
        const res = await fetch(`${API_BASE}/attendance?date=${encodeURIComponent(date)}`);
        const data = await res.json();
        const rows = data.attendance || [];
        const header = ['Student','USN','Date','Status'];
        const lines = [header.join(',')];
        rows.forEach(r => {
            const cols = [
                '"' + (r.name || '') + '"',
                '"' + (r.usn || r.id || '') + '"',
                '"' + (data.date || date) + '"',
                '"' + (r.status || '') + '"'
            ];
            lines.push(cols.join(','));
        });
        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Failed to download attendance', e);
    }
}

async function loadMyAttendance() {
    try {
        const res = await fetch(`${API_BASE}/attendance/${encodeURIComponent(currentUser.id || currentUser.usn || '')}`);
        const data = await res.json();
        renderMyAttendance(data || []);
    } catch (e) {
        console.error('Failed to load my attendance', e);
        renderMyAttendance([]);
    }
}

function refreshMyAttendance() {
    loadMyAttendance();
}

function renderMyAttendance(records) {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const percent = total ? Math.round((present / total) * 100) : 0;
    const attTotal = document.getElementById('attTotal');
    const attPresent = document.getElementById('attPresent');
    const attAbsent = document.getElementById('attAbsent');
    const attPercent = document.getElementById('attPercent');
    const attRecent = document.getElementById('attRecent');
    if (attTotal) attTotal.textContent = String(total);
    if (attPresent) attPresent.textContent = String(present);
    if (attAbsent) attAbsent.textContent = String(absent);
    if (attPercent) attPercent.textContent = `${percent}%`;
    if (attRecent) {
        attRecent.innerHTML = '';
        records.slice(-7).reverse().forEach(r => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between';
            li.innerHTML = `<span>${r.date}</span><span class="badge ${r.status === 'present' ? 'bg-success' : 'bg-warning'}">${r.status}</span>`;
            attRecent.appendChild(li);
        });
    }
}
function setStoredComplaints(list) {
    localStorage.setItem('complaints', JSON.stringify(list));
}

// Load complaints
async function loadComplaints() {
    try {
        dashboardData.complaints = getStoredComplaints();
    } catch (error) {
        console.error('Error loading complaints:', error);
        dashboardData.complaints = [];
    }
}

// Submit complaint (student)
function setupComplaintForm() {
    const form = document.getElementById('complaintForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const type = document.getElementById('complaintType')?.value || 'other';
        const subject = document.getElementById('complaintSubject').value.trim();
        const description = document.getElementById('complaintDescription').value.trim();
        const message = document.getElementById('complaintMessage');
        if (!type || !subject || !description || description.length < 10) {
            message.textContent = 'Please provide subject and a description of at least 10 characters.';
            return;
        }

        // Show a loading text while classifying
        message.textContent = 'Classifying complaint priority with AI...';
        message.className = 'text-info';

        let urgency = 'low';
        let category = type;
        let justification = '';

        try {
            const res = await fetch(`${API_BASE}/ai/classify-complaint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, description })
            });
            if (res.ok) {
                const data = await res.json();
                urgency = data.urgency || 'low';
                category = data.category || type;
                justification = data.justification || '';
            }
        } catch (err) {
            console.warn('AI classification failed, falling back to low urgency:', err);
        }

        const list = getStoredComplaints();
        const id = 'C' + Date.now();
        list.push({
            id,
            studentName: currentUser?.name || 'Unknown',
            studentEmail: currentUser?.email || '',
            type,
            subject,
            description,
            status: 'pending',
            date: new Date().toISOString(),
            urgency,
            category,
            justification
        });
        setStoredComplaints(list);
        form.reset();
        message.classList.remove('text-danger', 'text-info');
        message.classList.add('text-success');
        message.textContent = 'Complaint submitted successfully (AI Urgency: ' + urgency.toUpperCase() + ').';
        refreshComplaints();
    });
}

// Render complaints table
function renderComplaintsTable() {
    const tbody = document.getElementById('complaintsTable');
    if (!tbody) return;
    let list = dashboardData.complaints || [];
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No complaints found</td></tr>';
        return;
    }

    // Sort complaints: critical/high at the top
    const priorityWeight = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
    };
    list = [...list].sort((a, b) => {
        const weightA = priorityWeight[a.urgency?.toLowerCase()] || 1;
        const weightB = priorityWeight[b.urgency?.toLowerCase()] || 1;
        return weightB - weightA;
    });

    tbody.innerHTML = '';
    list.forEach(c => {
        const tr = document.createElement('tr');
        
        let urgencyBadge = '';
        const urgency = c.urgency || 'low';
        switch (urgency.toLowerCase()) {
            case 'critical':
                urgencyBadge = `<span class="badge bg-danger text-uppercase px-2 py-1" style="font-size:0.75rem;" title="${c.justification || 'Critical priority.'}"><i class="bi bi-exclamation-triangle-fill me-1"></i>Critical</span>`;
                break;
            case 'high':
                urgencyBadge = `<span class="badge bg-warning text-dark text-uppercase px-2 py-1" style="font-size:0.75rem;" title="${c.justification || 'High priority.'}">High</span>`;
                break;
            case 'medium':
                urgencyBadge = `<span class="badge bg-info text-dark text-uppercase px-2 py-1" style="font-size:0.75rem;" title="${c.justification || 'Medium priority.'}">Medium</span>`;
                break;
            case 'low':
            default:
                urgencyBadge = `<span class="badge bg-secondary text-uppercase px-2 py-1" style="font-size:0.75rem;" title="${c.justification || 'Low priority.'}">Low</span>`;
                break;
        }

        tr.innerHTML = `
            <td><span class="badge bg-primary">${c.id}</span></td>
            <td>${c.studentName}</td>
            <td>${urgencyBadge}</td>
            <td><span class="badge bg-secondary">${(c.type || 'other').replace('_',' ')}</span></td>
            <td>${c.subject}</td>
            <td>${new Date(c.date).toLocaleDateString()}</td>
            <td><span class="badge ${c.status === 'pending' ? 'bg-warning text-dark' : 'bg-success'}">${c.status}</span></td>
            <td>
                ${currentUser?.role === 'warden' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteComplaint('${c.id}')"><i class="bi bi-trash"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function refreshComplaints() {
    dashboardData.complaints = getStoredComplaints();
    // If student, filter to own complaints for display
    if (currentUser?.role === 'student') {
        dashboardData.complaints = dashboardData.complaints.filter(c => c.studentEmail === currentUser.email);
        // Students: show only the submit form, hide list and stats
        const formCol = document.getElementById('complaintFormCol');
        const listCol = document.getElementById('complaintsListCol');
        const stats = document.getElementById('complaintsStats');
        if (formCol) {
            formCol.style.display = '';
            // Make form moderately wide for better usability
            formCol.classList.remove('col-lg-12');
            formCol.classList.add('col-lg-8');
        }
        if (listCol) listCol.style.display = 'none';
        if (stats) stats.style.display = 'none';
    } else {
        // Warden: no form, only list
        const formCol = document.getElementById('complaintFormCol');
        if (formCol) formCol.style.display = 'none';
        const listCol = document.getElementById('complaintsListCol');
        if (listCol) {
            listCol.style.display = '';
            // Make list full width for warden
            listCol.classList.remove('col-lg-6');
            listCol.classList.add('col-lg-12');
        }
        // Render stats for warden
        renderComplaintsStats();
    }
    renderComplaintsTable();
}

function deleteComplaint(id) {
    if (currentUser?.role !== 'warden') return;
    const all = getStoredComplaints();
    const next = all.filter(c => c.id !== id);
    setStoredComplaints(next);
    refreshComplaints();
}

function renderComplaintsStats() {
    const container = document.getElementById('complaintsStats');
    if (!container) return;
    const all = dashboardData.complaints || [];
    const total = all.length;
    const pending = all.filter(c => c.status === 'pending').length;
    const resolved = all.filter(c => c.status === 'resolved').length;
    const closed = all.filter(c => c.status === 'closed').length;
    container.style.display = '';
    container.innerHTML = `
        <div class="col-md-3">
            <div class="card bg-primary text-white"><div class="card-body text-center">
                <h5>${total}</h5><small>Total</small>
            </div></div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-white"><div class="card-body text-center">
                <h5>${pending}</h5><small>Pending</small>
            </div></div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white"><div class="card-body text-center">
                <h5>${resolved}</h5><small>Resolved</small>
            </div></div>
        </div>
        <div class="col-md-3">
            <div class="card bg-secondary text-white"><div class="card-body text-center">
                <h5>${closed}</h5><small>Closed</small>
            </div></div>
        </div>
    `;
}

// Load students data with pagination
async function loadStudents(page = 1, search = '') {
    try {
        const params = new URLSearchParams({
            page: page,
            limit: studentsPerPage,
            search: search
        });
        
        const response = await fetch(`${API_BASE}/students?${params}`);
        if (response.ok) {
            const data = await response.json();
            dashboardData.students = data.students || [];
            currentPage = data.pagination?.currentPage || page;
            totalStudents = data.pagination?.totalStudents || 0;
            totalPages = data.pagination?.totalPages || 1;
        } else {
            console.warn('Students API failed, using fallback');
            // Fallback: get from database directly
            const dbResponse = await fetch(`${API_BASE}/db`);
            if (dbResponse.ok) {
                const db = await dbResponse.json();
                const allStudents = Object.values(db.students || {});
                // Simple pagination for fallback
                const startIndex = (page - 1) * studentsPerPage;
                const endIndex = startIndex + studentsPerPage;
                dashboardData.students = allStudents.slice(startIndex, endIndex);
                totalStudents = allStudents.length;
                totalPages = Math.ceil(totalStudents / studentsPerPage);
                currentPage = page;
            } else {
                console.error('Database fallback also failed');
                dashboardData.students = [];
            }
        }
    } catch (error) {
        console.error('Error loading students:', error);
        dashboardData.students = [];
    }
}

// Load notices data
async function loadNotices() {
    try {
        const response = await fetch(`${API_BASE}/notices`);
        if (response.ok) {
            dashboardData.notices = await response.json();
        }
    } catch (error) {
        console.error('Error loading notices:', error);
    }
}

// Load rooms data
async function loadRooms() {
    try {
        const response = await fetch(`${API_BASE}/rooms`);
        if (response.ok) {
            dashboardData.rooms = await response.json();
        } else {
            // Fallback to mock data
            dashboardData.rooms = [
                { number: '101', capacity: 2, occupied: 1, status: 'available', sharingType: '2-sharing', floor: 1 },
                { number: '102', capacity: 2, occupied: 2, status: 'full', sharingType: '2-sharing', floor: 1 },
                { number: '103', capacity: 2, occupied: 1, status: 'available', sharingType: '2-sharing', floor: 1 },
                { number: '201', capacity: 2, occupied: 0, status: 'available', sharingType: '2-sharing', floor: 2 },
                { number: '202', capacity: 2, occupied: 2, status: 'full', sharingType: '2-sharing', floor: 2 },
                { number: '203', capacity: 2, occupied: 1, status: 'available', sharingType: '2-sharing', floor: 2 }
            ];
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        // Fallback to mock data
        dashboardData.rooms = [
            { number: '101', capacity: 2, occupied: 1, status: 'available', sharingType: '2-sharing', floor: 1 },
            { number: '102', capacity: 2, occupied: 2, status: 'full', sharingType: '2-sharing', floor: 1 },
            { number: '103', capacity: 2, occupied: 1, status: 'available', sharingType: '2-sharing', floor: 1 },
            { number: '201', capacity: 2, occupied: 0, status: 'available', sharingType: '2-sharing', floor: 2 },
            { number: '202', capacity: 2, occupied: 2, status: 'full', sharingType: '2-sharing', floor: 2 },
            { number: '203', capacity: 2, occupied: 1, status: 'available', sharingType: '2-sharing', floor: 2 }
        ];
    }
}

// Load fees data
async function loadFees() {
    try {
        // Get students data from API
        const response = await fetch(`${API_BASE}/db`);
        if (response.ok) {
            const db = await response.json();
            // Handle both array and object formats for students
            let studentsData;
            if (Array.isArray(db.students)) {
                // Convert array to object format for consistency
                studentsData = db.students.reduce((acc, student) => {
                    acc[student.id] = student;
                    return acc;
                }, {});
            } else {
                studentsData = db.students || {};
            }
            
            dashboardData.fees = Object.entries(studentsData).map(([studentId, studentData]) => ({
                id: studentId,
                studentName: studentData.name,
                email: studentData.email,
                roomNumber: studentData.roomNumber || '',
                totalFee: studentData.totalFee || 0,
                paid: studentData.paid || 0,
                due: studentData.feesDue || 0,
                status: studentData.feesStatus || 'Pending'
            }));
        } else {
            console.log('API response not ok, using fallback data');
            // Fallback to mock data
            dashboardData.fees = dashboardData.students.map(student => ({
                id: student.id || Math.random().toString(36).substring(2, 11),
                studentName: student.name,
                email: student.email,
                roomNumber: student.roomNumber || '',
                totalFee: 50000,
                paid: student.feesStatus === 'Paid' ? 50000 : 0,
                due: student.feesStatus === 'Paid' ? 0 : 50000,
                status: student.feesStatus || 'Pending'
            }));
        }
    } catch (error) {
        console.error('Error loading fees:', error);
        // Fallback to mock data
        dashboardData.fees = dashboardData.students.map(student => ({
            id: student.id || Math.random().toString(36).substring(2, 11),
            studentName: student.name,
            email: student.email,
            roomNumber: student.roomNumber || '',
            totalFee: 50000,
            paid: student.feesStatus === 'Paid' ? 50000 : 0,
            due: student.feesStatus === 'Paid' ? 0 : 50000,
            status: student.feesStatus || 'Pending'
        }));
    }
}

// Update overview section
function updateOverview() {
    if (currentUser.role === 'student') {
        updateStudentOverview();
    } else {
        // Update statistics for warden view
        document.getElementById('totalStudents').textContent = dashboardData.students.length;
        document.getElementById('occupiedRooms').textContent = dashboardData.rooms.filter(r => r.occupied > 0).length;
        document.getElementById('pendingFees').textContent = dashboardData.fees.filter(f => f.status === 'Pending').length;
        document.getElementById('activeNotices').textContent = dashboardData.notices.length;

        // Update recent students table
        updateRecentStudentsTable();
        
        // Update recent notices
        updateRecentNotices();

        // Show monthly report button for Warden
        const monthlyReportBtn = document.getElementById('btn-monthly-report');
        if (monthlyReportBtn) monthlyReportBtn.style.display = 'inline-block';

        // Load AI attendance anomalies alerts
        loadAttendanceAlerts();
    }
}

// Update recent students table
function updateRecentStudentsTable() {
    const tbody = document.getElementById('recentStudentsTable');
    tbody.innerHTML = '';
    
    dashboardData.students.slice(0, 5).forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${student.roomNumber || 'Not assigned'}</td>
            <td><span class="badge ${student.feesStatus === 'Paid' ? 'bg-success' : 'bg-warning'}">${student.feesStatus || 'Pending'}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Update recent notices
function updateRecentNotices() {
    const container = document.getElementById('recentNotices');
    container.innerHTML = '';
    
    if (dashboardData.notices.length === 0) {
        container.innerHTML = '<p class="text-muted">No notices available</p>';
        return;
    }
    
    dashboardData.notices.slice(0, 3).forEach(notice => {
        const noticeDiv = document.createElement('div');
        noticeDiv.className = 'border-bottom pb-2 mb-2';
        noticeDiv.innerHTML = `
            <h6 class="mb-1">${notice.title}</h6>
            <p class="mb-1 text-muted small">${notice.body.substring(0, 100)}...</p>
            <small class="text-muted">${new Date(notice.createdAt).toLocaleDateString()}</small>
        `;
        container.appendChild(noticeDiv);
    });
}

// Outpass logic
let outpassStudentRefreshTimer = null;
let outpassStorageListenerAdded = false;

let lastOutpassUpdateCheck = null;
function setupOutpassView() {
    const studentRow = document.getElementById('outpassStudentRow');
    const wardenRow = document.getElementById('outpassWardenRow');
    const isWarden = currentUser.role === 'warden';
    if (studentRow) studentRow.style.display = isWarden ? 'none' : '';
    if (wardenRow) wardenRow.style.display = isWarden ? '' : 'none';
    if (isWarden) {
        if (outpassStudentRefreshTimer) {
            clearInterval(outpassStudentRefreshTimer);
            outpassStudentRefreshTimer = null;
        }
        loadAllOutpasses();
    } else {
        setupOutpassForm();
        loadMyOutpasses();
        // Check for updates every 2 seconds
        if (!outpassStudentRefreshTimer) {
            outpassStudentRefreshTimer = setInterval(() => {
                try {
                    const update = localStorage.getItem('outpassUpdate');
                    if (update) {
                        const data = JSON.parse(update);
                        if (!lastOutpassUpdateCheck || data.ts > lastOutpassUpdateCheck) {
                            lastOutpassUpdateCheck = data.ts;
                            loadMyOutpasses();
                        }
                    }
                } catch (_) {}
            }, 2000);
        }
        // Also listen for storage events (cross-tab)
        if (!outpassStorageListenerAdded) {
            window.addEventListener('storage', (event) => {
                if (event.key === 'outpassUpdate') {
                    loadMyOutpasses();
                }
            });
            outpassStorageListenerAdded = true;
        }
    }
}

function setupOutpassForm() {
    const form = document.getElementById('outpassForm');
    if (!form || form._bound) return;
    form._bound = true;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const reason = document.getElementById('outpassReason').value.trim();
        const fromDate = document.getElementById('outpassFrom').value;
        const toDate = document.getElementById('outpassTo').value;
        const message = document.getElementById('outpassMessage');
        // derive studentId robustly
        let studentId = currentUser.id || currentUser.usn || '';
        if (!studentId && Array.isArray(dashboardData.students) && currentUser.email) {
            const me = dashboardData.students.find(s => s.email === currentUser.email);
            if (me) studentId = me.id || me.usn || '';
        }
        if (!studentId && currentUser.email) {
            try {
                const resp = await fetch(`${API_BASE}/db`);
                if (resp.ok) {
                    const db = await resp.json();
                    const all = Array.isArray(db.students) ? db.students : Object.entries(db.students||{}).map(([id,st])=>({id,...st}));
                    const me2 = all.find(s => (s.email||'').toLowerCase() === currentUser.email.toLowerCase());
                    if (me2) studentId = me2.id || me2.usn || '';
                }
            } catch (_) {}
        }
        if (!reason || !fromDate || !toDate) {
            if (message) message.textContent = 'Please fill all required fields.';
            return;
        }
        if (!studentId) {
            if (message) message.textContent = 'Unable to determine your student ID. Please relogin.';
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/outpass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    studentName: currentUser.name,
                    reason,
                    fromDate,
                    toDate
                })
            });
            if (res.ok) {
                form.reset();
                if (message) {
                    message.classList.remove('text-danger');
                    message.classList.add('text-success');
                    message.textContent = 'Outpass request submitted.';
                }
                loadMyOutpasses();
            } else {
                let err = 'Failed to submit. Please try again.';
                try { const data = await res.json(); if (data?.error) err = data.error; } catch (_) { err += ` (status ${res.status})`; }
                if (message) {
                    message.classList.remove('text-success');
                    message.classList.add('text-danger');
                    message.textContent = err;
                }
            }
        } catch (e) {
            console.error('Outpass submit error:', e);
            if (message) {
                message.classList.remove('text-success');
                message.classList.add('text-danger');
                message.textContent = 'Network error. Please try again.';
            }
        }
    });
}

async function loadMyOutpasses() {
    try {
        const res = await fetch(`${API_BASE}/outpass?role=student&studentId=${encodeURIComponent(currentUser.id || currentUser.usn)}`);
        const data = await res.json();
        renderMyOutpassTable(Array.isArray(data) ? data : []);
    } catch (_) {
        renderMyOutpassTable([]);
    }
}

function renderMyOutpassTable(rows) {
    const tbody = document.getElementById('myOutpassTable');
    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No requests</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    rows.slice().reverse().forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge bg-primary">${r.id}</span></td>
            <td>${r.fromDate} → ${r.toDate}</td>
            <td>${r.reason}</td>
            <td><span class="badge ${r.status==='approved'?'bg-success':r.status==='rejected'?'bg-danger':'bg-warning'}">${r.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadAllOutpasses() {
    try {
        const res = await fetch(`${API_BASE}/outpass`);
        const data = await res.json();
        renderOutpassApprovalTable(Array.isArray(data) ? data : []);
    } catch (_) {
        renderOutpassApprovalTable([]);
    }
}

function renderOutpassApprovalTable(rows) {
    const tbody = document.getElementById('outpassApprovalTable');
    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No requests</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    rows.slice().reverse().forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge bg-primary">${r.id}</span></td>
            <td>${r.studentName} <small class="text-muted">(${r.studentId})</small></td>
            <td>${r.fromDate} → ${r.toDate}</td>
            <td>${r.reason}</td>
            <td id="risk-${r.id}"><span class="text-muted small"><span class="spinner-border spinner-border-sm me-1" role="status"></span>Analyzing...</span></td>
            <td><span class="badge ${r.status==='approved'?'bg-success':r.status==='rejected'?'bg-danger':'bg-warning'}">${r.status}</span></td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="bi bi-sliders"></i> Set Status
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        ${r.status !== 'approved' ? `<li><button class="dropdown-item text-success" onclick="updateOutpassStatus('${r.id}','approved')"><i class="bi bi-check-circle me-2"></i>Approve</button></li>` : ''}
                        ${r.status !== 'rejected' ? `<li><button class="dropdown-item text-danger" onclick="updateOutpassStatus('${r.id}','rejected')"><i class="bi bi-x-circle me-2"></i>Reject</button></li>` : ''}
                        ${r.status !== 'pending' ? `<li><button class="dropdown-item text-warning" onclick="updateOutpassStatus('${r.id}','pending')"><i class="bi bi-hourglass-split me-2"></i>Mark Pending</button></li>` : ''}
                    </ul>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
        // Load the risk assessment asynchronously
        fetchOutpassRiskScore(r);
    });
}

async function updateOutpassStatus(id, status) {
    try {
        const res = await fetch(`${API_BASE}/outpass/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Update failed' }));
            alert(err.error || 'Failed to update outpass status');
            return;
        }
        // Refresh warden view
        if (currentUser.role === 'warden') {
            await loadAllOutpasses();
        }
        // Broadcast update for student dashboards
        try {
            localStorage.setItem('outpassUpdate', JSON.stringify({ ts: Date.now(), id, status }));
        } catch (_) {}
        // Also refresh student view if they're on the outpass page
        if (currentUser.role === 'student') {
            await loadMyOutpasses();
        }
    } catch (e) {
        console.error('Failed to update outpass', e);
        alert('Network error. Please try again.');
    }
}
// Show specific section
function showSection(sectionName, el) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Add active class to clicked nav link (support inline onclick and programmatic calls)
    const source = el || window.event?.target;
    if (source && source.classList) {
        source.classList.add('active');
    } else {
        // Fallback: mark matching nav link by selector
        const link = document.querySelector(`.sidebar .nav-link[onclick*="${sectionName}"]`);
        if (link) link.classList.add('active');
    }
    
    // Update page title
    const titles = {
        'overview': 'Dashboard Overview',
        'students': 'Student Management',
        'rooms': 'Room Management',
        'fees': 'Fee Management',
        'notices': 'Notice Board',
        'grievances': 'My Grievances & Requests',
        'complaints': 'Complaints',
        'attendance': 'Attendance',
        'outpass': 'Outpass',
        'visitors': 'Visitor Management',
        'profile': 'My Profile',
        'myfees': 'My Fee Status',
        'mygrievances': 'Submit Request',
        'staff-assistant': 'Staff AI RAG Assistant'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName] || 'Dashboard';
    
    // Load section-specific data
    switch(sectionName) {
        case 'students':
            // Only allow warden access to student management
            if (currentUser.role === 'warden') {
                updateStudentsTable();
            } else {
                showSection('overview');
            }
            break;
        case 'rooms':
            // Only allow warden access to room management
            if (currentUser.role === 'warden') {
                updateRoomStats();
                updateRoomsGrid();
            } else {
                showSection('overview');
            }
            break;
        case 'fees':
            // Only allow warden access to fee management
            if (currentUser.role === 'warden') {
                updateFeesTable();
            } else {
                showSection('overview');
            }
            break;
        case 'notices':
            updateNoticesList();
            break;
        case 'complaints':
            setupComplaintForm();
            refreshComplaints();
            break;
        case 'attendance':
            setupAttendanceView();
            break;
        case 'outpass':
            setupOutpassView();
            break;
        case 'outpass':
            setupOutpassView();
            break;
        case 'grievances':
            // Allow both wardens and students to access grievances
            if (currentUser.role === 'warden') {
                updateGrievancesList();
            } else {
                // For students, show their own grievances
                updateStudentGrievancesList();
            }
            break;
        case 'visitors':
            // Only allow warden access to visitors
            if (currentUser.role === 'warden') {
                updateVisitorsList();
            } else {
                showSection('overview');
            }
            break;
        case 'staff-assistant':
            // Only allow warden access to staff assistant
            if (currentUser.role === 'warden') {
                // View is passive, user initiates via input
            } else {
                showSection('overview');
            }
            break;
        case 'profile':
            updateStudentProfile();
            break;
        case 'myfees':
            loadMyFees();
            break;
        case 'outpass':
            setupOutpassView();
            break;
        // Removed mygrievances feature
    }

}

// Update students table with pagination
function updateStudentsTable() {
    const tbody = document.getElementById('studentsTable');
    tbody.innerHTML = '';
    
    dashboardData.students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td><span class="badge bg-info">${student.usn || student.id}</span></td>
            <td>${student.email}</td>
            <td>${student.roomNumber || 'Not assigned'}</td>
            <td><span class="badge ${student.feesStatus === 'Paid' ? 'bg-success' : 'bg-warning'}">${student.feesStatus || 'Pending'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-info me-1" onclick="generateAISummary('${student.usn || student.id}')">
                    <i class="bi bi-robot"></i> AI Summary
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="editStudent('${student.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${student.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    
    // Update pagination info
    updatePaginationInfo();
}

// Update room statistics
function updateRoomStats() {
    const container = document.getElementById('roomStats');
    container.innerHTML = '';
    
    // Calculate statistics by sharing type
    const stats = {};
    dashboardData.rooms.forEach(room => {
        if (!stats[room.sharingType]) {
            stats[room.sharingType] = {
                total: 0,
                occupied: 0,
                available: 0,
                totalCapacity: 0,
                occupiedCapacity: 0
            };
        }
        
        stats[room.sharingType].total++;
        stats[room.sharingType].totalCapacity += room.capacity;
        stats[room.sharingType].occupiedCapacity += room.occupied;
        
        if (room.status === 'available') {
            stats[room.sharingType].available++;
        } else {
            stats[room.sharingType].occupied++;
        }
    });
    
    // Display statistics cards
    Object.keys(stats).forEach(sharingType => {
        const stat = stats[sharingType];
        const occupancyRate = Math.round((stat.occupiedCapacity / stat.totalCapacity) * 100);
        
        const statCard = document.createElement('div');
        statCard.className = 'col-md-3 mb-3';
        
        const sharingTypeColors = {
            '2-sharing': 'bg-primary',
            '3-sharing': 'bg-info',
            '4-sharing': 'bg-warning',
            '5-sharing': 'bg-secondary'
        };
        
        statCard.innerHTML = `
            <div class="card ${sharingTypeColors[sharingType] || 'bg-secondary'} text-white">
                <div class="card-body text-center">
                    <h6 class="card-title">${sharingType}</h6>
                    <h4 class="mb-1">${stat.total}</h4>
                    <small>Total Rooms</small>
                    <hr class="my-2">
                    <div class="row text-center">
                        <div class="col-6">
                            <small>Available</small>
                            <div class="fw-bold">${stat.available}</div>
                        </div>
                        <div class="col-6">
                            <small>Occupied</small>
                            <div class="fw-bold">${stat.occupied}</div>
                        </div>
                    </div>
                    <hr class="my-2">
                    <small>Occupancy: ${occupancyRate}%</small>
                </div>
            </div>
        `;
        container.appendChild(statCard);
    });
}

// Update rooms grid
function updateRoomsGrid() {
    const container = document.getElementById('roomsGrid');
    container.innerHTML = '';
    
    // Group rooms by floor
    const roomsByFloor = {};
    dashboardData.rooms.forEach(room => {
        if (!roomsByFloor[room.floor]) {
            roomsByFloor[room.floor] = [];
        }
        roomsByFloor[room.floor].push(room);
    });
    
    // Display rooms by floor
    Object.keys(roomsByFloor).sort().forEach(floor => {
        // Add floor header
        const floorHeader = document.createElement('div');
        floorHeader.className = 'col-12 mb-3';
        floorHeader.innerHTML = `
            <div class="card bg-light">
                <div class="card-body text-center">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-building"></i> Floor ${floor}
                    </h5>
                </div>
            </div>
        `;
        container.appendChild(floorHeader);
        
        // Add rooms for this floor
        roomsByFloor[floor].forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'col-md-4 mb-3';
            
            const statusClass = room.status === 'full' ? 'border-danger' : 'border-success';
            const statusText = room.status === 'full' ? 'Full' : 'Available';
            const statusColor = room.status === 'full' ? 'text-danger' : 'text-success';
            
            // Get sharing type color - Only 2-sharing and 4-sharing
            const sharingTypeColors = {
                '2-sharing': 'bg-primary',
                '4-sharing': 'bg-warning'
            };
            
            roomCard.innerHTML = `
                <div class="card ${statusClass}">
                    <div class="card-body text-center">
                        <h5 class="card-title">Room ${room.number}</h5>
                        <div class="mb-2">
                            <span class="badge ${sharingTypeColors[room.sharingType] || 'bg-secondary'} mb-1">
                                ${room.sharingType}
                            </span>
                        </div>
                        <p class="card-text">
                            <i class="bi bi-people"></i> ${room.occupied}/${room.capacity} Occupied
                        </p>
                        <span class="badge ${statusClass.includes('danger') ? 'bg-danger' : 'bg-success'}">${statusText}</span>
                        ${room.status === 'available' ? `
                            <button class="btn btn-sm btn-primary mt-2" onclick="assignToRoom('${room.number}')">
                                <i class="bi bi-plus"></i> Assign
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            container.appendChild(roomCard);
        });
    });
}

// Update fees table
function updateFeesTable() {
    const tbody = document.getElementById('feesTable');
    tbody.innerHTML = '';
    
    dashboardData.fees.forEach(fee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fee.studentName}</td>
            <td>${fee.roomNumber || 'Not assigned'}</td>
            <td>₹${fee.totalFee.toLocaleString()}</td>
            <td>₹${fee.paid.toLocaleString()}</td>
            <td>₹${fee.due.toLocaleString()}</td>
            <td><span class="badge ${fee.status === 'Paid' ? 'bg-success' : 'bg-warning'}">${fee.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-info me-1" onclick="generateAISummary('${fee.id}')">
                    <i class="bi bi-robot"></i> AI Summary
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="showEditFeeModal('${fee.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                ${fee.status !== 'Paid' ? `
                    <button class="btn btn-sm btn-success" onclick="markFeePaid('${fee.id}')">
                        <i class="bi bi-check"></i> Mark Paid
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}


// Update notices list
function updateNoticesList() {
    const container = document.getElementById('noticesList');
    container.innerHTML = '';
    
    if (dashboardData.notices.length === 0) {
        container.innerHTML = '<p class="text-muted">No notices available</p>';
        return;
    }
    
    dashboardData.notices.forEach(notice => {
        const noticeDiv = document.createElement('div');
        noticeDiv.className = 'card mb-3';
        noticeDiv.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${notice.title}</h5>
                <p class="card-text">${notice.body}</p>
                <small class="text-muted">Posted: ${new Date(notice.createdAt).toLocaleDateString()}</small>
                <div class="float-end">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteNotice('${notice.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(noticeDiv);
    });
}

// Load grievances data
async function loadGrievances() {
    try {
        // For now, use mock data - in a real app, this would fetch from API
        dashboardData.grievances = [
            {
                id: 'G001',
                studentName: 'John Doe',
                studentEmail: 'john@example.com',
                type: 'maintenance',
                subject: 'Broken AC in Room 101',
                description: 'The air conditioning unit in room 101 is not working properly.',
                status: 'pending',
                priority: 'high',
                date: new Date('2024-01-15'),
                resolution: ''
            },
            {
                id: 'G002',
                studentName: 'Jane Smith',
                studentEmail: 'jane@example.com',
                type: 'noise',
                subject: 'Noise from adjacent room',
                description: 'Loud music playing from room 102 during study hours.',
                status: 'in_progress',
                priority: 'medium',
                date: new Date('2024-01-14'),
                resolution: 'Spoke to the students, they agreed to reduce volume.'
            },
            {
                id: 'G003',
                studentName: 'Mike Johnson',
                studentEmail: 'mike@example.com',
                type: 'facility',
                subject: 'WiFi connectivity issues',
                description: 'WiFi keeps disconnecting in room 201.',
                status: 'resolved',
                priority: 'high',
                date: new Date('2024-01-13'),
                resolution: 'Router was replaced and issue is now resolved.'
            }
        ];
    } catch (error) {
        console.error('Error loading grievances:', error);
        dashboardData.grievances = [];
    }
}

// Update grievances list
function updateGrievancesList() {
    updateGrievancesStats();
    updateGrievancesTable();
}

// Update grievances statistics
function updateGrievancesStats() {
    const total = dashboardData.grievances.length;
    const pending = dashboardData.grievances.filter(g => g.status === 'pending').length;
    const resolved = dashboardData.grievances.filter(g => g.status === 'resolved').length;
    const inProgress = dashboardData.grievances.filter(g => g.status === 'in_progress').length;
    
    document.getElementById('totalGrievances').textContent = total;
    document.getElementById('pendingGrievances').textContent = pending;
    document.getElementById('resolvedGrievances').textContent = resolved;
    document.getElementById('inProgressGrievances').textContent = inProgress;
}

// Update grievances table
function updateGrievancesTable() {
    const tbody = document.getElementById('grievancesTable');
    tbody.innerHTML = '';
    
    if (dashboardData.grievances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No grievances found</td></tr>';
        return;
    }
    
    dashboardData.grievances.forEach(grievance => {
        const row = document.createElement('tr');
        const statusClass = {
            'pending': 'bg-warning',
            'in_progress': 'bg-info',
            'resolved': 'bg-success',
            'closed': 'bg-secondary'
        }[grievance.status] || 'bg-warning';
        
        const priorityClass = {
            'low': 'text-success',
            'medium': 'text-warning',
            'high': 'text-danger',
            'urgent': 'text-danger fw-bold'
        }[grievance.priority] || 'text-warning';
        
        row.innerHTML = `
            <td><span class="badge bg-primary">${grievance.id}</span></td>
            <td>${grievance.studentName}</td>
            <td><span class="badge bg-secondary">${grievance.type.replace('_', ' ')}</span></td>
            <td>${grievance.subject}</td>
            <td><span class="badge ${statusClass}">${grievance.status.replace('_', ' ')}</span></td>
            <td>${grievance.date.toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editGrievance('${grievance.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="viewGrievance('${grievance.id}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update student profile
function updateStudentProfile() {
    // Find student data
    const student = dashboardData.students.find(s => s.email === currentUser.email) || {
        name: currentUser.name,
        email: currentUser.email,
        roomNumber: 'Not Assigned',
        feesStatus: 'Pending'
    };
    
    // Update profile fields
    document.getElementById('profileName').textContent = student.name;
    document.getElementById('profileEmail').textContent = student.email;
    document.getElementById('profileRole').textContent = currentUser.role;
    document.getElementById('profileRoom').textContent = student.roomNumber || 'Not Assigned';
    document.getElementById('profileFees').innerHTML = `<span class="badge ${student.feesStatus === 'Paid' ? 'bg-success' : 'bg-warning'}">${student.feesStatus || 'Pending'}</span>`;
}

// Setup grievance form
function setupGrievanceForm() {
    const form = document.getElementById('grievanceForm');
    if (form) {
        // Remove any existing event listeners
        form.removeEventListener('submit', handleGrievanceSubmit);
        
        // Add new event listener
        form.addEventListener('submit', handleGrievanceSubmit);
        console.log('Grievance form setup completed successfully');
    } else {
        console.error('Grievance form not found!');
        // Try to find the form again after a short delay
        setTimeout(() => {
            const retryForm = document.getElementById('grievanceForm');
            if (retryForm) {
                retryForm.addEventListener('submit', handleGrievanceSubmit);
                console.log('Grievance form found on retry');
            } else {
                console.error('Grievance form still not found after retry');
            }
        }, 100);
    }
}

// Handle grievance form submission
function handleGrievanceSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('grievanceType').value;
    const subject = document.getElementById('grievanceSubject').value;
    const description = document.getElementById('grievanceDescription').value;
    
    // Basic validation
    if (!type || !subject || !description) {
        showGrievanceMessage('Please fill in all required fields.', 'danger');
        return;
    }
    
    if (description.length < 10) {
        showGrievanceMessage('Please provide a more detailed description (at least 10 characters).', 'danger');
        return;
    }
    
    try {
        // Create grievance data
        const grievanceData = {
            type: type,
            subject: subject,
            description: description,
            studentName: currentUser.name,
            studentEmail: currentUser.email,
            status: 'pending',
            priority: 'medium',
            date: new Date().toISOString()
        };
        
        // Store in local storage
        let grievances = JSON.parse(localStorage.getItem('studentGrievances') || '[]');
        grievances.push({
            id: 'G' + Date.now(),
            ...grievanceData
        });
        localStorage.setItem('studentGrievances', JSON.stringify(grievances));
        
        // Show success message
        showGrievanceMessage('Your request has been submitted successfully. The warden will review it soon.', 'success');
        
        // Clear form
        document.getElementById('grievanceForm').reset();
        
        // Refresh the requests list
        loadMyRequests();
        
        // Also refresh the main grievances list if it's visible
        if (currentUser.role === 'student') {
            updateStudentGrievancesList();
        }
        
    } catch (error) {
        console.error('Error submitting grievance:', error);
        showGrievanceMessage('Error submitting request. Please try again.', 'danger');
    }
}

// Show grievance form message
function showGrievanceMessage(message, type) {
    // Remove any existing messages
    const existingMessage = document.getElementById('grievanceMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'grievanceMessage';
    messageDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert after form
    const form = document.getElementById('grievanceForm');
    if (form && form.parentNode) {
        form.parentNode.insertBefore(messageDiv, form.nextSibling);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}


// Load and display student's submitted requests (read-only)
function loadMyRequests() {
    const container = document.getElementById('myRequestsList');
    if (!container) return;
    
    try {
        const grievances = JSON.parse(localStorage.getItem('studentGrievances') || '[]');
        
        // Filter requests for current student
        const myRequests = grievances.filter(req => req.studentEmail === currentUser.email);
        
        if (myRequests.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">No requests submitted yet</p>
                    <small>Submit your first request using the form on the left</small>
                </div>
            `;
            return;
        }
        
        // Sort by date (newest first)
        myRequests.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = '';
        
        myRequests.forEach(request => {
            const requestCard = document.createElement('div');
            requestCard.className = 'card mb-3 border-0 shadow-sm';
            
            const statusClass = {
                'pending': 'warning',
                'in_progress': 'info',
                'resolved': 'success',
                'closed': 'secondary'
            }[request.status] || 'warning';
            
            const typeLabels = {
                'maintenance': 'Maintenance Request',
                'grievance': 'Grievance',
                'room_change': 'Room Change Request',
                'other': 'Other Request'
            };

            const priorityClass = {
                'low': 'success',
                'medium': 'warning',
                'high': 'danger',
                'urgent': 'danger'
            }[request.priority] || 'warning';

            // Format submission date
            const submissionDate = new Date(request.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            requestCard.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h6 class="card-title mb-0">${request.subject}</h6>
                        <div class="d-flex gap-1">
                            <span class="badge bg-${statusClass}">${request.status.replace('_', ' ').toUpperCase()}</span>
                            <span class="badge bg-${priorityClass}">${request.priority.toUpperCase()}</span>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <span class="badge bg-secondary me-2">${typeLabels[request.type] || request.type}</span>
                        <small class="text-muted">
                            <i class="bi bi-calendar me-1"></i>
                            Submitted: ${submissionDate}
                        </small>
                    </div>
                    
                    <div class="mb-3">
                        <h6 class="text-muted mb-2 small">Your Request:</h6>
                        <p class="card-text small">${request.description}</p>
                    </div>
                    
                    ${request.resolution ? `
                        <div class="alert alert-success py-2">
                            <h6 class="alert-heading small mb-2">
                                <i class="bi bi-check-circle me-1"></i>Warden's Response
                            </h6>
                            <p class="mb-1 small">${request.resolution}</p>
                            ${request.resolutionDate ? `
                                <small class="text-muted">
                                    <i class="bi bi-clock me-1"></i>
                                    Responded: ${new Date(request.resolutionDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </small>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="alert alert-warning py-2">
                            <i class="bi bi-clock me-2"></i>
                            <strong class="small">Status:</strong> 
                            <span class="small">${request.status === 'pending' ? 'Awaiting review by warden' : 'Under review by warden'}</span>
                        </div>
                    `}
                    
                    ${request.status === 'resolved' ? `
                        <div class="text-center mt-2">
                            <span class="badge bg-success">
                                <i class="bi bi-check-circle me-1"></i>
                                Completed
                            </span>
                        </div>
                    ` : ''}
                    
                    <div class="text-end mt-2">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteGrievance('${request.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(requestCard);
        });
        
    } catch (error) {
        console.error('Error loading my requests:', error);
        container.innerHTML = '<div class="text-danger">Error loading requests. Please try again.</div>';
    }
}

// Refresh my requests
function refreshMyRequests() {
    loadMyRequests();
}

// Delete grievance
function deleteGrievance(grievanceId) {
    if (confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
        try {
            // Get current grievances
            let grievances = JSON.parse(localStorage.getItem('studentGrievances') || '[]');
            
            // Filter out the deleted grievance
            grievances = grievances.filter(g => g.id !== grievanceId);
            
            // Save back to localStorage
            localStorage.setItem('studentGrievances', JSON.stringify(grievances));
            
            // Refresh the display
            loadMyRequests();
            
            // Also refresh the main grievances list if it's visible
            if (currentUser.role === 'student') {
                updateStudentGrievancesList();
            }
            
            // Show success message
            showGrievanceMessage('Request deleted successfully.', 'success');
            
        } catch (error) {
            console.error('Error deleting grievance:', error);
            showGrievanceMessage('Error deleting request. Please try again.', 'danger');
        }
    }
}

// Test grievance section
function testGrievanceSection() {
    console.log('Testing grievance section...');
    
    // Check if form exists
    const form = document.getElementById('grievanceForm');
    if (!form) {
        alert('Grievance form not found!');
        return;
    }
    
    // Check if form elements exist
    const type = document.getElementById('grievanceType');
    const subject = document.getElementById('grievanceSubject');
    const description = document.getElementById('grievanceDescription');
    
    if (!type || !subject || !description) {
        alert('Form elements not found!');
        return;
    }
    
    // Fill test data
    type.value = 'maintenance';
    subject.value = 'Test Request - ' + new Date().toLocaleTimeString();
    description.value = 'This is a test request to verify the grievance form is working properly. The form should submit successfully and appear in the requests list.';
    
    console.log('Test data filled successfully');
    showGrievanceMessage('Test data filled. You can now submit the form to test the complete workflow.', 'info');
}

// Load and display student's fee information
async function loadMyFees() {
    const container = document.getElementById('myFeesContent');
    if (!container) return;
    
    try {
        // Get student data from API
        const response = await fetch(`${API_BASE}/db`);
        if (response.ok) {
            const db = await response.json();
            
            // Find current student's data
            const studentData = Object.values(db.students || {}).find(student => 
                student.email === currentUser.email
            );
            
            if (!studentData) {
                container.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-exclamation-circle fs-1"></i>
                        <p class="mt-2">Student data not found</p>
                        <small>Please contact the warden if this issue persists</small>
                    </div>
                `;
                return;
            }
            
            // Display fee information
            displayFeeInformation(studentData, container);
            
        } else {
            throw new Error('Failed to fetch data');
        }
    } catch (error) {
        console.error('Error loading fee data:', error);
        container.innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle fs-1"></i>
                <p class="mt-2">Error loading fee information</p>
                <small>Please try again later or contact the warden</small>
            </div>
        `;
    }
}

// Display fee information in a nice format
function displayFeeInformation(studentData, container) {
    const totalFee = studentData.totalFee || 0;
    const paidAmount = studentData.paid || 0;
    const dueAmount = studentData.feesDue || (totalFee - paidAmount);
    const feesStatus = studentData.feesStatus || 'Pending';
    const roomNumber = studentData.roomNumber || 'Not Assigned';
    
    // Calculate fee status and progress
    const progressPercentage = totalFee > 0 ? Math.round((paidAmount / totalFee) * 100) : 0;
    const isPaid = feesStatus === 'Paid' || dueAmount <= 0;
    
    // Status badge class
    const statusClass = isPaid ? 'success' : 'warning';
    const statusIcon = isPaid ? 'bi-check-circle' : 'bi-clock';
    
    container.innerHTML = `
        <div class="row">
            <!-- Fee Overview Card -->
            <div class="col-lg-8 mb-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title mb-4">
                            <i class="bi bi-credit-card me-2"></i>Fee Overview
                        </h5>
                        
                        <!-- Fee Status -->
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="d-flex align-items-center">
                                    <div class="me-3">
                                        <i class="bi ${statusIcon} fs-2 text-${statusClass}"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-1">Payment Status</h6>
                                        <span class="badge bg-${statusClass} fs-6">${feesStatus}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="text-md-end">
                                    <h6 class="mb-1">Room Number</h6>
                                    <span class="badge bg-info fs-6">${roomNumber}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="mb-4">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="fw-bold">Payment Progress</span>
                                <span class="fw-bold">${progressPercentage}%</span>
                            </div>
                            <div class="progress" style="height: 10px;">
                                <div class="progress-bar bg-${statusClass}" role="progressbar" 
                                     style="width: ${progressPercentage}%" 
                                     aria-valuenow="${progressPercentage}" 
                                     aria-valuemin="0" aria-valuemax="100">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Fee Breakdown -->
                        <div class="row">
                            <div class="col-md-4">
                                <div class="text-center p-3 bg-light rounded">
                                    <h4 class="text-primary mb-1">₹${totalFee.toLocaleString()}</h4>
                                    <small class="text-muted">Total Fee</small>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="text-center p-3 bg-light rounded">
                                    <h4 class="text-success mb-1">₹${paidAmount.toLocaleString()}</h4>
                                    <small class="text-muted">Amount Paid</small>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="text-center p-3 bg-light rounded">
                                    <h4 class="text-${isPaid ? 'success' : 'danger'} mb-1">₹${dueAmount.toLocaleString()}</h4>
                                    <small class="text-muted">Amount Due</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Payment Information Card -->
            <div class="col-lg-4 mb-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-title mb-3">
                            <i class="bi bi-info-circle me-2"></i>Payment Information
                        </h6>
                        
                        <div class="mb-3">
                            <small class="text-muted">Last Updated</small>
                            <div class="fw-bold">${new Date().toLocaleDateString()}</div>
                        </div>
                        
                        <div class="mb-3">
                            <small class="text-muted">Room Type</small>
                            <div class="fw-bold">${getRoomTypeFromNumber(roomNumber)}</div>
                        </div>
                        
                        <div class="mb-3">
                            <small class="text-muted">Academic Year</small>
                            <div class="fw-bold">2024-25</div>
                        </div>
                        
                        ${!isPaid ? `
                            <div class="alert alert-warning mb-0">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                <small>Please contact the warden for payment instructions.</small>
                            </div>
                        ` : `
                            <div class="alert alert-success mb-0">
                                <i class="bi bi-check-circle me-2"></i>
                                <small>All fees have been paid successfully!</small>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Fee History (if any) -->
        <div class="row">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-title mb-3">
                            <i class="bi bi-clock-history me-2"></i>Fee History
                        </h6>
                        <div class="text-center text-muted py-3">
                            <i class="bi bi-inbox fs-1"></i>
                            <p class="mt-2">No payment history available</p>
                            <small>Payment records will appear here once transactions are processed</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to determine room type based on room number
function getRoomTypeFromNumber(roomNumber) {
    if (!roomNumber || roomNumber === 'Not Assigned') return 'Not Assigned';
    
    // This is a simple logic - you can modify based on your room numbering system
    const roomNum = parseInt(roomNumber);
    if (roomNum >= 100 && roomNum <= 199) return '2-Sharing (Floor 1)';
    if (roomNum >= 200 && roomNum <= 299) return '2-Sharing (Floor 2)';
    if (roomNum >= 300 && roomNum <= 399) return '2-Sharing (Floor 3)';
    if (roomNum >= 400 && roomNum <= 499) return '4-Sharing (Floor 4)';
    
    return 'Standard Room';
}

// Refresh my fees
function refreshMyFees() {
    loadMyFees();
}

// Update grievances list for students (showing only their own grievances - read-only)
function updateStudentGrievancesList() {
    const container = document.getElementById('grievancesList');
    if (!container) return;
    
    try {
        // Get grievances from localStorage (student-submitted ones)
        const studentGrievances = JSON.parse(localStorage.getItem('studentGrievances') || '[]');
        
        // Filter grievances for current student
        const myGrievances = studentGrievances.filter(grievance => 
            grievance.studentEmail === currentUser.email
        );
        
        if (myGrievances.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-inbox fs-1"></i>
                    <h5 class="mt-3">No grievances submitted yet</h5>
                    <p class="text-muted">You haven't submitted any grievances or requests.</p>
                    <button class="btn btn-primary" onclick="showSection('mygrievances')">
                        <i class="bi bi-plus-circle"></i> Submit Your First Request
                    </button>
                </div>
            `;
            return;
        }
        
        // Sort by date (newest first)
        myGrievances.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = '';
        
        myGrievances.forEach(grievance => {
            const grievanceCard = document.createElement('div');
            grievanceCard.className = 'card mb-3';
            
            const statusClass = {
                'pending': 'warning',
                'in_progress': 'info',
                'resolved': 'success',
                'closed': 'secondary'
            }[grievance.status] || 'warning';
            
            const typeLabels = {
                'maintenance': 'Maintenance Request',
                'grievance': 'Grievance',
                'room_change': 'Room Change Request',
                'other': 'Other Request'
            };
            
            const priorityClass = {
                'low': 'success',
                'medium': 'warning',
                'high': 'danger',
                'urgent': 'danger'
            }[grievance.priority] || 'warning';
            
            // Format submission date
            const submissionDate = new Date(grievance.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            grievanceCard.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h6 class="card-title mb-0">${grievance.subject}</h6>
                        <div class="d-flex gap-2">
                            <span class="badge bg-${statusClass}">${grievance.status.replace('_', ' ').toUpperCase()}</span>
                            <span class="badge bg-${priorityClass}">${grievance.priority.toUpperCase()}</span>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <span class="badge bg-secondary me-2">${typeLabels[grievance.type] || grievance.type}</span>
                        <small class="text-muted">
                            <i class="bi bi-calendar me-1"></i>
                            Submitted: ${submissionDate}
                        </small>
                    </div>
                    
                    <div class="mb-3">
                        <h6 class="text-muted mb-2">Your Request:</h6>
                        <p class="card-text">${grievance.description}</p>
                    </div>
                    
                    ${grievance.resolution ? `
                        <div class="alert alert-success">
                            <h6 class="alert-heading">
                                <i class="bi bi-check-circle me-2"></i>Warden's Response
                            </h6>
                            <p class="mb-2">${grievance.resolution}</p>
                            ${grievance.resolutionDate ? `
                                <small class="text-muted">
                                    <i class="bi bi-clock me-1"></i>
                                    Responded: ${new Date(grievance.resolutionDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </small>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="alert alert-warning">
                            <i class="bi bi-clock me-2"></i>
                            <strong>Status:</strong> 
                            ${grievance.status === 'pending' ? 'Awaiting review by warden' : 'Under review by warden'}
                            <br>
                            <small class="text-muted">You will be notified when the warden responds to your request.</small>
                        </div>
                    `}
                    
                    ${grievance.status === 'resolved' ? `
                        <div class="text-center mt-3">
                            <span class="badge bg-success fs-6">
                                <i class="bi bi-check-circle me-1"></i>
                                Request Completed
                            </span>
                        </div>
                    ` : ''}
                    
                    <div class="text-end mt-3">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteGrievance('${grievance.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(grievanceCard);
        });
        
    } catch (error) {
        console.error('Error loading student grievances:', error);
        container.innerHTML = '<div class="text-danger">Error loading grievances. Please try again.</div>';
    }
}

// Show update profile modal
function showUpdateProfileModal() {
    // Load current user data into the form
    loadCurrentUserData();
    const modal = new bootstrap.Modal(document.getElementById('updateProfileModal'));
    modal.show();
}

// Load current user data into the update form
async function loadCurrentUserData() {
    try {
        // Get current user data from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Get detailed student data from API
        const response = await fetch(`${API_BASE}/student/${user.id || user.usn}`);
        if (response.ok) {
            const studentData = await response.json();
            
            // Populate form fields
            document.getElementById('updateName').value = studentData.name || user.name || '';
            document.getElementById('updateEmail').value = studentData.email || user.email || '';
            document.getElementById('updateUSN').value = studentData.usn || user.usn || '';
            document.getElementById('updatePhone').value = studentData.phone || '';
            document.getElementById('updateAddress').value = studentData.address || '';
            document.getElementById('updateParentPhone').value = studentData.parentPhone || '';
            document.getElementById('updateRoomNumber').value = studentData.roomNumber || 'Not Assigned';
        } else {
            // Fallback to user data from localStorage
            document.getElementById('updateName').value = user.name || '';
            document.getElementById('updateEmail').value = user.email || '';
            document.getElementById('updateUSN').value = user.usn || '';
            document.getElementById('updatePhone').value = '';
            document.getElementById('updateAddress').value = '';
            document.getElementById('updateParentPhone').value = '';
            document.getElementById('updateRoomNumber').value = 'Not Assigned';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        // Fallback to user data from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        document.getElementById('updateName').value = user.name || '';
        document.getElementById('updateEmail').value = user.email || '';
        document.getElementById('updateUSN').value = user.usn || '';
        document.getElementById('updatePhone').value = '';
        document.getElementById('updateAddress').value = '';
        document.getElementById('updateParentPhone').value = '';
        document.getElementById('updateRoomNumber').value = 'Not Assigned';
    }
}

// Setup update profile form
function setupUpdateProfileForm() {
    const form = document.getElementById('updateProfileForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('updateName').value.trim();
            const email = document.getElementById('updateEmail').value.trim();
            const phone = document.getElementById('updatePhone').value.trim();
            const address = document.getElementById('updateAddress').value.trim();
            const parentPhone = document.getElementById('updateParentPhone').value.trim();
            const messageDiv = document.getElementById('updateProfileMessage');
            
            // Basic validation
            if (!name || !email || !phone || !address || !parentPhone) {
                messageDiv.textContent = 'Please fill out all fields.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (!/^[0-9]{10}$/.test(phone)) {
                messageDiv.textContent = 'Please enter a valid 10-digit phone number.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (!/^[0-9]{10}$/.test(parentPhone)) {
                messageDiv.textContent = 'Please enter a valid 10-digit parent/guardian phone number.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                
                // Update student data via API
                const response = await fetch(`${API_BASE}/student/${user.id || user.usn}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        phone,
                        address,
                        parentPhone
                    })
                });
                
                if (response.ok) {
                    // Update localStorage with new data
                    const updatedUser = {
                        ...user,
                        name,
                        email
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    currentUser = updatedUser;
                    
                    // Update display name
                    document.getElementById('userName').textContent = name;
                    
                    messageDiv.textContent = 'Profile updated successfully!';
                    messageDiv.className = 'mt-2 text-success';
                    
                    // Reload dashboard data
                    await loadDashboardData();
                    
                    // Close modal after 2 seconds
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('updateProfileModal'));
                        if (modal) modal.hide();
                        
                        // Refresh the profile display
                        if (currentUser.role === 'student') {
                            updateStudentOverview();
                        }
                    }, 2000);
                } else {
                    const result = await response.json();
                    messageDiv.textContent = result.error || 'Profile update failed. Please try again.';
                    messageDiv.className = 'mt-2 text-danger';
                }
            } catch (error) {
                messageDiv.textContent = 'Profile update failed. Please try again.';
                messageDiv.className = 'mt-2 text-danger';
                console.error('Profile update error:', error);
            }
        });
    }
}

// Show forgot password modal
function showForgotPasswordModal() {
    const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    modal.show();
}

// Handle forgot password form submission
function setupForgotPasswordForm() {
    const form = document.getElementById('forgotPasswordForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('forgotEmail').value;
            const usn = document.getElementById('forgotUSN').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            const messageDiv = document.getElementById('forgotPasswordMessage');
            
            // Basic validation
            if (newPassword !== confirmNewPassword) {
                messageDiv.textContent = 'Passwords do not match.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (newPassword.length < 6) {
                messageDiv.textContent = 'Password must be at least 6 characters long.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (!/^4YG[0-9]{2}[A-Z]{2}[0-9]{3}$/.test(usn.toUpperCase())) {
                messageDiv.textContent = 'Invalid USN format. Use format like: 4YG23CS300';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE}/api/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        email, 
                        usn: usn.toUpperCase(), 
                        newPassword 
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    messageDiv.textContent = 'Password reset successful! Please login with your new password.';
                    messageDiv.className = 'mt-2 text-success';
                    
                    // Clear form
                    form.reset();
                    
                    // Close modal after 2 seconds
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                        modal.hide();
                    }, 2000);
                } else {
                    messageDiv.textContent = result.error || 'Password reset failed.';
                    messageDiv.className = 'mt-2 text-danger';
                }
            } catch (error) {
                messageDiv.textContent = 'Password reset failed. Please try again.';
                messageDiv.className = 'mt-2 text-danger';
                console.error('Password reset error:', error);
            }
        });
    }
}

// Show add student modal
function showAddStudentModal() {
    // Populate room options with sharing types
    const roomSelect = document.getElementById('studentRoom');
    roomSelect.innerHTML = '<option value="">Select Room</option>';
    
    // Group available rooms by sharing type
    const availableRooms = dashboardData.rooms.filter(room => room.status === 'available');
    const roomsBySharingType = {};
    
    availableRooms.forEach(room => {
        if (!roomsBySharingType[room.sharingType]) {
            roomsBySharingType[room.sharingType] = [];
        }
        roomsBySharingType[room.sharingType].push(room);
    });
    
    // Add rooms grouped by sharing type
    Object.keys(roomsBySharingType).sort().forEach(sharingType => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `${sharingType} Rooms`;
        
        roomsBySharingType[sharingType].forEach(room => {
            const option = document.createElement('option');
            option.value = room.number;
            option.textContent = `Room ${room.number} (Floor ${room.floor}) - ${room.occupied}/${room.capacity} occupied`;
            optgroup.appendChild(option);
        });
        
        roomSelect.appendChild(optgroup);
    });
    
    new bootstrap.Modal(document.getElementById('addStudentModal')).show();
}

// Add new student
async function addStudent() {
    const name = document.getElementById('studentName').value;
    const email = document.getElementById('studentEmail').value;
    const usn = document.getElementById('studentUSN').value;
    const phone = document.getElementById('studentPhone').value;
    const parentPhone = document.getElementById('studentParentPhone').value;
    const address = document.getElementById('studentAddress').value;
    const roomNumber = document.getElementById('studentRoom').value;
    
    if (!name || !email || !usn || !phone || !parentPhone || !address) {
        alert('Please fill in all required fields (Name, Email, USN, Phone, Parent Phone, Address)');
        return;
    }
    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(phone)) {
        alert('Phone number must be 10 digits.');
        return;
    }
    if (!phonePattern.test(parentPhone)) {
        alert('Parent/Guardian phone number must be 10 digits.');
        return;
    }
    
    // Validate USN format - YG college only, Year 4 only
    const usnPattern = /^4YG[0-9]{2}[A-Z]{2}[0-9]{3}$/;
    if (!usnPattern.test(usn.toUpperCase())) {
        alert('Invalid USN format. Use format like: 4YG23CS300 (Year: 4 only, College: YG, Batch: 2 digits, Branch: 2 letters, Number: 3 digits)');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                email, 
                password: 'temp123', 
                role: 'student', 
                usn: usn.toUpperCase(),
                phone,
                parentPhone,
                address
            })
        });
        
        const result = await response.json();
        
        if (result.error) {
            alert(result.error);
            return;
        }
        
        // Assign room if selected
        if (roomNumber) {
            await assignRoomToStudent(usn.toUpperCase(), roomNumber);
        }
        
        alert('Student added successfully!');
        bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
        document.getElementById('addStudentForm').reset();
        
        // Refresh data
        await loadDashboardData();
        updateStudentsTable();
        
    } catch (error) {
        console.error('Error adding student:', error);
        alert('Error adding student');
    }
}

// Assign room to student
async function assignRoomToStudent(usn, roomNumber) {
    try {
        await fetch(`${API_BASE}/assign-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentUSN: usn, roomNumber })
        });
    } catch (error) {
        console.error('Error assigning room:', error);
    }
}

// Show add notice modal
function showAddNoticeModal() {
    new bootstrap.Modal(document.getElementById('addNoticeModal')).show();
}

// Add new notice
async function addNotice() {
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;
    
    if (!title || !content) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/notices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, body: content })
        });
        
        const result = await response.json();
        
        if (result.error) {
            alert(result.error);
            return;
        }
        
        alert('Notice added successfully!');
        bootstrap.Modal.getInstance(document.getElementById('addNoticeModal')).hide();
        document.getElementById('addNoticeForm').reset();
        
        // Refresh data
        await loadNotices();
        updateNoticesList();
        
    } catch (error) {
        console.error('Error adding notice:', error);
        alert('Error adding notice');
    }
}

// Show assign room modal
async function showAssignRoomModal() {
    // Populate student options
    const studentSelect = document.getElementById('assignStudentEmail');
    studentSelect.innerHTML = '<option value="">Loading students...</option>';
    
    try {
        // Fetch all students from the database
        const response = await fetch(`${API_BASE}/db`);
        if (!response.ok) {
            throw new Error('Failed to fetch students');
        }
        
        const db = await response.json();
        
        // Handle both array and object formats for students
        let allStudents = [];
        if (Array.isArray(db.students)) {
            allStudents = db.students;
        } else {
            allStudents = Object.entries(db.students || {}).map(([id, student]) => ({
                id,
                ...student
            }));
        }
        
        // Clear and populate student select
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        // Filter students without room assignment
        const studentsWithoutRoom = allStudents.filter(student => 
            !student.roomNumber || student.roomNumber === 'Not Assigned'
        );
        
        if (studentsWithoutRoom.length === 0) {
            studentSelect.innerHTML = '<option value="">No students available for room assignment</option>';
        } else {
            studentsWithoutRoom.forEach(student => {
                const option = document.createElement('option');
                option.value = student.email;
                option.textContent = `${student.name} (${student.usn || student.id})`;
                studentSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error loading students:', error);
        studentSelect.innerHTML = '<option value="">Error loading students</option>';
    }
    
    // Populate room options with sharing types
    const roomSelect = document.getElementById('assignRoomNumber');
    roomSelect.innerHTML = '<option value="">Select Room</option>';
    
    // Group available rooms by sharing type
    const availableRooms = dashboardData.rooms.filter(room => room.status === 'available');
    const roomsBySharingType = {};
    
    availableRooms.forEach(room => {
        if (!roomsBySharingType[room.sharingType]) {
            roomsBySharingType[room.sharingType] = [];
        }
        roomsBySharingType[room.sharingType].push(room);
    });
    
    // Add rooms grouped by sharing type
    Object.keys(roomsBySharingType).sort().forEach(sharingType => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `${sharingType} Rooms`;
        
        roomsBySharingType[sharingType].forEach(room => {
            const option = document.createElement('option');
            option.value = room.number;
            option.textContent = `Room ${room.number} (Floor ${room.floor}) - ${room.occupied}/${room.capacity} occupied`;
            optgroup.appendChild(option);
        });
        
        roomSelect.appendChild(optgroup);
    });
    
    new bootstrap.Modal(document.getElementById('assignRoomModal')).show();
}

// Assign room
async function assignRoom() {
    const studentEmail = document.getElementById('assignStudentEmail').value;
    const roomNumber = document.getElementById('assignRoomNumber').value;
    
    if (!studentEmail || !roomNumber) {
        alert('Please select student and enter room number');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/assign-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentEmail, roomNumber })
        });
        
        const result = await response.json();
        
        if (result.error) {
            alert(result.error);
            return;
        }
        
        alert('Room assigned successfully!');
        bootstrap.Modal.getInstance(document.getElementById('assignRoomModal')).hide();
        document.getElementById('assignRoomForm').reset();
        
        // Refresh data
        await loadDashboardData();
        updateStudentsTable();
        
    } catch (error) {
        console.error('Error assigning room:', error);
        alert('Error assigning room');
    }
}

// Mark fee as paid
async function markFeePaid(feeId) {
    if (confirm('Mark this fee as paid?')) {
        try {
            // Get the current fee data to use the correct total fee
            const fee = dashboardData.fees.find(f => f.id === feeId);
            if (!fee) {
                alert('Fee data not found');
                return;
            }
            
            const response = await fetch(`${API_BASE}/fee/${feeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    paid: fee.totalFee
                })
            });
            
            if (response.ok) {
                alert('Fee marked as paid!');
                await loadDashboardData();
                updateFeesTable();
            } else {
                alert('Error updating fee');
            }
        } catch (error) {
            console.error('Error updating fee:', error);
            alert('Error updating fee');
        }
    }
}

// Delete student
async function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        try {
            console.log('Deleting student with ID:', studentId);
            
            const response = await fetch(`${API_BASE}/student/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            console.log('Delete response:', result);
            
            if (response.ok) {
                alert('Student deleted successfully!');
                // Reload students with current pagination
                await loadStudents(currentPage, getSearchQuery());
                updateStudentsTable();
            } else {
                alert(`Error deleting student: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            alert(`Error deleting student: ${error.message}`);
        }
    }
}

// Delete notice
async function deleteNotice(noticeId) {
    if (confirm('Are you sure you want to delete this notice?')) {
        try {
            const response = await fetch(`${API_BASE}/notice/${noticeId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Notice deleted successfully!');
                await loadDashboardData();
                updateNoticesList();
            } else {
                alert('Error deleting notice');
            }
        } catch (error) {
            console.error('Error deleting notice:', error);
            alert('Error deleting notice');
        }
    }
}

// Edit student
function editStudent(studentId) {
    const student = dashboardData.students.find(s => s.id === studentId);
    if (!student) {
        console.error('Student not found with ID:', studentId);
        alert('Student not found');
        return;
    }
    
    // Populate form fields
    document.getElementById('editStudentId').value = studentId;
    document.getElementById('editStudentName').value = student.name;
    document.getElementById('editStudentEmail').value = student.email;
    document.getElementById('editStudentRoom').value = student.roomNumber || '';
    document.getElementById('editStudentFeesStatus').value = student.feesStatus || 'Pending';
    
    new bootstrap.Modal(document.getElementById('editStudentModal')).show();
}

// Update student
async function updateStudent() {
    const studentId = document.getElementById('editStudentId').value;
    const name = document.getElementById('editStudentName').value;
    const email = document.getElementById('editStudentEmail').value;
    const roomNumber = document.getElementById('editStudentRoom').value;
    const feesStatus = document.getElementById('editStudentFeesStatus').value;
    
    if (!name || !email) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/student/${studentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                email, 
                roomNumber, 
                feesStatus 
            })
        });
        
        if (response.ok) {
            alert('Student updated successfully!');
            bootstrap.Modal.getInstance(document.getElementById('editStudentModal')).hide();
            document.getElementById('editStudentForm').reset();
            
            // Refresh data
            await loadDashboardData();
            updateStudentsTable();
        } else {
            alert('Error updating student');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        alert('Error updating student');
    }
}

// Assign to specific room
function assignToRoom(roomNumber) {
    document.getElementById('assignRoomNumber').value = roomNumber;
    showAssignRoomModal();
}

// Show edit fee modal
function showEditFeeModal(feeId) {
    const fee = dashboardData.fees.find(f => f.id === feeId);
    if (!fee) {
        alert('Fee data not found');
        return;
    }
    
    // Populate form fields
    document.getElementById('editFeeId').value = feeId;
    document.getElementById('editStudentName').value = fee.studentName;
    document.getElementById('editTotalFee').value = fee.totalFee;
    document.getElementById('editPaidAmount').value = fee.paid;
    document.getElementById('editFeeStatus').value = fee.status;
    
    new bootstrap.Modal(document.getElementById('editFeeModal')).show();
}

// Update fee
async function updateFee() {
    const feeId = document.getElementById('editFeeId').value;
    const totalFee = parseFloat(document.getElementById('editTotalFee').value);
    const paid = parseFloat(document.getElementById('editPaidAmount').value);
    const status = document.getElementById('editFeeStatus').value;
    
    if (!totalFee || totalFee < 0) {
        alert('Please enter a valid total fee amount');
        return;
    }
    
    if (paid < 0 || paid > totalFee) {
        alert('Paid amount must be between 0 and total fee');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/fee/${feeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                totalFee,
                paid
            })
        });
        
        if (response.ok) {
            alert('Fee updated successfully!');
            bootstrap.Modal.getInstance(document.getElementById('editFeeModal')).hide();
            document.getElementById('editFeeForm').reset();
            
            // Refresh data
            await loadDashboardData();
            updateFeesTable();
        } else {
            const errorText = await response.text();
            alert('Error updating fee: ' + errorText);
        }
    } catch (error) {
        console.error('Error updating fee:', error);
        alert('Error updating fee: ' + error.message);
    }
}

// Update pagination info
function updatePaginationInfo() {
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        const startRecord = (currentPage - 1) * studentsPerPage + 1;
        const endRecord = Math.min(currentPage * studentsPerPage, totalStudents);
        paginationInfo.innerHTML = `
            Showing ${startRecord} to ${endRecord} of ${totalStudents} students
        `;
    }
    
    // Update pagination controls
    updatePaginationControls();
}

// Update pagination controls
function updatePaginationControls() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'btn btn-outline-primary btn-sm me-1';
    prevButton.innerHTML = '<i class="bi bi-chevron-left"></i> Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePage(currentPage - 1);
    paginationContainer.appendChild(prevButton);
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `btn btn-sm me-1 ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`;
        pageButton.textContent = i;
        pageButton.onclick = () => changePage(i);
        paginationContainer.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'btn btn-outline-primary btn-sm ms-1';
    nextButton.innerHTML = 'Next <i class="bi bi-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePage(currentPage + 1);
    paginationContainer.appendChild(nextButton);
}

// Change page
async function changePage(page) {
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    await loadStudents(currentPage, getSearchQuery());
    updateStudentsTable();
}

// Get search query
function getSearchQuery() {
    const searchInput = document.getElementById('studentSearch');
    return searchInput ? searchInput.value : '';
}

// Search students
async function searchStudents() {
    const searchQuery = getSearchQuery();
    currentPage = 1;
    await loadStudents(currentPage, searchQuery);
    updateStudentsTable();
}


// Refresh all data
function refreshData() {
    loadDashboardData();
}

// Room Management Functions
function showRoomManagementModal() {
    loadRoomManagement();
    new bootstrap.Modal(document.getElementById('roomManagementModal')).show();
}

async function loadRoomManagement() {
    try {
        const response = await fetch(`${API_BASE}/rooms`);
        const rooms = await response.json();
        
        const tbody = document.getElementById('roomManagementTable');
        tbody.innerHTML = '';
        
        rooms.forEach(room => {
            const row = document.createElement('tr');
            const statusClass = room.status === 'full' ? 'text-danger' : 'text-success';
            const statusText = room.status === 'full' ? 'Full' : 'Available';
            
            row.innerHTML = `
                <td>${room.number}</td>
                <td>Floor ${room.floor}</td>
                <td><span class="badge ${room.sharingType === '2-sharing' ? 'bg-primary' : 'bg-warning'}">${room.sharingType}</span></td>
                <td>${room.occupied}/${room.capacity}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editRoom('${room.number}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRoom('${room.number}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading room management:', error);
        alert('Error loading room management data');
    }
}

function showAddRoomModal() {
    new bootstrap.Modal(document.getElementById('addRoomModal')).show();
}

async function addRoom() {
    const number = document.getElementById('roomNumber').value;
    const floor = parseInt(document.getElementById('roomFloor').value);
    const sharingType = document.getElementById('roomSharingType').value;
    
    // Automatically set capacity based on sharing type
    const capacity = sharingType === '2-sharing' ? 2 : 4;
    
    if (!number || !floor || !sharingType) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number, floor, sharingType, capacity })
        });
        
        if (response.ok) {
            alert('Room added successfully!');
            bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide();
            document.getElementById('addRoomForm').reset();
            loadRoomManagement();
            // Refresh main room view
            await loadDashboardData();
            updateRoomsGrid();
        } else {
            const result = await response.json();
            alert(`Error adding room: ${result.error}`);
        }
    } catch (error) {
        console.error('Error adding room:', error);
        alert('Error adding room');
    }
}

async function editRoom(roomNumber) {
    try {
        // Find the room in the current data
        const room = dashboardData.rooms.find(r => r.number === roomNumber);
        if (!room) {
            alert('Room not found');
            return;
        }
        
        // Populate form fields
        document.getElementById('editRoomNumber').value = roomNumber;
        document.getElementById('editRoomNumberDisplay').value = roomNumber;
        document.getElementById('editRoomFloor').value = room.floor;
        document.getElementById('editRoomSharingType').value = room.sharingType;
        document.getElementById('editRoomStatus').value = room.status || 'available';
        
        new bootstrap.Modal(document.getElementById('editRoomModal')).show();
    } catch (error) {
        console.error('Error loading room for edit:', error);
        alert('Error loading room details');
    }
}

async function updateRoom() {
    const roomNumber = document.getElementById('editRoomNumber').value;
    const floor = parseInt(document.getElementById('editRoomFloor').value);
    const sharingType = document.getElementById('editRoomSharingType').value;
    const status = document.getElementById('editRoomStatus').value;
    
    if (!roomNumber || !floor || !sharingType || !status) {
        alert('Please fill in all fields');
        return;
    }
    
    // Automatically set capacity based on sharing type
    const capacity = sharingType === '2-sharing' ? 2 : 4;
    
    try {
        const response = await fetch(`${API_BASE}/room/${roomNumber}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sharingType, 
                capacity, 
                floor,
                status
            })
        });
        
        if (response.ok) {
            alert('Room updated successfully!');
            bootstrap.Modal.getInstance(document.getElementById('editRoomModal')).hide();
            document.getElementById('editRoomForm').reset();
            
            // Refresh room management and main room view
            loadRoomManagement();
            await loadDashboardData();
            updateRoomsGrid();
        } else {
            const result = await response.json();
            alert(`Error updating room: ${result.error}`);
        }
    } catch (error) {
        console.error('Error updating room:', error);
        alert('Error updating room');
    }
}

async function deleteRoom(roomNumber) {
    if (confirm(`Are you sure you want to delete room ${roomNumber}?`)) {
        try {
            const response = await fetch(`${API_BASE}/room/${roomNumber}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Room deleted successfully!');
                loadRoomManagement();
                // Refresh main room view
                await loadDashboardData();
                updateRoomsGrid();
            } else {
                const result = await response.json();
                alert(`Error deleting room: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('Error deleting room');
        }
    }
}

// Grievance Management Functions
function showAddGrievanceModal() {
    // Populate student options
    const studentSelect = document.getElementById('grievanceStudent');
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    
    dashboardData.students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.email;
        option.textContent = `${student.name} (${student.email})`;
        studentSelect.appendChild(option);
    });
    
    new bootstrap.Modal(document.getElementById('addGrievanceModal')).show();
}

async function addGrievance() {
    const studentEmail = document.getElementById('grievanceStudent').value;
    const type = document.getElementById('grievanceType').value;
    const subject = document.getElementById('grievanceSubject').value;
    const description = document.getElementById('grievanceDescription').value;
    const priority = document.getElementById('grievancePriority').value;
    
    if (!studentEmail || !type || !subject || !description) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Find student name
    const student = dashboardData.students.find(s => s.email === studentEmail);
    const studentName = student ? student.name : 'Unknown Student';
    
    // Generate new grievance ID
    const newId = 'G' + String(dashboardData.grievances.length + 1).padStart(3, '0');
    
    // Add grievance to data
    const newGrievance = {
        id: newId,
        studentName: studentName,
        studentEmail: studentEmail,
        type: type,
        subject: subject,
        description: description,
        status: 'pending',
        priority: priority,
        date: new Date(),
        resolution: ''
    };
    
    dashboardData.grievances.push(newGrievance);
    
    alert('Grievance added successfully!');
    bootstrap.Modal.getInstance(document.getElementById('addGrievanceModal')).hide();
    document.getElementById('addGrievanceForm').reset();
    
    // Refresh grievances display
    updateGrievancesList();
}

function editGrievance(grievanceId) {
    const grievance = dashboardData.grievances.find(g => g.id === grievanceId);
    if (!grievance) {
        alert('Grievance not found');
        return;
    }
    
    // Populate form fields
    document.getElementById('editGrievanceId').value = grievanceId;
    document.getElementById('editGrievanceStudent').value = grievance.studentName;
    document.getElementById('editGrievanceSubject').value = grievance.subject;
    document.getElementById('editGrievanceDescription').value = grievance.description;
    document.getElementById('editGrievanceStatus').value = grievance.status;
    document.getElementById('editGrievanceResolution').value = grievance.resolution || '';
    
    new bootstrap.Modal(document.getElementById('editGrievanceModal')).show();
}

async function updateGrievance() {
    const grievanceId = document.getElementById('editGrievanceId').value;
    const status = document.getElementById('editGrievanceStatus').value;
    const resolution = document.getElementById('editGrievanceResolution').value;
    
    const grievance = dashboardData.grievances.find(g => g.id === grievanceId);
    if (!grievance) {
        alert('Grievance not found');
        return;
    }
    
    // Update grievance
    grievance.status = status;
    grievance.resolution = resolution;
    
    alert('Grievance status updated successfully!');
    bootstrap.Modal.getInstance(document.getElementById('editGrievanceModal')).hide();
    document.getElementById('editGrievanceForm').reset();
    
    // Refresh grievances display
    updateGrievancesList();
}

function viewGrievance(grievanceId) {
    const grievance = dashboardData.grievances.find(g => g.id === grievanceId);
    if (!grievance) {
        alert('Grievance not found');
        return;
    }
    
    const statusClass = {
        'pending': 'warning',
        'in_progress': 'info',
        'resolved': 'success',
        'closed': 'secondary'
    }[grievance.status] || 'warning';
    
    const priorityClass = {
        'low': 'success',
        'medium': 'warning',
        'high': 'danger',
        'urgent': 'danger'
    }[grievance.priority] || 'warning';
    
    const modalContent = `
        <div class="modal fade" id="viewGrievanceModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Grievance Details - ${grievance.id}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong>Student:</strong> ${grievance.studentName}
                            </div>
                            <div class="col-md-6">
                                <strong>Email:</strong> ${grievance.studentEmail}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong>Type:</strong> <span class="badge bg-secondary">${grievance.type.replace('_', ' ')}</span>
                            </div>
                            <div class="col-md-6">
                                <strong>Priority:</strong> <span class="badge bg-${priorityClass}">${grievance.priority}</span>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong>Status:</strong> <span class="badge bg-${statusClass}">${grievance.status.replace('_', ' ')}</span>
                            </div>
                            <div class="col-md-6">
                                <strong>Date:</strong> ${grievance.date.toLocaleDateString()}
                            </div>
                        </div>
                        <div class="mb-3">
                            <strong>Subject:</strong>
                            <p class="mt-1">${grievance.subject}</p>
                        </div>
                        <div class="mb-3">
                            <strong>Description:</strong>
                            <p class="mt-1">${grievance.description}</p>
                        </div>
                        ${grievance.resolution ? `
                            <div class="mb-3">
                                <strong>Resolution:</strong>
                                <p class="mt-1">${grievance.resolution}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="editGrievance('${grievanceId}')">Edit Status</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('viewGrievanceModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Show modal
    new bootstrap.Modal(document.getElementById('viewGrievanceModal')).show();
}

function refreshGrievances() {
    loadGrievances();
    updateGrievancesList();
}

// Visitor Management Functions
async function loadVisitors() {
    try {
        // For now, use mock data - in a real app, this would fetch from API
        dashboardData.visitors = [
            {
                id: 'V001',
                visitorName: 'Rajesh Kumar',
                visitorPhone: '9876543210',
                idType: 'aadhar',
                idNumber: '1234-5678-9012',
                studentName: 'John Doe',
                studentEmail: 'john@example.com',
                purpose: 'family_visit',
                details: 'Visiting son for weekend',
                duration: 4,
                status: 'inside',
                entryTime: new Date('2024-01-15T10:30:00'),
                exitTime: null,
                notes: 'Approved by warden'
            },
            {
                id: 'V002',
                visitorName: 'Priya Sharma',
                visitorPhone: '8765432109',
                idType: 'driving_license',
                idNumber: 'DL123456789',
                studentName: 'Jane Smith',
                studentEmail: 'jane@example.com',
                purpose: 'friend_visit',
                details: 'College friend visiting',
                duration: 2,
                status: 'left',
                entryTime: new Date('2024-01-15T14:00:00'),
                exitTime: new Date('2024-01-15T16:00:00'),
                notes: 'Visit completed successfully'
            },
            {
                id: 'V003',
                visitorName: 'Amit Singh',
                visitorPhone: '7654321098',
                idType: 'passport',
                idNumber: 'P1234567',
                studentName: 'Mike Johnson',
                studentEmail: 'mike@example.com',
                purpose: 'official',
                details: 'Official meeting with student',
                duration: 1,
                status: 'pending',
                entryTime: new Date('2024-01-15T09:00:00'),
                exitTime: null,
                notes: 'Awaiting approval'
            }
        ];
    } catch (error) {
        console.error('Error loading visitors:', error);
        dashboardData.visitors = [];
    }
}

function updateVisitorsList() {
    updateVisitorsStats();
    updateVisitorsTable();
}

function updateVisitorsStats() {
    const total = dashboardData.visitors.length;
    const current = dashboardData.visitors.filter(v => v.status === 'inside').length;
    const today = dashboardData.visitors.filter(v => {
        const today = new Date();
        const visitDate = new Date(v.entryTime);
        return visitDate.toDateString() === today.toDateString();
    }).length;
    const pending = dashboardData.visitors.filter(v => v.status === 'pending').length;
    
    document.getElementById('totalVisitors').textContent = total;
    document.getElementById('currentVisitors').textContent = current;
    document.getElementById('todayVisitors').textContent = today;
    document.getElementById('pendingVisitors').textContent = pending;
}

function updateVisitorsTable() {
    const tbody = document.getElementById('visitorsTable');
    tbody.innerHTML = '';
    
    if (dashboardData.visitors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No visitors found</td></tr>';
        return;
    }
    
    dashboardData.visitors.forEach(visitor => {
        const row = document.createElement('tr');
        const statusClass = {
            'pending': 'bg-warning',
            'approved': 'bg-info',
            'inside': 'bg-success',
            'left': 'bg-secondary',
            'rejected': 'bg-danger'
        }[visitor.status] || 'bg-warning';
        
        const entryTime = visitor.entryTime ? visitor.entryTime.toLocaleString() : 'N/A';
        const exitTime = visitor.exitTime ? visitor.exitTime.toLocaleString() : 'N/A';
        
        row.innerHTML = `
            <td><span class="badge bg-primary">${visitor.id}</span></td>
            <td>${visitor.visitorName}</td>
            <td>${visitor.studentName}</td>
            <td><span class="badge bg-secondary">${visitor.purpose.replace('_', ' ')}</span></td>
            <td>${entryTime}</td>
            <td>${exitTime}</td>
            <td><span class="badge ${statusClass}">${visitor.status.replace('_', ' ')}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editVisitor('${visitor.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-info me-1" onclick="viewVisitor('${visitor.id}')">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteVisitor('${visitor.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function showAddVisitorModal() {
    // Populate student options
    const studentSelect = document.getElementById('visitorStudent');
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    
    dashboardData.students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.email;
        option.textContent = `${student.name} (${student.email})`;
        studentSelect.appendChild(option);
    });
    
    new bootstrap.Modal(document.getElementById('addVisitorModal')).show();
}

async function addVisitor() {
    const visitorName = document.getElementById('visitorName').value;
    const visitorPhone = document.getElementById('visitorPhone').value;
    const idType = document.getElementById('visitorIdType').value;
    const idNumber = document.getElementById('visitorIdNumber').value;
    const studentEmail = document.getElementById('visitorStudent').value;
    const purpose = document.getElementById('visitorPurpose').value;
    const details = document.getElementById('visitorDetails').value;
    const duration = parseInt(document.getElementById('visitorDuration').value);
    
    if (!visitorName || !visitorPhone || !idType || !idNumber || !studentEmail || !purpose) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Find student name
    const student = dashboardData.students.find(s => s.email === studentEmail);
    const studentName = student ? student.name : 'Unknown Student';
    
    // Generate new visitor ID
    const newId = 'V' + String(dashboardData.visitors.length + 1).padStart(3, '0');
    
    // Add visitor to data
    const newVisitor = {
        id: newId,
        visitorName: visitorName,
        visitorPhone: visitorPhone,
        idType: idType,
        idNumber: idNumber,
        studentName: studentName,
        studentEmail: studentEmail,
        purpose: purpose,
        details: details,
        duration: duration,
        status: 'pending',
        entryTime: new Date(),
        exitTime: null,
        notes: ''
    };
    
    dashboardData.visitors.push(newVisitor);
    
    alert('Visitor added successfully!');
    bootstrap.Modal.getInstance(document.getElementById('addVisitorModal')).hide();
    document.getElementById('addVisitorForm').reset();
    
    // Refresh visitors display
    updateVisitorsList();
}

function editVisitor(visitorId) {
    const visitor = dashboardData.visitors.find(v => v.id === visitorId);
    if (!visitor) {
        alert('Visitor not found');
        return;
    }
    
    // Populate form fields
    document.getElementById('editVisitorId').value = visitorId;
    document.getElementById('editVisitorName').value = visitor.visitorName;
    document.getElementById('editVisitorStudent').value = visitor.studentName;
    document.getElementById('editVisitorPurpose').value = visitor.purpose.replace('_', ' ');
    document.getElementById('editVisitorEntryTime').value = visitor.entryTime ? visitor.entryTime.toLocaleString() : 'N/A';
    document.getElementById('editVisitorStatus').value = visitor.status;
    document.getElementById('editVisitorExitTime').value = visitor.exitTime ? visitor.exitTime.toISOString().slice(0, 16) : '';
    document.getElementById('editVisitorNotes').value = visitor.notes || '';
    
    new bootstrap.Modal(document.getElementById('editVisitorModal')).show();
}

async function updateVisitor() {
    const visitorId = document.getElementById('editVisitorId').value;
    const status = document.getElementById('editVisitorStatus').value;
    const exitTime = document.getElementById('editVisitorExitTime').value;
    const notes = document.getElementById('editVisitorNotes').value;
    
    const visitor = dashboardData.visitors.find(v => v.id === visitorId);
    if (!visitor) {
        alert('Visitor not found');
        return;
    }
    
    // Update visitor
    visitor.status = status;
    visitor.notes = notes;
    
    if (exitTime) {
        visitor.exitTime = new Date(exitTime);
    }
    
    alert('Visitor status updated successfully!');
    bootstrap.Modal.getInstance(document.getElementById('editVisitorModal')).hide();
    document.getElementById('editVisitorForm').reset();
    
    // Refresh visitors display
    updateVisitorsList();
}

function viewVisitor(visitorId) {
    const visitor = dashboardData.visitors.find(v => v.id === visitorId);
    if (!visitor) {
        alert('Visitor not found');
        return;
    }
    
    const statusClass = {
        'pending': 'warning',
        'approved': 'info',
        'inside': 'success',
        'left': 'secondary',
        'rejected': 'danger'
    }[visitor.status] || 'warning';
    
    // Populate view modal
    document.getElementById('viewVisitorId').textContent = visitor.id;
    document.getElementById('viewVisitorStatus').innerHTML = `<span class="badge bg-${statusClass}">${visitor.status.replace('_', ' ')}</span>`;
    document.getElementById('viewVisitorName').textContent = visitor.visitorName;
    document.getElementById('viewVisitorPhone').textContent = visitor.visitorPhone;
    document.getElementById('viewVisitorIdType').textContent = visitor.idType.replace('_', ' ');
    document.getElementById('viewVisitorIdNumber').textContent = visitor.idNumber;
    document.getElementById('viewVisitorStudent').textContent = visitor.studentName;
    document.getElementById('viewVisitorPurpose').textContent = visitor.purpose.replace('_', ' ');
    document.getElementById('viewVisitorEntryTime').textContent = visitor.entryTime ? visitor.entryTime.toLocaleString() : 'N/A';
    document.getElementById('viewVisitorExitTime').textContent = visitor.exitTime ? visitor.exitTime.toLocaleString() : 'N/A';
    document.getElementById('viewVisitorDetails').textContent = visitor.details || 'No additional details';
    document.getElementById('viewVisitorNotes').textContent = visitor.notes || 'No notes';
    
    // Store visitor ID for edit function
    document.getElementById('viewVisitorId').setAttribute('data-visitor-id', visitorId);
    
    new bootstrap.Modal(document.getElementById('viewVisitorModal')).show();
}

function editVisitorFromView() {
    const visitorId = document.getElementById('viewVisitorId').getAttribute('data-visitor-id');
    bootstrap.Modal.getInstance(document.getElementById('viewVisitorModal')).hide();
    editVisitor(visitorId);
}

async function deleteVisitor(visitorId) {
    if (confirm('Are you sure you want to delete this visitor record?')) {
        const visitorIndex = dashboardData.visitors.findIndex(v => v.id === visitorId);
        if (visitorIndex !== -1) {
            dashboardData.visitors.splice(visitorIndex, 1);
            alert('Visitor record deleted successfully!');
            updateVisitorsList();
        } else {
            alert('Visitor not found');
        }
    }
}

function searchVisitors() {
    const searchQuery = document.getElementById('visitorSearch').value.toLowerCase();
    const filteredVisitors = dashboardData.visitors.filter(visitor => 
        visitor.visitorName.toLowerCase().includes(searchQuery) ||
        visitor.studentName.toLowerCase().includes(searchQuery) ||
        visitor.purpose.toLowerCase().includes(searchQuery) ||
        visitor.details.toLowerCase().includes(searchQuery)
    );
    
    // Temporarily replace visitors data for display
    const originalVisitors = [...dashboardData.visitors];
    dashboardData.visitors = filteredVisitors;
    updateVisitorsTable();
    dashboardData.visitors = originalVisitors;
}

function filterVisitors() {
    const statusFilter = document.getElementById('visitorStatusFilter').value;
    const dateFilter = document.getElementById('visitorDateFilter').value;
    
    let filteredVisitors = [...dashboardData.visitors];
    
    // Filter by status
    if (statusFilter) {
        filteredVisitors = filteredVisitors.filter(v => v.status === statusFilter);
    }
    
    // Filter by date
    if (dateFilter) {
        const now = new Date();
        filteredVisitors = filteredVisitors.filter(v => {
            const visitDate = new Date(v.entryTime);
            switch (dateFilter) {
                case 'today':
                    return visitDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return visitDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return visitDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    // Temporarily replace visitors data for display
    const originalVisitors = [...dashboardData.visitors];
    dashboardData.visitors = filteredVisitors;
    updateVisitorsTable();
    dashboardData.visitors = originalVisitors;
}

function refreshVisitors() {
    loadVisitors();
    updateVisitorsList();
}

// Logout
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Initialize forms when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupForgotPasswordForm();
    setupUpdateProfileForm();
    // Grievance form removed; complaints form is set up when showing complaints
});

// Global AI states
let activeBillingSummaryStudentId = null;
let staffChatHistory = [];

async function generateStudentAISummary() {
    let studentId = currentUser.usn || currentUser.id || '';
    if (!studentId && currentUser.email) {
        const student = dashboardData.students.find(s => s.email === currentUser.email);
        if (student) studentId = student.usn || student.id;
    }
    if (!studentId) {
        alert("Could not determine your USN. Please relogin.");
        return;
    }
    generateAISummary(studentId);
}

async function generateAISummary(studentId) {
    activeBillingSummaryStudentId = studentId;
    
    // Show Modal
    const modalEl = document.getElementById('aiBillingSummaryModal');
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl);
    }
    modalInstance.show();
    
    const loading = document.getElementById('aiSummaryLoading');
    const content = document.getElementById('aiSummaryContent');
    const summaryText = document.getElementById('aiSummaryText');
    
    loading.classList.remove('d-none');
    content.classList.add('d-none');
    
    try {
        const res = await fetch(`${API_BASE}/ai/billing-summary/${encodeURIComponent(studentId)}`);
        if (!res.ok) throw new Error(`Server error: status ${res.status}`);
        
        const data = await res.json();
        
        loading.classList.add('d-none');
        content.classList.remove('d-none');
        
        // Find student in dashboardData to display registry details or use fallback from db response
        const student = dashboardData.students.find(s => (s.usn || s.id || '').toUpperCase() === studentId.toUpperCase()) || {};
        
        document.getElementById('aiSumStudentName').textContent = student.name || 'N/A';
        document.getElementById('aiSumStudentUSN').textContent = studentId;
        document.getElementById('aiSumStudentRoom').textContent = student.roomNumber || 'Not Assigned';
        
        const statusBadge = document.getElementById('aiSumStudentStatus');
        statusBadge.textContent = student.feesStatus || 'Pending';
        if (student.feesStatus === 'Paid') {
            statusBadge.className = 'badge bg-success';
        } else {
            statusBadge.className = 'badge bg-warning text-dark';
        }
        
        // Render AI summary
        if (data.data) {
            const bill = data.data;
            const totalFee = (bill.amountPaid || 0) + (bill.amountDue || 0);
            const paidPercent = totalFee > 0 ? Math.round((bill.amountPaid / totalFee) * 100) : 0;
            
            summaryText.innerHTML = `
                <div class="row mb-3 align-items-center">
                    <div class="col-md-6 mb-2 mb-md-0">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-muted small fw-semibold">Payment Progress</span>
                            <span class="fw-bold small text-primary">${paidPercent}% Paid</span>
                        </div>
                        <div class="progress" style="height: 10px; border-radius: 5px;">
                            <div class="progress-bar" role="progressbar" style="width: ${paidPercent}%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);" aria-valuenow="${paidPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                    <div class="col-md-6 text-md-end">
                        <div class="d-inline-block p-2 rounded bg-light border" style="font-size: 0.85rem; border-radius: 8px !important;">
                            <div><strong>Paid:</strong> <span class="text-success fw-bold">INR ${bill.amountPaid?.toLocaleString() || 0}</span></div>
                            <div><strong>Due:</strong> <span class="text-danger fw-bold">INR ${bill.amountDue?.toLocaleString() || 0}</span></div>
                        </div>
                    </div>
                </div>
                
                <div class="mb-3 border-bottom pb-2">
                    <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;"><i class="bi bi-wallet2 me-1 text-primary"></i> Fee Breakdown & Coverage</h6>
                    <p class="text-secondary small mb-0">${bill.paymentDetails || 'No additional payment details available.'}</p>
                </div>
                
                <div class="mb-3 border-bottom pb-2">
                    <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;"><i class="bi bi-calendar-check me-1 text-info"></i> Residence & Attendance Analysis</h6>
                    <p class="text-secondary small mb-0">${bill.attendanceSummary || 'No attendance records available.'}</p>
                </div>
                
                <div class="p-3 bg-light border-start border-primary border-3 rounded shadow-sm" style="border-radius: 0 12px 12px 0 !important;">
                    <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;"><i class="bi bi-lightbulb me-1 text-warning"></i> AI Action Recommendation</h6>
                    <p class="text-dark small mb-0 fw-semibold">${bill.recommendation || 'Please check dues with the administration.'}</p>
                </div>
            `;
        } else {
            summaryText.innerHTML = formatMarkdown(data.text || JSON.stringify(data));
        }
    } catch (error) {
        console.error('Failed to load AI billing summary:', error);
        loading.classList.add('d-none');
        content.classList.remove('d-none');
        
        document.getElementById('aiSumStudentName').textContent = 'Error';
        document.getElementById('aiSumStudentUSN').textContent = studentId;
        document.getElementById('aiSumStudentRoom').textContent = '-';
        document.getElementById('aiSumStudentStatus').textContent = 'Error';
        
        summaryText.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle-fill"></i> Failed to generate AI Summary. Please ensure your Groq API key is valid and connected.</span>`;
    }
}

function regenerateBillingSummary() {
    if (activeBillingSummaryStudentId) {
        generateAISummary(activeBillingSummaryStudentId);
    }
}

// Staff Assistant Chat Handlers
function sendStaffQuery(query) {
    const input = document.getElementById('staffChatInput');
    if (input) {
        input.value = query;
        const form = document.getElementById('staffChatForm');
        if (form) {
            // Programmatically submit the form
            handleStaffChatSubmit();
        }
    }
}

async function handleStaffChatSubmit(event) {
    if (event) event.preventDefault();
    
    const input = document.getElementById('staffChatInput');
    const sendBtn = document.getElementById('staffChatSendBtn');
    const chatOutput = document.getElementById('staffChatOutput');
    
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;
    
    input.value = '';
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    
    // Append user message
    appendStaffMessage(query, 'user');
    scrollToStaffBottom();
    
    // Show typing indicator
    showStaffTyping();
    scrollToStaffBottom();
    
    try {
        const res = await fetch(`${API_BASE}/ai/staff-assistant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: query,
                history: staffChatHistory
            })
        });
        
        removeStaffTyping();
        
        if (res.ok) {
            const data = await res.json();
            appendStaffMessage(data.text, 'bot');
            
            // Add to history
            staffChatHistory.push({ sender: 'user', text: query });
            staffChatHistory.push({ sender: 'bot', text: data.text });
        } else {
            appendStaffMessage('Error: Failed to fetch response from Staff AI endpoint.', 'bot');
        }
    } catch (error) {
        console.error('Staff AI Error:', error);
        removeStaffTyping();
        appendStaffMessage('Network error: Could not reach backend server.', 'bot');
    }
    
    input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
    scrollToStaffBottom();
}

function appendStaffMessage(text, sender) {
    const chatOutput = document.getElementById('staffChatOutput');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'd-flex mb-3' + (sender === 'user' ? ' justify-content-end' : '');
    
    const bubble = document.createElement('div');
    bubble.className = sender === 'user' ? 'chat-bubble-user shadow-xs' : 'chat-bubble-bot shadow-xs';
    
    // Style bot bubble separately for grounded manual appearance
    if (sender === 'bot') {
        bubble.style.backgroundColor = '#f8fafc';
        bubble.style.border = '1px solid #e2e8f0';
        bubble.style.color = '#1e293b';
        bubble.style.borderRadius = '16px 16px 16px 0';
        bubble.style.padding = '12px 16px';
        bubble.style.maxWidth = '80%';
    } else {
        bubble.style.borderRadius = '16px 16px 0 16px';
        bubble.style.padding = '12px 16px';
        bubble.style.maxWidth = '80%';
    }
    
    bubble.innerHTML = formatMarkdown(text);
    msgDiv.appendChild(bubble);
    chatOutput.appendChild(msgDiv);
}

function showStaffTyping() {
    const chatOutput = document.getElementById('staffChatOutput');
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'd-flex mb-3';
    indicatorDiv.id = 'staff-typing-indicator';
    indicatorDiv.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatOutput.appendChild(indicatorDiv);
}

function removeStaffTyping() {
    const indicator = document.getElementById('staff-typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToStaffBottom() {
    const chatOutput = document.getElementById('staffChatOutput');
    if (chatOutput) {
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }
}

function formatMarkdown(text) {
    if (!text) return '';
    // Escape HTML partially to prevent broken elements but allow formatting
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Table parser
    const tableRegex = /((?:\|[^\n]+\|\r?\n)+)/g;
    escaped = escaped.replace(tableRegex, (match) => {
        const lines = match.trim().split('\n');
        let html = '<div class="table-responsive"><table class="table table-bordered table-striped mt-2 mb-3">';
        
        lines.forEach((line, index) => {
            if (line.includes('---')) return; // skip delimiter row
            
            const cells = line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
            
            if (cells.length > 0) {
                html += '<tr>';
                cells.forEach(cell => {
                    const tag = (index === 0) ? 'th' : 'td';
                    html += `<${tag}>${cell}</${tag}>`;
                });
                html += '</tr>';
            }
        });
        
        html += '</table></div>';
        return html;
    });

    // Headings
    escaped = escaped.replace(/^### (.*?)$/gm, '<h6 class="fw-bold mt-3 mb-2 text-dark">$1</h6>');
    escaped = escaped.replace(/^## (.*?)$/gm, '<h5 class="fw-bold mt-3 mb-2 text-dark">$1</h5>');
    escaped = escaped.replace(/^# (.*?)$/gm, '<h4 class="fw-bold mt-3 mb-2 text-dark">$1</h4>');

    // Bold
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Bullet points
    escaped = escaped.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    escaped = escaped.replace(/^- (.*?)$/gm, '<li>$1</li>');
    
    // Wrap list items in ul
    escaped = escaped.replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');

    // Newlines to br
    return escaped.replace(/\n/g, '<br>');
}

// AI Notice Board Polisher
async function polishNoticeDraft() {
    const titleInput = document.getElementById('noticeTitle');
    const contentInput = document.getElementById('noticeContent');
    const loader = document.getElementById('polishNoticeLoader');
    const btnGroup = document.getElementById('polishNoticeBtnGroup');

    if (!titleInput || !contentInput) return;

    const title = titleInput.value.trim();
    const body = contentInput.value.trim();

    if (!title || !body) {
        alert('Please fill in both the title and content first to let the AI polish it.');
        return;
    }

    if (loader) loader.style.display = 'block';
    if (btnGroup) btnGroup.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/ai/polish-notice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, body })
        });
        if (!res.ok) throw new Error('Failed to polish notice');
        const data = await res.json();
        if (data.title) titleInput.value = data.title;
        if (data.body) contentInput.value = data.body;
    } catch (err) {
        console.error('Error polishing notice:', err);
        alert('Failed to polish notice. Please try again.');
    } finally {
        if (loader) loader.style.display = 'none';
        if (btnGroup) btnGroup.style.display = 'block';
    }
}

// Attendance Anomaly Alerts Scanner
async function loadAttendanceAlerts() {
    const alertsContainer = document.getElementById('aiAlertsContainer');
    const alertsSummary = document.getElementById('aiAlertsSummary');
    const alertsGrid = document.getElementById('aiAlertsGrid');
    
    if (!alertsContainer || !alertsGrid) return;
    
    try {
        const res = await fetch(`${API_BASE}/ai/attendance-alerts`);
        if (!res.ok) throw new Error('Failed to fetch attendance alerts');
        const data = await res.json();
        
        if (data.alerts && data.alerts.length > 0) {
            alertsContainer.style.display = 'block';
            if (alertsSummary) alertsSummary.textContent = data.summary || `AI Scanner flagged ${data.alerts.length} student(s) with attendance anomalies.`;
            
            alertsGrid.innerHTML = '';
            data.alerts.forEach(alert => {
                const card = document.createElement('div');
                card.className = 'col-md-4';
                card.innerHTML = `
                    <div class="card shadow-sm border-0 border-start border-danger border-4 h-100 bg-white" style="border-radius: 12px;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="fw-bold text-dark mb-0">${alert.name}</h6>
                                <span class="badge bg-danger text-uppercase" style="font-size: 0.7rem;">Anomaly</span>
                            </div>
                            <div class="mb-2" style="font-size: 0.85rem;">
                                <div><strong>USN:</strong> <span class="badge bg-secondary">${alert.usn}</span></div>
                                <div><strong>Attendance Rate:</strong> <span class="text-danger fw-bold">${alert.rate}%</span></div>
                                ${alert.consecutiveAbsences ? `<div><strong>Consecutive Absences:</strong> <span class="text-danger fw-bold">${alert.consecutiveAbsences} days</span></div>` : ''}
                            </div>
                            <div class="p-2 bg-light rounded" style="font-size: 0.82rem; border-left: 2px solid #dc3545; color: #495057;">
                                <strong>AI Recommendation:</strong> ${alert.recommendation}
                            </div>
                        </div>
                    </div>
                `;
                alertsGrid.appendChild(card);
            });
        } else {
            alertsContainer.style.display = 'none';
        }
    } catch (err) {
        console.warn('Failed to load attendance alerts:', err);
        alertsContainer.style.display = 'none';
    }
}

// Outpass Risk Assessment
async function fetchOutpassRiskScore(outpass) {
    const riskCell = document.getElementById(`risk-${outpass.id}`);
    if (!riskCell) return;
    
    try {
        const res = await fetch(`${API_BASE}/ai/outpass-risk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: outpass.studentId,
                reason: outpass.reason,
                fromDate: outpass.fromDate,
                toDate: outpass.toDate
            })
        });
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        
        let badgeClass = 'bg-secondary';
        let levelText = 'Low Risk';
        if (data.riskLevel === 'high') {
            badgeClass = 'bg-danger';
            levelText = 'Flagged';
        } else if (data.riskLevel === 'medium') {
            badgeClass = 'bg-warning text-dark';
            levelText = 'Review Required';
        } else {
            badgeClass = 'bg-success';
            levelText = 'Low Risk';
        }
        
        riskCell.innerHTML = `<span class="badge ${badgeClass} text-uppercase px-2 py-1" style="font-size:0.75rem; cursor:pointer;" title="${data.justification || 'Analyzed by Warden AI.'}"><i class="bi bi-shield-fill me-1"></i>${levelText}</span>`;
    } catch (err) {
        console.warn('Failed to fetch risk score:', err);
        riskCell.innerHTML = `<span class="badge bg-secondary text-uppercase px-2 py-1" style="font-size:0.75rem;">Analysis Error</span>`;
    }
}

// Monthly Report Generator
async function generateMonthlyAIReport() {
    const modalEl = document.getElementById('aiMonthlyReportModal');
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl);
    }
    modalInstance.show();
    
    const loading = document.getElementById('aiReportLoading');
    const content = document.getElementById('aiReportContent');
    const reportText = document.getElementById('aiReportText');
    
    if (loading) loading.classList.remove('d-none');
    if (content) content.classList.add('d-none');
    
    try {
        const res = await fetch(`${API_BASE}/ai/monthly-report`);
        if (!res.ok) throw new Error('Failed to generate report');
        const data = await res.json();
        
        if (loading) loading.classList.add('d-none');
        if (content) content.classList.remove('d-none');
        
        if (reportText) reportText.innerHTML = formatMarkdown(data.text);
    } catch (err) {
        console.error('Error generating monthly report:', err);
        if (loading) loading.classList.add('d-none');
        if (content) content.classList.remove('d-none');
        if (reportText) reportText.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle-fill"></i> Failed to generate AI Monthly Report. Please check your connection and try again.</span>`;
    }
}

function printAIReport() {
    const reportTextEl = document.getElementById('aiReportText');
    if (!reportTextEl) return;
    const reportContent = reportTextEl.innerHTML;
    const printWindow = window.open('', '_blank', 'height=600,width=800');
    
    printWindow.document.write('<html><head><title>Hostel Monthly AI Executive Report</title>');
    printWindow.document.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">');
    printWindow.document.write('<style>body { padding: 40px; font-family: "Segoe UI", sans-serif; color: #333; } h1, h2, h3, h4 { color: #2c3e50; margin-top: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 15px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } @media print { @page { margin: 2cm; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="container">');
    printWindow.document.write('<div class="text-center mb-4"><img src="https://navkisce.ac.in/wp-content/uploads/2021/06/Logo-Navkis.png" alt="Navkis College Logo" style="max-height: 80px; margin-bottom:15px;" onerror="this.style.display=\\\'none\\\'"><h2>Navkis College of Engineering Hostel</h2><h4>AI Monthly Executive Report</h4></div>');
    printWindow.document.write('<hr>');
    printWindow.document.write(reportContent);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

