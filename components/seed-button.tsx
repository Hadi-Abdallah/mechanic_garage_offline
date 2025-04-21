"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { seedDatabase } from "@/lib/seed"
import { toast } from "@/components/ui/use-toast"

export function SeedButton() {
  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const result = await seedDatabase()
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          variant: "success",
        })
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <Button onClick={handleSeed} disabled={isSeeding}>
      {isSeeding ? "Seeding..." : "Seed Database"}
    </Button>
  )
}

