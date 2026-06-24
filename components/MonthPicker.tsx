"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr",
  "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec",
];

interface MonthPickerProps {
  /** Value in "YYYY-MM" format */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  allowFuture?: boolean;
}

export default function MonthPicker({ value, onChange, className, allowFuture = false }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value.split("-")[0]));

  const selectedYear  = Number(value.split("-")[0]);
  const selectedMonth = Number(value.split("-")[1]) - 1; // 0-indexed

  const nowYear  = new Date().getFullYear();
  const nowMonth = new Date().getMonth();

  function select(monthIdx: number) {
    const mm = String(monthIdx + 1).padStart(2, "0");
    onChange(`${year}-${mm}`);
    setOpen(false);
  }

  function prevYear() { setYear((y) => y - 1); }
  function nextYear() { setYear((y) => y + 1); }

  const displayLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setYear(selectedYear); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 gap-2 font-medium text-sm border-border/60 bg-card hover:bg-muted/50",
            className
          )}
        >
          <CalendarDays className="h-4 w-4 text-primary" />
          {displayLabel}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-64 p-0 border-border/60 shadow-lg overflow-hidden"
      >
        {/* Year navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={prevYear}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tracking-wide">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={nextYear}
            disabled={!allowFuture && year >= nowYear + 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1 p-3">
          {MONTHS.map((label, idx) => {
            const isSelected = year === selectedYear && idx === selectedMonth;
            const isToday    = year === nowYear && idx === nowMonth;
            const isFuture   = year > nowYear || (year === nowYear && idx > nowMonth);
            const isDisabled = !allowFuture && isFuture;

            return (
              <button
                key={label}
                onClick={() => select(idx)}
                disabled={isDisabled}
                className={cn(
                  "relative rounded-md px-2 py-2 text-sm font-medium transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isDisabled
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isToday
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {label}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
