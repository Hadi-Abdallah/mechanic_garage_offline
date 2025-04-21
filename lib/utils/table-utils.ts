import { formatCurrency } from "@/lib/utils"

// Format cell value for display or export
export function formatCellValue(value: any, key: string): string {
  if (value === undefined || value === null) {
    return ""
  }
  
  // Format dates
  if (
    (key.includes('date') || key.includes('time') || key.includes('created') || key.includes('updated')) && 
    typeof value === 'string' && 
    value.includes('-')
  ) {
    try {
      return new Date(value).toLocaleString()
    } catch (e) {
      return value.toString()
    }
  }
  
  // Format currency
  if (
    key.includes('amount') || 
    key.includes('cost') || 
    key.includes('price') || 
    key.includes('balance') || 
    key.includes('fee') ||
    key.includes('payment')
  ) {
    if (typeof value === 'number') {
      return formatCurrency(value)
    }
  }
  
  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  
  return value.toString()
}

// Get all unique keys from an array of objects
export function getAllUniqueKeys(data: any[]): string[] {
  const keysSet = new Set<string>()
  
  data.forEach(item => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(key => {
        keysSet.add(key)
      })
    }
  })
  
  return Array.from(keysSet).sort()
}

// Filter out complex and internal keys that shouldn't be displayed
export function filterDisplayKeys(keys: string[]): string[] {
  const excludedKeys = [
    'serviceDetails', 
    'productDetails', 
    'createdAt', 
    'updatedAt',
    'timestamp',
    '__v',
    '_id'
  ]
  
  return keys.filter(key => !excludedKeys.includes(key))
}

// Get human-readable column name from camelCase or snake_case
export function formatColumnName(key: string): string {
  // Replace underscores with spaces
  let formattedKey = key.replace(/_/g, ' ')
  
  // Convert camelCase to spaces
  formattedKey = formattedKey.replace(/([a-z])([A-Z])/g, '$1 $2')
  
  // Capitalize first letter and all letters after spaces
  return formattedKey
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Apply status color based on status value
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'paid':
    case 'success':
    case 'approved':
      return 'success'
    case 'in-progress':
    case 'in progress':
    case 'processing':
      return 'default'
    case 'pending':
    case 'waiting':
      return 'secondary'
    case 'cancelled':
    case 'canceled':
    case 'failed':
    case 'rejected':
      return 'destructive'
    case 'partial':
    case 'warning':
      return 'warning'
    default:
      return 'outline'
  }
}