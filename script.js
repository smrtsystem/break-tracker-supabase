// ============================================
// IMPORTS - FIXED PATH (no src/)
// ============================================
import { 
    supabase,
    getCurrentUser, 
    signOut,
    getEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    startBreak,
    endBreak,
    getActiveBreaks,
    getBreakHistory,
    getStats,
    subscribeToBreaks,
    formatDuration
} from './supabase.js'  // ← ✅ FIXED: removed 'src/'

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    userDisplay: document.getElementById('userDisplay'),
    logoutBtn: document.getElementById('logoutBtn'),
    totalEmployees: document.getElementById('totalEmployees'),
    activeBreaks: document.getElementById('activeBreaks'),
    todayBreaks: document.getElementById('todayBreaks'),
    activeBreaksList: document.getElementById('activeBreaksList'),
    employeesList: document.getElementById('employeesList'),
    breakHistory: document.getElementById('breakHistory'),
    searchInput: document.getElementById('searchInput'),
    addEmployeeBtn: document.getElementById('addEmployeeBtn'),
    employeeModal: document.getElementById('employeeModal'),
    employeeForm: document.getElementById('employeeForm'),
    modalTitle: document.getElementById('modalTitle'),
    editId: document.getElementById('editId'),
    empName: document.getElementById('empName'),
    empEmail: document.getElementById('empEmail'),
    empDepartment: document.getElementById('empDepartment'),
    empPosition: document.getElementById('empPosition'),
    closeModal: document.querySelector('.close')
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    const user = await getCurrentUser()
    if (!user) {
        window.location.href = 'login.html'
        return
    }
    
    const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single()
    
    elements.userDisplay.textContent = `👋 ${profile?.name || user.email}`
    
    await loadEmployees()
    await loadActiveBreaks()
    await loadBreakHistory()
    await updateStats()
    
    subscribeToBreaks((payload) => {
        console.log('Break update:', payload)
        loadActiveBreaks()
        updateStats()
    })
    
    setupEventListeners()
}

// ============================================
// LOAD FUNCTIONS
// ============================================
async function loadEmployees() {
    try {
        const employees = await getEmployees()
        const searchTerm = elements.searchInput.value.toLowerCase()
        
        const filtered = employees.filter(emp => 
            emp.name.toLowerCase().includes(searchTerm) ||
            emp.department.toLowerCase().includes(searchTerm)
        )
        
        if (filtered.length === 0) {
            elements.employeesList.innerHTML = `<p class="empty">No employees found</p>`
            return
        }
        
        let html = '<div class="employee-grid">'
        filtered.forEach(emp => {
            const statusColor = emp.status === 'on_break' ? 'orange' : 'green'
            html += `
                <div class="employee-card">
                    <div class="employee-header">
                        <div>
                            <h3>${emp.name}</h3>
                            <span class="badge" style="background:${statusColor}">${emp.status || 'active'}</span>
                        </div>
                        <div class="employee-actions">
                            <button class="btn-small btn-edit" data-id="${emp.id}">✏️</button>
                            <button class="btn-small btn-delete" data-id="${emp.id}">🗑️</button>
                        </div>
                    </div>
                    <p class="employee-detail">📧 ${emp.email}</p>
                    <p class="employee-detail">🏢 ${emp.department}</p>
                    <p class="employee-detail">💼 ${emp.position || 'No position'}</p>
                    ${emp.status !== 'on_break' ? 
                        `<button class="btn-break" data-id="${emp.id}">☕ Start Break</button>` :
                        `<button class="btn-break disabled" disabled>⏳ On Break</button>`
                    }
                </div>
            `
        })
        html += '</div>'
        elements.employeesList.innerHTML = html
        
        document.querySelectorAll('.btn-break:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => handleStartBreak(btn.dataset.id))
        })
        
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id))
        })
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteEmployee(btn.dataset.id))
        })
        
    } catch (error) {
        console.error('Error loading employees:', error)
        elements.employeesList.innerHTML = `<p class="error">Error loading employees</p>`
    }
}

async function loadActiveBreaks() {
    try {
        const breaks = await getActiveBreaks()
        
        if (breaks.length === 0) {
            elements.activeBreaksList.innerHTML = `<p class="empty">✅ No active breaks</p>`
            return
        }
        
        let html = '<div class="break-list">'
        breaks.forEach(b => {
            const duration = formatDuration(b.start_time)
            html += `
                <div class="break-item">
                    <div>
                        <strong>${b.employees.name}</strong>
                        <span class="badge">${b.employees.department}</span>
                    </div>
                    <div>
                        <span>⏱️ ${duration}</span>
                        <button class="btn-end-break" data-id="${b.id}" data-employee="${b.employee_id}">
                            End Break
                        </button>
                    </div>
                </div>
            `
        })
        html += '</div>'
        elements.activeBreaksList.innerHTML = html
        
        document.querySelectorAll('.btn-end-break').forEach(btn => {
            btn.addEventListener('click', () => handleEndBreak(btn.dataset.id, btn.dataset.employee))
        })
        
    } catch (error) {
        console.error('Error loading active breaks:', error)
        elements.activeBreaksList.innerHTML = `<p class="error">Error loading breaks</p>`
    }
}

async function loadBreakHistory() {
    try {
        const history = await getBreakHistory()
        
        if (history.length === 0) {
            elements.breakHistory.innerHTML = `<p class="empty">No break history</p>`
            return
        }
        
        let html = '<table class="history-table"><thead><tr><th>Employee</th><th>Start</th><th>Duration</th><th>Status</th></tr></thead><tbody>'
        history.slice(0, 20).forEach(b => {
            const duration = b.duration ? formatDuration(b.start_time, b.end_time) : 'In progress'
            html += `
                <tr>
                    <td>${b.employees?.name || 'Unknown'}</td>
                    <td>${new Date(b.start_time).toLocaleTimeString()}</td>
                    <td>${duration}</td>
                    <td><span class="badge green">${b.status}</span></td>
                </tr>
            `
        })
        html += '</tbody></table>'
        elements.breakHistory.innerHTML = html
        
    } catch (error) {
        console.error('Error loading break history:', error)
        elements.breakHistory.innerHTML = `<p class="error">Error loading history</p>`
    }
}

async function updateStats() {
    try {
        const stats = await getStats()
        elements.totalEmployees.textContent = stats.totalEmployees
        elements.activeBreaks.textContent = stats.activeBreaks
        elements.todayBreaks.textContent = stats.todayBreaks
    } catch (error) {
        console.error('Error updating stats:', error)
    }
}

// ============================================
// ACTION HANDLERS
// ============================================
async function handleStartBreak(employeeId) {
    const result = await startBreak(employeeId)
    if (result.success) {
        await loadEmployees()
        await loadActiveBreaks()
        await updateStats()
    } else {
        alert(result.error || 'Error starting break')
    }
}

async function handleEndBreak(breakId, employeeId) {
    const result = await endBreak(breakId, employeeId)
    if (result.success) {
        await loadEmployees()
        await loadActiveBreaks()
        await updateStats()
    } else {
        alert(result.error || 'Error ending break')
    }
}

async function handleDeleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return
    
    try {
        await deleteEmployee(id)
        await loadEmployees()
        await updateStats()
    } catch (error) {
        alert('Error deleting employee: ' + error.message)
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function openAddModal() {
    elements.modalTitle.textContent = 'Add Employee'
    elements.editId.value = ''
    elements.employeeForm.reset()
    elements.employeeModal.style.display = 'block'
}

async function openEditModal(id) {
    try {
        const employees = await getEmployees()
        const emp = employees.find(e => e.id === id)
        if (!emp) return
        
        elements.modalTitle.textContent = 'Edit Employee'
        elements.editId.value = id
        elements.empName.value = emp.name
        elements.empEmail.value = emp.email
        elements.empDepartment.value = emp.department
        elements.empPosition.value = emp.position || ''
        elements.employeeModal.style.display = 'block'
    } catch (error) {
        alert('Error loading employee data')
    }
}

async function handleEmployeeSubmit(e) {
    e.preventDefault()
    
    const id = elements.editId.value
    const data = {
        name: elements.empName.value,
        email: elements.empEmail.value,
        department: elements.empDepartment.value,
        position: elements.empPosition.value
    }
    
    try {
        if (id) {
            await updateEmployee(id, data)
        } else {
            await addEmployee(data)
        }
        elements.employeeModal.style.display = 'none'
        await loadEmployees()
        await updateStats()
    } catch (error) {
        alert('Error saving employee: ' + error.message)
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    elements.logoutBtn.addEventListener('click', signOut)
    elements.addEmployeeBtn.addEventListener('click', openAddModal)
    
    elements.closeModal.addEventListener('click', () => {
        elements.employeeModal.style.display = 'none'
    })
    
    window.addEventListener('click', (e) => {
        if (e.target === elements.employeeModal) {
            elements.employeeModal.style.display = 'none'
        }
    })
    
    elements.employeeForm.addEventListener('submit', handleEmployeeSubmit)
    elements.searchInput.addEventListener('input', loadEmployees)
}

// ============================================
// START APP
// ============================================
document.addEventListener('DOMContentLoaded', init)
