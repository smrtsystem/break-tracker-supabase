// ============================================
// SUPABASE CONFIGURATION
// ============================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'

// YOUR SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://bdufvingtwdpzzwllrc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdWZ2dW5ndHdkcHp6d2lpbHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTEyMjQsImV4cCI6MjA5ODc4NzIyNH0.Wr9KqZFk2SD6d2yA89qp-grJX4lNvJQg8estmVrfrdI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// AUTHENTICATION
// ============================================
export async function signUp(email, password, userData) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          role: userData.role || 'employee'
        }
      }
    })
    if (error) throw error
    
    if (data.user) {
      await supabase.from('users').insert([{
        id: data.user.id,
        email: email,
        name: userData.name,
        role: userData.role || 'employee',
        department: userData.department
      }])
    }
    
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ============================================
// EMPLOYEES
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
      position: employeeData.position,
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
      position: employeeData.position
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
// BREAKS
// ============================================
export async function startBreak(employeeId, breakType = 'short') {
  try {
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
// DASHBOARD STATS
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
  return `${mins}m ${secs}s`
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
export async function isAdmin() {
    try {
        const user = await getCurrentUser()
        if (!user) return false
        
        const { data } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        
        return data?.role === 'admin'
    } catch (error) {
        return false
    }
}

export async function getAdminPassword() {
    try {
        const { data } = await supabase
            .from('admin_settings')
            .select('setting_value')
            .eq('setting_key', 'admin_password')
            .single()
        
        return data?.setting_value || '535680'
    } catch (error) {
        return '535680'
    }
}

export async function verifyAdmin(email, password) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('id, role')
            .eq('email', email)
            .eq('role', 'admin')
            .single()
        
        if (!user) return { success: false, error: 'Not an admin account' }
        
        const adminPassword = await getAdminPassword()
        if (password !== adminPassword) {
            return { success: false, error: 'Invalid password' }
        }
        
        return { success: true, userId: user.id }
    } catch (error) {
        return { success: false, error: error.message }
    }
}
