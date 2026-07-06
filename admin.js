// ============================================
// ADMIN SCRIPT
// ============================================
import { supabase, getCurrentUser, signOut } from './supabase.js'

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    adminName: document.getElementById('adminName'),
    logoutBtn: document.getElementById('logoutBtn'),
    totalUsers: document.getElementById('totalUsers'),
    totalEmployees: document.getElementById('totalEmployees'),
    activeBreaks: document.getElementById('activeBreaks'),
    adminCount: document.getElementById('adminCount'),
    usersList: document.getElementById('usersList'),
    allBreaksList: document.getElementById('allBreaksList'),
    createAdminBtn: document.getElementById('createAdminBtn'),
    resetPasswordBtn: document.getElementById('resetPasswordBtn'),
    refreshDataBtn: document.getElementById('refreshDataBtn'),
    adminModal: document.getElementById('adminModal'),
    adminForm: document.getElementById('adminForm'),
    adminNameInput: document.getElementById('adminNameInput'),
    adminEmailInput: document.getElementById('adminEmailInput'),
    adminPasswordInput: document.getElementById('adminPasswordInput'),
    closeModal: document.querySelector('.close'),
    resetModal: document.getElementById('resetModal'),
    resetForm: document.getElementById('resetForm'),
    resetEmail: document.getElementById('resetEmail'),
    resetPassword: document.getElementById('resetPassword'),
    closeReset: document.querySelector('.close-reset')
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
    
    // Check if user is admin
    const { data: userData } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', user.id)
        .single()
    
    if (userData?.role !== 'admin') {
        alert('Access denied. Admin privileges required.')
        window.location.href = 'index.html'
        return
    }
    
    elements.adminName.textContent = `👋 ${userData.name || 'Admin'}`
    
    await loadAdminStats()
    await loadAllUsers()
    await loadAllBreaks()
    
    setupEventListeners()
}

// ============================================
// LOAD FUNCTIONS
// ============================================
async function loadAdminStats() {
    try {
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
        
        const { count: totalEmployees } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
        
        const { count: activeBreaks } = await supabase
            .from('breaks')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
        
        const { count: adminCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'admin')
        
        elements.totalUsers.textContent = totalUsers || 0
        elements.totalEmployees.textContent = totalEmployees || 0
        elements.activeBreaks.textContent = activeBreaks || 0
        elements.adminCount.textContent = adminCount || 0
        
    } catch (error) {
        console.error('Error loading admin stats:', error)
    }
}

async function loadAllUsers() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        
        if (!users || users.length === 0) {
            elements.usersList.innerHTML = `<p class="empty">No users found</p>`
            return
        }
        
        let html = '<table class="history-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Actions</th></tr></thead><tbody>'
        
        users.forEach(user => {
            html += `
                <tr>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email}</td>
                    <td><span class="badge ${user.role === 'admin' ? 'orange' : 'green'}">${user.role || 'employee'}</span></td>
                    <td>${user.department || 'N/A'}</td>
                    <td>
                        ${user.role !== 'admin' ? 
                            `<button class="btn-small btn-edit make-admin" data-id="${user.id}">👑 Make Admin</button>` :
                            `<span class="badge orange">Admin</span>`
                        }
                    </td>
                </tr>
            `
        })
        
        html += '</tbody></table>'
        elements.usersList.innerHTML = html
        
        document.querySelectorAll('.make-admin').forEach(btn => {
            btn.addEventListener('click', () => makeAdmin(btn.dataset.id))
        })
        
    } catch (error) {
        console.error('Error loading users:', error)
        elements.usersList.innerHTML = `<p class="error">Error loading users</p>`
    }
}

async function loadAllBreaks() {
    try {
        const { data: breaks, error } = await supabase
            .from('breaks')
            .select(`
                *,
                employees:employee_id (
                    id,
                    name,
                    department
                )
            `)
            .order('start_time', { ascending: false })
            .limit(50)
        
        if (error) throw error
        
        if (!breaks || breaks.length === 0) {
            elements.allBreaksList.innerHTML = `<p class="empty">No breaks found</p>`
            return
        }
        
        let html = '<table class="history-table"><thead><tr><th>Employee</th><th>Break Type</th><th>Start</th><th>Duration</th><th>Status</th></tr></thead><tbody>'
        
        breaks.forEach(b => {
            const duration = b.duration ? `${Math.floor(b.duration/60)}m ${b.duration%60}s` : 'In progress'
            const statusColor = b.status === 'active' ? 'orange' : 'green'
            html += `
                <tr>
                    <td>${b.employees?.name || 'Unknown'}</td>
                    <td>${b.break_type || 'short'}</td>
                    <td>${new Date(b.start_time).toLocaleString()}</td>
                    <td>${duration}</td>
                    <td><span class="badge ${statusColor}">${b.status}</span></td>
                </tr>
            `
        })
        
        html += '</tbody></table>'
        elements.allBreaksList.innerHTML = html
        
    } catch (error) {
        console.error('Error loading breaks:', error)
        elements.allBreaksList.innerHTML = `<p class="error">Error loading breaks</p>`
    }
}

// ============================================
// ADMIN ACTIONS
// ============================================
async function makeAdmin(userId) {
    if (!confirm('Make this user an admin?')) return
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', userId)
        
        if (error) throw error
        
        alert('✅ User is now an admin!')
        await loadAllUsers()
        await loadAdminStats()
        
    } catch (error) {
        alert('Error: ' + error.message)
    }
}

async function createAdmin(email, password, name) {
    try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    role: 'admin'
                }
            }
        })
        
        if (authError) throw authError
        
        // Create user profile
        if (authData.user) {
            await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    email: email,
                    name: name,
                    role: 'admin'
                }])
        }
        
        alert('✅ Admin created successfully!')
        await loadAllUsers()
        await loadAdminStats()
        
    } catch (error) {
        alert('Error creating admin: ' + error.message)
    }
}

async function resetAdminPassword(email, newPassword) {
    try {
        // Update password in settings
        const { error } = await supabase
            .from('admin_settings')
            .update({ setting_value: newPassword })
            .eq('setting_key', 'admin_password')
        
        if (error) throw error
        
        alert('✅ Admin password reset to: ' + newPassword)
        
    } catch (error) {
        alert('Error resetting password: ' + error.message)
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    elements.logoutBtn.addEventListener('click', signOut)
    
    elements.createAdminBtn.addEventListener('click', () => {
        elements.adminModal.style.display = 'block'
    })
    
    elements.closeModal.addEventListener('click', () => {
        elements.adminModal.style.display = 'none'
    })
    
    elements.adminForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const name = elements.adminNameInput.value
        const email = elements.adminEmailInput.value
        const password = elements.adminPasswordInput.value || '535680'
        await createAdmin(email, password, name)
        elements.adminModal.style.display = 'none'
        elements.adminForm.reset()
    })
    
    elements.resetPasswordBtn.addEventListener('click', () => {
        elements.resetModal.style.display = 'block'
    })
    
    elements.closeReset.addEventListener('click', () => {
        elements.resetModal.style.display = 'none'
    })
    
    elements.resetForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = elements.resetEmail.value
        const password = elements.resetPassword.value || '535680'
        await resetAdminPassword(email, password)
        elements.resetModal.style.display = 'none'
        elements.resetForm.reset()
    })
    
    elements.refreshDataBtn.addEventListener('click', async () => {
        await loadAdminStats()
        await loadAllUsers()
        await loadAllBreaks()
        alert('✅ Data refreshed!')
    })
    
    window.addEventListener('click', (e) => {
        if (e.target === elements.adminModal) {
            elements.adminModal.style.display = 'none'
        }
        if (e.target === elements.resetModal) {
            elements.resetModal.style.display = 'none'
        }
    })
}

// ============================================
// START APP
// ============================================
document.addEventListener('DOMContentLoaded', init)
