import { createClient } from '@supabase/supabase-js'

// Your Supabase credentials
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'

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
    
    // Create user profile
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
export async function startBreak(employeeId) {
  const { data, error } = await supabase
    .from('breaks')
    .insert([{
      employee_id: employeeId,
      status: 'active',
      start_time: new Date().toISOString()
    }])
    .select(`
      *,
      employees:employee_id(name, department)
    `)
  
  if (error) throw error
  
  // Update employee status
  await supabase
    .from('employees')
    .update({ status: 'on_break' })
    .eq('id', employeeId)
  
  return data[0]
}

export async function endBreak(breakId, employeeId) {
  const endTime = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('breaks')
    .update({
      end_time: endTime,
      status: 'completed'
    })
    .eq('id', breakId)
    .select()
  
  if (error) throw error
  
  // Update employee status
  await supabase
    .from('employees')
    .update({ status: 'active' })
    .eq('id', employeeId)
  
  return data[0]
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
    // Total employees
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
    
    // Active breaks
    const { count: activeBreaks } = await supabase
      .from('breaks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
    // Today's breaks
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

export function getBreakType(type) {
  const types = {
    short: '☕ Short',
    lunch: '🍱 Lunch',
    personal: '👤 Personal',
    meeting: '📋 Meeting'
  }
  return types[type] || type
}
