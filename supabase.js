// ============================================
// SUPABASE CONFIGURATION
// ============================================
import { createClient } from '@supabase/supabase-js'

// YOUR SUPABASE CREDENTIALS (from your dashboard)
const SUPABASE_URL = 'https://bdufvingtwdpzzwllrc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdWZ2dW5ndHdkcHp6d2lpbHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTEyMjQsImV4cCI6MjA5ODc4NzIyNH0.Wr9KqZFk2SD6d2yA89qp-grJX4lNvJQg8estmVrfrdI'

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Sign up a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {object} userData - Additional user data (name, role, department)
 * @returns {object} { success: boolean, user: object, error: string }
 */
export async function signUp(email, password, userData) {
  try {
    // Create auth user
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
    
    // Create user profile in users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: data.user.id,
          email: email,
          name: userData.name,
          role: userData.role || 'employee',
          department: userData.department || 'Engineering'
        }])
      
      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Still return success since auth user was created
      }
    }
    
    return { 
      success: true, 
      user: data.user,
      message: 'Account created successfully! Please check your email to confirm.'
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Sign in an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {object} { success: boolean, user: object, error: string }
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    return { 
      success: true, 
      user: data.user 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

/**
 * Get the current logged-in user
 * @returns {object|null} User object or null if not logged in
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get current user's profile from users table
 * @returns {object|null} User profile or null
 */
export async function getUserProfile() {
  try {
    const user = await getCurrentUser()
    if (!user) return null
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

/**
 * Reset password - sends reset email
 * @param {string} email - User's email
 * @returns {object} { success: boolean, error: string }
 */
export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    })
    
    if (error) throw error
    
    return { 
      success: true, 
      message: 'Password reset email sent!' 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Update user's password
 * @param {string} newPassword - New password
 * @returns {object} { success: boolean, error: string }
 */
export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) throw error
    
    return { 
      success: true, 
      message: 'Password updated successfully!' 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

// ============================================
// EMPLOYEE FUNCTIONS
// ============================================

/**
 * Get all employees
 * @param {object} filters - Optional filters (department, status, search)
 * @returns {array} List of employees
 */
export async function getEmployees(filters = {}) {
  try {
    let query = supabase
      .from('employees')
      .select('*')
      .order('name')
    
    // Apply filters
    if (filters.department && filters.department !== 'all') {
      query = query.eq('department', filters.department)
    }
    
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching employees:', error)
    return []
  }
}

/**
 * Get a single employee by ID
 * @param {string} id - Employee ID
 * @returns {object|null} Employee object or null
 */
export async function getEmployeeById(id) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching employee:', error)
    return null
  }
}

/**
 * Add a new employee
 * @param {object} employeeData - Employee data
 * @returns {object} { success: boolean, data: object, error: string }
 */
export async function addEmployee(employeeData) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .insert([{
        name: employeeData.name,
        email: employeeData.email,
        department: employeeData.department,
        position: employeeData.position || '',
        status: 'active',
        phone: employeeData.phone || '',
        hire_date: employeeData.hire_date || new Date().toISOString().split('T')[0]
      }])
      .select()
    
    if (error) throw error
    
    return { 
      success: true, 
      data: data[0] 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Update an existing employee
 * @param {string} id - Employee ID
 * @param {object} employeeData - Updated employee data
 * @returns {object} { success: boolean, data: object, error: string }
 */
export async function updateEmployee(id, employeeData) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update({
        name: employeeData.name,
        email: employeeData.email,
        department: employeeData.department,
        position: employeeData.position || '',
        phone: employeeData.phone || '',
        status: employeeData.status || 'active'
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return { 
      success: true, 
      data: data[0] 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Delete an employee
 * @param {string} id - Employee ID
 * @returns {object} { success: boolean, error: string }
 */
export async function deleteEmployee(id) {
  try {
    // First, check if employee has active breaks
    const { data: activeBreaks } = await supabase
      .from('breaks')
      .select('id')
      .eq('employee_id', id)
      .eq('status', 'active')
    
    if (activeBreaks && activeBreaks.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete employee with active breaks. End breaks first.' 
      }
    }
    
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Get employees by department
 * @param {string} department - Department name
 * @returns {array} List of employees
 */
export async function getEmployeesByDepartment(department) {
  return await getEmployees({ department })
}

// ============================================
// BREAK FUNCTIONS
// ============================================

/**
 * Start a break for an employee
 * @param {string} employeeId - Employee ID
 * @param {string} breakType - Type of break (short, lunch, personal, meeting)
 * @param {string} notes - Optional notes
 * @returns {object} { success: boolean, data: object, error: string }
 */
export async function startBreak(employeeId, breakType = 'short', notes = '') {
  try {
    // Check if employee already has active break
    const { data: existingBreak } = await supabase
      .from('breaks')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .maybeSingle()
    
    if (existingBreak) {
      return { 
        success: false, 
        error: 'Employee already has an active break!' 
      }
    }
    
    // Start new break
    const { data, error } = await supabase
      .from('breaks')
      .insert([{
        employee_id: employeeId,
        break_type: breakType,
        status: 'active',
        start_time: new Date().toISOString(),
        notes: notes
      }])
      .select(`
        *,
        employees:employee_id (
          id,
          name,
          department,
          position
        )
      `)
    
    if (error) throw error
    
    // Update employee status
    await supabase
      .from('employees')
      .update({ status: 'on_break' })
      .eq('id', employeeId)
    
    return { 
      success: true, 
      data: data[0] 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * End an active break
 * @param {string} breakId - Break ID
 * @param {string} employeeId - Employee ID
 * @returns {object} { success: boolean, data: object, error: string }
 */
export async function endBreak(breakId, employeeId) {
  try {
    const endTime = new Date().toISOString()
    
    // Get start time to calculate duration
    const { data: breakData } = await supabase
      .from('breaks')
      .select('start_time')
      .eq('id', breakId)
      .single()
    
    if (!breakData) {
      return { 
        success: false, 
        error: 'Break not found' 
      }
    }
    
    const startTime = new Date(breakData.start_time)
    const endTimeObj = new Date(endTime)
    const durationSeconds = Math.floor((endTimeObj - startTime) / 1000)
    
    // Update break
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
        employees:employee_id (
          id,
          name,
          department
        )
      `)
    
    if (error) throw error
    
    // Update employee status back to active
    await supabase
      .from('employees')
      .update({ status: 'active' })
      .eq('id', employeeId)
    
    return { 
      success: true, 
      data: data[0],
      duration: durationSeconds
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Cancel an active break (without completing it)
 * @param {string} breakId - Break ID
 * @param {string} employeeId - Employee ID
 * @returns {object} { success: boolean, error: string }
 */
export async function cancelBreak(breakId, employeeId) {
  try {
    const { error } = await supabase
      .from('breaks')
      .update({ status: 'cancelled' })
      .eq('id', breakId)
    
    if (error) throw error
    
    // Update employee status
    await supabase
      .from('employees')
      .update({ status: 'active' })
      .eq('id', employeeId)
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Get all active breaks
 * @returns {array} List of active breaks with employee details
 */
export async function getActiveBreaks() {
  try {
    const { data, error } = await supabase
      .from('breaks')
      .select(`
        *,
        employees:employee_id (
          id,
          name,
          department,
          position,
          email
        )
      `)
      .eq('status', 'active')
      .order('start_time', { ascending: false })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching active breaks:', error)
    return []
  }
}

/**
 * Get break history with optional filters
 * @param {string} employeeId - Optional employee ID filter
 * @param {number} days - Number of days to look back (default: 30)
 * @param {number} limit - Max records to return (default: 50)
 * @returns {array} List of breaks
 */
export async function getBreakHistory(employeeId = null, days = 30, limit = 50) {
  try {
    let query = supabase
      .from('breaks')
      .select(`
        *,
        employees:employee_id (
          id,
          name,
          department,
          position
        )
      `)
      .eq('status', 'completed')
      .gte('start_time', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: false })
      .limit(limit)
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching break history:', error)
    return []
  }
}

/**
 * Get breaks for a specific day
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} employeeId - Optional employee ID
 * @returns {array} List of breaks
 */
export async function getBreaksForDay(date, employeeId = null) {
  try {
    let query = supabase
      .from('breaks')
      .select(`
        *,
        employees:employee_id (
          id,
          name,
          department
        )
      `)
      .gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
      .order('start_time', { ascending: true })
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching day breaks:', error)
    return []
  }
}

// ============================================
// DASHBOARD STATS FUNCTIONS
// ============================================

/**
 * Get dashboard statistics
 * @returns {object} Stats object
 */
export async function getStats() {
  try {
    // Total employees
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
    
    // Active employees
    const { count: activeEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
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
    
    // Average break duration (last 7 days)
    const { data: avgData } = await supabase
      .from('breaks')
      .select('duration')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .not('duration', 'is', null)
    
    let avgDuration = 0
    if (avgData && avgData.length > 0) {
      const total = avgData.reduce((sum, b) => sum + (b.duration || 0), 0)
      avgDuration = Math.round(total / avgData.length / 60) // in minutes
    }
    
    // Most active employee (last 30 days)
    const { data: topEmployee } = await supabase
      .from('breaks')
      .select('employee_id, count')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .group('employee_id')
      .order('count', { ascending: false })
      .limit(1)
    
    return {
      totalEmployees: totalEmployees || 0,
      activeEmployees: activeEmployees || 0,
      activeBreaks: activeBreaks || 0,
      todayBreaks: todayBreaks || 0,
      avgBreakDuration: avgDuration,
      topEmployee: topEmployee?.[0] || null
    }
  } catch (error) {
    console.error('Error getting stats:', error)
    return {
      totalEmployees: 0,
      activeEmployees: 0,
      activeBreaks: 0,
      todayBreaks: 0,
      avgBreakDuration: 0,
      topEmployee: null
    }
  }
}

// ============================================
// DEPARTMENT FUNCTIONS
// ============================================

/**
 * Get all departments with employee counts
 * @returns {array} List of departments
 */
export async function getDepartments() {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('department')
      .order('department')
    
    if (error) throw error
    
    // Count employees per department
    const counts = {}
    data.forEach(emp => {
      const dept = emp.department || 'Unassigned'
      counts[dept] = (counts[dept] || 0) + 1
    })
    
    // Convert to array
    const result = Object.keys(counts).map(name => ({
      name,
      count: counts[name]
    }))
    
    return result
  } catch (error) {
    console.error('Error fetching departments:', error)
    return []
  }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to real-time break changes
 * @param {function} callback - Function to call on change
 * @param {string} table - Table to watch (default: 'breaks')
 * @returns {object} Subscription object
 */
export function subscribeToBreaks(callback, table = 'breaks') {
  const subscription = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table
      },
      (payload) => {
        console.log('Real-time update:', payload)
        callback(payload)
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status)
    })
  
  return subscription
}

/**
 * Subscribe to all tables (employees, breaks)
 * @param {function} callback - Function to call on change
 * @returns {array} Array of subscriptions
 */
export function subscribeToAll(callback) {
  const subscriptions = []
  
  // Subscribe to breaks
  subscriptions.push(
    supabase
      .channel('all-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'breaks'
        },
        (payload) => {
          console.log('Break update:', payload)
          callback(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        (payload) => {
          console.log('Employee update:', payload)
          callback(payload)
        }
      )
      .subscribe()
  )
  
  return subscriptions
}

/**
 * Unsubscribe from all channels
 * @param {array} subscriptions - Array of subscriptions
 */
export function unsubscribeAll(subscriptions) {
  subscriptions.forEach(sub => {
    if (sub && sub.unsubscribe) {
      sub.unsubscribe()
    }
  })
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format break duration in a readable format
 * @param {string|Date} startTime - Start time
 * @param {string|Date} endTime - End time (optional)
 * @returns {string} Formatted duration (e.g., "5m 30s")
 */
export function formatDuration(startTime, endTime = null) {
  try {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diff = Math.floor((end - start) / 1000)
    
    if (diff < 0) return '0m 0s'
    
    const mins = Math.floor(diff / 60)
    const secs = diff % 60
    
    if (mins === 0) {
      return `${secs}s`
    } else if (secs === 0) {
      return `${mins}m`
    } else {
      return `${mins}m ${secs}s`
    }
  } catch (error) {
    return 'Invalid time'
  }
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type (short, long, time)
 * @returns {string} Formatted date
 */
export function formatDate(date, format = 'short') {
  try {
    const d = new Date(date)
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      case 'long':
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      case 'time':
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      case 'datetime':
        return d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      default:
        return d.toLocaleString()
    }
  } catch (error) {
    return 'Invalid date'
  }
}

/**
 * Get break type label with emoji
 * @param {string} type - Break type (short, lunch, personal, meeting)
 * @returns {string} Label with emoji
 */
export function getBreakTypeLabel(type) {
  const types = {
    short: '☕ Short Break',
    lunch: '🍱 Lunch Break',
    personal: '👤 Personal Break',
    meeting: '📋 Meeting Break'
  }
  return types[type] || '❓ Unknown'
}

/**
 * Get status color for badges
 * @param {string} status - Status (active, completed, cancelled, on_break)
 * @returns {string} Color code
 */
export function getStatusColor(status) {
  const colors = {
    active: '#4CAF50',    // Green
    completed: '#2196F3',  // Blue
    cancelled: '#f44336',  // Red
    on_break: '#FF9800',   // Orange
    inactive: '#9E9E9E'    // Gray
  }
  return colors[status] || '#9E9E9E'
}

/**
 * Get status label
 * @param {string} status - Status
 * @returns {string} Human-readable label
 */
export function getStatusLabel(status) {
  const labels = {
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    on_break: 'On Break',
    inactive: 'Inactive'
  }
  return labels[status] || status
}

/**
 * Check if a string is a valid UUID
 * @param {string} str - String to check
 * @returns {boolean} True if valid UUID
 */
export function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Generate a random color
 * @returns {string} Random hex color
 */
export function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#FF9F43', '#2E86DE',
    '#EE5A24', '#7BED9F', '#70A1FF', '#FC427B'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
export default {
  supabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getUserProfile,
  resetPassword,
  updatePassword,
  getEmployees,
  getEmployeeById,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByDepartment,
  startBreak,
  endBreak,
  cancelBreak,
  getActiveBreaks,
  getBreakHistory,
  getBreaksForDay,
  getStats,
  getDepartments,
  subscribeToBreaks,
  subscribeToAll,
  unsubscribeAll,
  formatDuration,
  formatDate,
  getBreakTypeLabel,
  getStatusColor,
  getStatusLabel,
  isValidUUID,
  getRandomColor
}
