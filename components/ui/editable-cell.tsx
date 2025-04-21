"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface EditableCellProps {
  value: string | number
  onSave: (value: string | number) => Promise<void>
  inputType?: "text" | "number" | "date"
  className?: string
  disabled?: boolean
  formatter?: (value: string | number) => string
}

export function EditableCell({
  value: initialValue = "",
  onSave,
  inputType = "text",
  className,
  disabled = false,
  formatter,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update value if initialValue changes
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (value === initialValue) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      await onSave(value)
      toast({
        title: "Success",
        description: "Value updated successfully",
        variant: "success",
      })
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving value:", error)
      toast({
        title: "Error",
        description: "Failed to update value",
        variant: "destructive",
      })
      setValue(initialValue) // Reset to original value on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setValue(initialValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={(e) => setValue(inputType === "number" ? Number(e.target.value) : e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 min-w-[100px]"
          disabled={isLoading}
        />
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleSave} disabled={isLoading} className="h-7 w-7">
            <Check className="h-4 w-4 text-green-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isLoading} className="h-7 w-7">
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "cursor-pointer py-2 px-1 rounded hover:bg-muted/50 transition-colors",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
        className,
      )}
      onClick={() => !disabled && setIsEditing(true)}
    >
      {formatter ? formatter(value) : value}
    </div>
  )
}

