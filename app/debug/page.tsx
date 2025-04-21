import { EnvDebug } from "@/components/env-debug"
import { SeedButton } from "@/components/seed-button"

export default function DebugPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug</h1>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Environment Variables</h2>
        <EnvDebug />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Database</h2>
        <SeedButton />
      </div>
    </div>
  )
}

