// ============================================
// SUPABASE CONFIGURATION
// ============================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'

const SUPABASE_URL = 'https://bdufvingtwdpzzwllrc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdWZ2dW5ndHdkcHp6d2lpbHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTEyMjQsImV4cCI6MjA5ODc4NzIyNH0.Wr9KqZFk2SD6d2yA89qp-grJX4lNvJQg8estmVrfrdI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// AUTHENTICATION - USING SUPABASE AUTH
// ============================================

// ✅ LOGIN with Supabase Auth
export async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })
        
        if (error) throw error
        
        // Get user profile from users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()
        
        if (userError) throw userError
        
        // Store session in localStorage (for UI state)
        localStorage.setItem('currentUser', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: userData.name,
            role: userData.role,
            department: userData.department,
            employeeType: userData.employeeType
        }))
        
        return { success: true, user: data.user, profile: userData }
        
    } catch (error) {
        console.error('Login error:', error)
        return { success: false, error: error.message }
    }
}

// ✅ SIGN UP (Admin only)
export async function signUp(email, password, userData) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: userData.name,
                    role: userData.role || 'employee'
                }
            }
        })
        
        if (error) throw error
        
        if (data.user) {
            // Insert into users table
            const { error: insertError } = await supabase
                .from('users')
                .insert([{
                    id: data.user.id,
                    email: email,
                    name: userData.name,
                    role: userData.role || 'employee',
                    department: userData.department || 'Engineering',
                    employee_type: userData.employeeType || 'Local'
                }])
            
            if (insertError) throw insertError
        }
        
        return { success: true, user: data.user }
        
    } catch (error) {
        console.error('Signup error:', error)
        return { success: false, error: error.message }
    }
}

// ✅ GET CURRENT USER
export async function getCurrentUser() {
    try {
        // First try to get from localStorage
        const localUser = localStorage.getItem('currentUser')
        if (localUser) {
            return JSON.parse(localUser)
        }
        
        // If not in localStorage, check Supabase session
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null
        
        // Get profile
        const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
        
        if (userData) {
            localStorage.setItem('currentUser', JSON.stringify({
                id: user.id,
                email: user.email,
                name: userData.name,
                role: userData.role,
                department: userData.department,
                employeeType: userData.employee_type
            }))
        }
        
        return userData
        
    } catch (error) {
        console.error('Error getting current user:', error)
        return null
    }
}

// ✅ LOGOUT
export async function signOut() {
    try {
        await supabase.auth.signOut()
        localStorage.removeItem('currentUser')
        localStorage.removeItem('adminSession')
        window.location.href = 'login.html'
    } catch (error) {
        console.error('Logout error:', error)
    }
}

// ✅ CHECK IF USER IS ADMIN
export async function isAdmin() {
    try {
        const user = await getCurrentUser()
        if (!user) return false
        return user.role === 'admin'
    } catch (error) {
        return false
    }
}

// ============================================
// EMPLOYEES - CRUD OPERATIONS
// ============================================

export async function getEmployees() {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name')
    
    if (error) throw error
    return data
}

export async function addEmployee(employeeData) {
    const { data, error } = await supabase
        .from('employees')
        .insert([{
            name: employeeData.name,
            email: employeeData.email,
            department: employeeData.department,
            position: employeeData.position || 'Employee',
            employee_type: employeeData.employeeType || 'Local',
            status: 'active'
        }])
        .select()
    
    if (error) throw error
    return data[0]
}

export async function updateEmployee(id, employeeData) {
    const { data, error } = await supabase
        .from('employees')
        .update({
            name: employeeData.name,
            email: employeeData.email,
            department: employeeData.department,
            position: employeeData.position,
            employee_type: employeeData.employeeType
        })
        .eq('id', id)
        .select()
    
    if (error) throw error
    return data[0]
}

export async function deleteEmployee(id) {
    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
    
    if (error) throw error
    return true
}

// ============================================
// BREAKS - CRUD OPERATIONS
// ============================================

export async function startBreak(employeeId, breakType = 'short') {
    try {
        // Check if employee already has active break
        const { data: existingBreak } = await supabase
            .from('breaks')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('status', 'active')
            .maybeSingle()
        
        if (existingBreak) {
            return { success: false, error: 'Employee already has an active break!' }
        }
        
        const { data, error } = await supabase
            .from('breaks')
            .insert([{
                employee_id: employeeId,
                break_type: breakType,
                status: 'active',
                start_time: new Date().toISOString()
            }])
            .select(`
                *,
                employees:employee_id(name, department)
            `)
        
        if (error) throw error
        
        await supabase
            .from('employees')
            .update({ status: 'on_break' })
            .eq('id', employeeId)
        
        return { success: true, data: data[0] }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

export async function endBreak(breakId, employeeId) {
    try {
        const endTime = new Date().toISOString()
        
        const { data: breakData } = await supabase
            .from('breaks')
            .select('start_time')
            .eq('id', breakId)
            .single()
        
        if (!breakData) {
            return { success: false, error: 'Break not found' }
        }
        
        const startTime = new Date(breakData.start_time)
        const endTimeObj = new Date(endTime)
        const durationSeconds = Math.floor((endTimeObj - startTime) / 1000)
        
        const { data, error } = await supabase
            .from('breaks')
            .update({
                end_time: endTime,
                status: 'completed',
                duration: durationSeconds
            })
            .eq('id', breakId)
            .select(`
                *,
                employees:employee_id(name, department)
            `)
        
        if (error) throw error
        
        await supabase
            .from('employees')
            .update({ status: 'active' })
            .eq('id', employeeId)
        
        return { success: true, data: data[0] }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

export async function getActiveBreaks() {
    const { data, error } = await supabase
        .from('breaks')
        .select(`
            *,
            employees:employee_id(name, department)
        `)
        .eq('status', 'active')
        .order('start_time', { ascending: false })
    
    if (error) throw error
    return data
}

export async function getBreakHistory(employeeId = null) {
    let query = supabase
        .from('breaks')
        .select(`
            *,
            employees:employee_id(name, department)
        `)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(50)
    
    if (employeeId) {
        query = query.eq('employee_id', employeeId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
}

// ============================================
// VACATIONS - CRUD OPERATIONS
// ============================================

export async function getVacations(employeeId = null) {
    let query = supabase
        .from('vacations')
        .select(`
            *,
            employees:employee_id(name, department)
        `)
        .order('created_at', { ascending: false })
    
    if (employeeId) {
        query = query.eq('employee_id', employeeId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
}

export async function addVacation(vacationData) {
    const { data, error } = await supabase
        .from('vacations')
        .insert([{
            employee_id: vacationData.employee_id,
            vacation_type: vacationData.vacationType || 'Local',
            start_date: vacationData.startDate,
            end_date: vacationData.endDate,
            days: vacationData.days,
            adjusted_days: vacationData.adjustedDays || vacationData.days,
            status: vacationData.status || 'pending',
            notes: vacationData.notes || '',
            user_accepted: false
        }])
        .select()
    
    if (error) throw error
    return data[0]
}

export async function updateVacation(id, updateData) {
    const { data, error } = await supabase
        .from('vacations')
        .update(updateData)
        .eq('id', id)
        .select()
    
    if (error) throw error
    return data[0]
}

export async function deleteVacation(id) {
    const { error } = await supabase
        .from('vacations')
        .delete()
        .eq('id', id)
    
    if (error) throw error
    return true
}

// ============================================
// CHECKINS - CRUD OPERATIONS
// ============================================

export async function getCheckins(employeeId = null) {
    let query = supabase
        .from('checkins')
        .select(`
            *,
            employees:employee_id(name, department)
        `)
        .order('created_at', { ascending: false })
    
    if (employeeId) {
        query = query.eq('employee_id', employeeId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
}

export async function addCheckin(checkinData) {
    const { data, error } = await supabase
        .from('checkins')
        .insert([{
            employee_id: checkinData.employee_id,
            employee_name: checkinData.employee_name,
            department: checkinData.department,
            checkin_time: checkinData.checkin_time || new Date().toISOString(),
            checkout_time: null,
            status: 'pending',
            approved_by: null
        }])
        .select()
    
    if (error) throw error
    return data[0]
}

export async function updateCheckin(id, updateData) {
    const { data, error } = await supabase
        .from('checkins')
        .update(updateData)
        .eq('id', id)
        .select()
    
    if (error) throw error
    return data[0]
}

export async function deleteCheckin(id) {
    const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('id', id)
    
    if (error) throw error
    return true
}

// ============================================
// USERS - ADMIN ONLY
// ============================================

export async function getAllUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

export async function createUser(email, password, userData) {
    return await signUp(email, password, userData)
}

export async function updateUser(id, userData) {
    const { data, error } = await supabase
        .from('users')
        .update({
            name: userData.name,
            role: userData.role,
            department: userData.department,
            employee_type: userData.employeeType
        })
        .eq('id', id)
        .select()
    
    if (error) throw error
    return data[0]
}

export async function deleteUser(id) {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
    
    if (error) throw error
    
    // Also delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError) console.error('Error deleting auth user:', authError)
    
    return true
}

// ============================================
// DEPARTMENTS - ADMIN ONLY
// ============================================

export async function getDepartments() {
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')
    
    if (error) throw error
    return data
}

export async function addDepartment(name) {
    const { data, error } = await supabase
        .from('departments')
        .insert([{ name: name }])
        .select()
    
    if (error) throw error
    return data[0]
}

export async function updateDepartment(id, name) {
    const { data, error } = await supabase
        .from('departments')
        .update({ name: name })
        .eq('id', id)
        .select()
    
    if (error) throw error
    return data[0]
}

export async function deleteDepartment(id) {
    const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)
    
    if (error) throw error
    return true
}

// ============================================
// ROLES - ADMIN ONLY
// ============================================

export async function getRoles() {
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')
    
    if (error) throw error
    return data
}

export async function addRole(roleData) {
    const { data, error } = await supabase
        .from('roles')
        .insert([{
            name: roleData.name,
            create_user: roleData.createUser || false,
            delete_user: roleData.deleteUser || false,
            view_all: roleData.viewAll || false,
            manage_settings: roleData.manageSettings || false
        }])
        .select()
    
    if (error) throw error
    return data[0]
}

export async function updateRole(id, roleData) {
    const { data, error } = await supabase
        .from('roles')
        .update({
            name: roleData.name,
            create_user: roleData.createUser || false,
            delete_user: roleData.deleteUser || false,
            view_all: roleData.viewAll || false,
            manage_settings: roleData.manageSettings || false
        })
        .eq('id', id)
        .select()
    
    if (error) throw error
    return data[0]
}

export async function deleteRole(id) {
    const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id)
    
    if (error) throw error
    return true
}

// ============================================
// SETTINGS
// ============================================

export async function getSettings() {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()
    
    if (error) throw error
    return data
}

export async function updateSettings(settingsData) {
    const { data, error } = await supabase
        .from('settings')
        .update({
            local_break_minutes: settingsData.localBreakMinutes || 30,
            expat_break_minutes: settingsData.expatBreakMinutes || 45,
            warning_minutes: settingsData.warningMinutes || 5
        })
        .eq('id', 1)
        .select()
    
    if (error) throw error
    return data[0]
}

// ============================================
// STATS - DASHBOARD
// ============================================

export async function getStats() {
    try {
        const { count: totalEmployees } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
        
        const { count: activeBreaks } = await supabase
            .from('breaks')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
        
        const today = new Date().toISOString().split('T')[0]
        const { count: todayBreaks } = await supabase
            .from('breaks')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today)
        
        return {
            totalEmployees: totalEmployees || 0,
            activeBreaks: activeBreaks || 0,
            todayBreaks: todayBreaks || 0
        }
    } catch (error) {
        console.error('Error getting stats:', error)
        return { totalEmployees: 0, activeBreaks: 0, todayBreaks: 0 }
    }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToBreaks(callback) {
    return supabase
        .channel('breaks-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'breaks'
            },
            (payload) => {
                callback(payload)
            }
        )
        .subscribe()
}

// ============================================
// UTILITY
// ============================================

export function formatDuration(startTime, endTime = null) {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diff = Math.floor((end - start) / 1000)
    const mins = Math.floor(diff / 60)
    const secs = diff % 60
    if (mins === 0) return `${secs}s`
    if (secs === 0) return `${mins}m`
    return `${mins}m ${secs}s`
}
