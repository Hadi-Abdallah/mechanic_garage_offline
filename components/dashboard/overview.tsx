"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    name: "Jan",
    maintenance: 45,
    revenue: 4000,
  },
  {
    name: "Feb",
    maintenance: 52,
    revenue: 4800,
  },
  {
    name: "Mar",
    maintenance: 49,
    revenue: 5200,
  },
  {
    name: "Apr",
    maintenance: 63,
    revenue: 5800,
  },
  {
    name: "May",
    maintenance: 58,
    revenue: 6000,
  },
  {
    name: "Jun",
    maintenance: 64,
    revenue: 6500,
  },
  {
    name: "Jul",
    maintenance: 72,
    revenue: 7200,
  },
  {
    name: "Aug",
    maintenance: 68,
    revenue: 7000,
  },
  {
    name: "Sep",
    maintenance: 75,
    revenue: 7800,
  },
  {
    name: "Oct",
    maintenance: 82,
    revenue: 8200,
  },
  {
    name: "Nov",
    maintenance: 87,
    revenue: 8700,
  },
  {
    name: "Dec",
    maintenance: 92,
    revenue: 9200,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === "revenue") return [`$${value}`, "Revenue"]
            return [value, "Maintenance Requests"]
          }}
        />
        <Bar dataKey="maintenance" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
        <Bar dataKey="revenue" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary/30" />
      </BarChart>
    </ResponsiveContainer>
  )
}

