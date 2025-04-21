"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function CalendarDateRangePicker({
  className,
  date,
  onUpdate,
}: {
  className?: string;
  date: DateRange | undefined;
  onUpdate: (date: DateRange) => void;
}) {
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);

  const presets = [
    {
      name: "Today",
      getRange: () => {
        const today = new Date();
        return {
          from: today,
          to: today,
        };
      },
    },
    {
      name: "Yesterday",
      getRange: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          from: yesterday,
          to: yesterday,
        };
      },
    },
    {
      name: "Last 7 Days",
      getRange: () => {
        const today = new Date();
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 6);
        return {
          from: last7Days,
          to: today,
        };
      },
    },
    {
      name: "Last 30 Days",
      getRange: () => {
        const today = new Date();
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 29);
        return {
          from: last30Days,
          to: today,
        };
      },
    },
    {
      name: "This Month",
      getRange: () => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          from: firstDayOfMonth,
          to: today,
        };
      },
    },
    {
      name: "Last Month",
      getRange: () => {
        const today = new Date();
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          from: firstDayOfLastMonth,
          to: lastDayOfLastMonth,
        };
      },
    },
    {
      name: "This Year",
      getRange: () => {
        const today = new Date();
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        return {
          from: firstDayOfYear,
          to: today,
        };
      },
    },
    {
      name: "Last Year",
      getRange: () => {
        const lastYear = new Date().getFullYear() - 1;
        const firstDayOfLastYear = new Date(lastYear, 0, 1);
        const lastDayOfLastYear = new Date(lastYear, 11, 31);
        return {
          from: firstDayOfLastYear,
          to: lastDayOfLastYear,
        };
      },
    },
  ];

  const handlePresetClick = (preset: typeof presets[number]) => {
    setSelectedPreset(preset.name);
    onUpdate(preset.getRange());
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex px-4 pt-4">
            <div className="w-[160px] pr-4 space-y-2">
              <div className="text-sm font-medium">Presets</div>
              <div className="grid gap-1.5">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={selectedPreset === preset.name ? "default" : "outline"}
                    className="justify-start text-xs"
                    size="sm"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="border-l pl-4">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(range) => {
                  if (range) {
                    setSelectedPreset(null);
                    onUpdate(range);
                  }
                }}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}