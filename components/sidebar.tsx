"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Car,
  Building2,
  Wrench,
  Package,
  Truck,
  ClipboardList,
  Home,
  Settings,
  LogOut,
  BarChart2,
  CalendarDays,
  DollarSign,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const routes = [
  {
    label: "Dashboard",
    icon: Home,
    href: "/",
    color: "text-sky-500",
  },
  {
    label: "Clients",
    icon: Users,
    href: "/clients",
    color: "text-violet-500",
  },
  {
    label: "Cars",
    icon: Car,
    href: "/cars",
    color: "text-pink-700",
  },
  {
    label: "Insurance",
    icon: Building2,
    href: "/insurance",
    color: "text-orange-500",
  },
  {
    label: "Services",
    icon: Wrench,
    href: "/services",
    color: "text-emerald-500",
  },
  {
    label: "Products",
    icon: Package,
    href: "/products",
    color: "text-blue-500",
  },
  {
    label: "Suppliers",
    icon: Truck,
    href: "/suppliers",
    color: "text-yellow-500",
  },
  {
    label: "Maintenance",
    icon: ClipboardList,
    href: "/maintenance",
    color: "text-red-500",
  },
  {
    label: "Finances",
    icon: DollarSign,
    href: "/finances",
    color: "text-green-600",
  },
  {
    label: "Employees",
    icon: UserCircle,
    href: "/employees",
    color: "text-indigo-500",
  },
  {
    label: "Reports",
    icon: BarChart2,
    href: "/reports",
    color: "text-green-500",
    submenu: [
      {
        label: "Daily Report",
        href: "/reports",
        icon: CalendarDays,
      },
      {
        label: "Consolidated",
        href: "/reports/consolidated",
        icon: BarChart2,
      },
      {
        label: "Activity Logs",
        href: "/logs",
        icon: ClipboardList,
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-background border-r">
      <div className="px-3 py-2 flex-1 flex flex-col">
        <Link href="/" className="flex items-center pl-3 mb-8">
          <h1 className="text-xl font-bold">Mechanic Garage</h1>
        </Link>
        <div className="space-y-1 overflow-y-auto flex-1 max-h-[calc(100vh-200px)]">
          {routes.map((route) => (
            <div key={route.href}>
              <Link
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                  pathname === route.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground",
                )}
              >
                <div className="flex items-center flex-1">
                  <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                  {route.label}
                </div>
              </Link>
              {route.submenu && (
                <div className="space-y-1 pl-6">
                  {route.submenu.map((subRoute) => (
                    <Link
                      key={subRoute.href}
                      href={subRoute.href}
                      className={cn(
                        "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                        pathname === subRoute.href
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground",
                      )}
                    >
                      <div className="flex items-center flex-1">
                        <subRoute.icon className="h-5 w-5 mr-3" />
                        {subRoute.label}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2 border-t">
        <div className="space-y-1 pt-2">
          <Link
            href="/settings"
            className={cn(
              "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
              pathname === "/settings"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground",
            )}
          >
            <div className="flex items-center flex-1">
              <Settings className="h-5 w-5 mr-3 text-gray-500" />
              Settings
            </div>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm px-3 font-medium"
          >
            <LogOut className="h-5 w-5 mr-3 text-gray-500" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
