"use client"

import { useState, useRef, useEffect } from "react"
import { Check, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Option {
  value: string
  label: string
}

interface EditableSelectProps {
  value: string
  options: Option[]
  onSave: (value: string) => Promise<void>
  className?: string
  disabled?: boolean
  placeholder?: string
}

export function EditableSelect({
  value: initialValue = "",
  options,
  onSave,
  className,
  disabled = false,
  placeholder = "Select...",
}: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [isLoading, setIsLoading] = useState(false)
  const selectRef = useRef<HTMLButtonElement>(null)

  // Update value if initialValue changes
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.click()
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

  const getDisplayValue = () => {
    const option = options.find((opt) => opt.value === initialValue)
    return option ? option.label : initialValue || placeholder
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Select
          value={value}
          onValueChange={setValue}
          disabled={isLoading}
          onOpenChange={(open) => {
            if (!open && value !== initialValue) {
              handleSave()
            }
          }}
        >
          <SelectTrigger ref={selectRef} className="h-8 min-w-[120px]">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        "cursor-pointer py-2 px-1 rounded hover:bg-muted/50 transition-colors flex items-center",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
        className,
      )}
      onClick={() => !disabled && setIsEditing(true)}
    >
      <span className="flex-1">{getDisplayValue()}</span>
      {!disabled && <ChevronDown className="h-4 w-4 opacity-50" />}
    </div>
  )
}

