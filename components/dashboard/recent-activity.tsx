import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const activities = [
  {
    id: 1,
    type: "maintenance",
    description: "New maintenance request created for Toyota Camry",
    timestamp: "2 minutes ago",
    user: "John D",
    userInitials: "JD",
  },
  {
    id: 2,
    type: "client",
    description: "New client Sarah Johnson registered",
    timestamp: "15 minutes ago",
    user: "Admin",
    userInitials: "AD",
  },
  {
    id: 3,
    type: "payment",
    description: "Payment of $350 received for maintenance #1234",
    timestamp: "1 hour ago",
    user: "Maria L",
    userInitials: "ML",
  },
  {
    id: 4,
    type: "inventory",
    description: "Low stock alert: Oil Filters (5 remaining)",
    timestamp: "2 hours ago",
    user: "System",
    userInitials: "SY",
  },
  {
    id: 5,
    type: "service",
    description: "Maintenance #1233 marked as completed",
    timestamp: "3 hours ago",
    user: "Robert T",
    userInitials: "RT",
  },
]

export function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{activity.userInitials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium">{activity.description}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>{activity.user}</span>
              <span className="mx-1">•</span>
              <span>{activity.timestamp}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

