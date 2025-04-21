export function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEBUG] ${message}`, data)
  }
}

export function debugError(message: string, error?: any) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[ERROR] ${message}`, error)
  }
}

