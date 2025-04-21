"use client"

import { useState, useRef, useEffect } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table"
import { ChevronDown, Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Faceted filter component for column filtering
function DataTableFacetedFilter({
  column,
  title,
  options,
}: {
  column: any
  title: string
  options: { label: string; value: string }[]
}) {
  const facets = column?.getFacetedUniqueValues()
  const selectedValues = new Set(column?.getFilterValue() as string[])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <Filter className="mr-2 h-3.5 w-3.5" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal ml-1"
              >
                {selectedValues.size}
              </Badge>
              <X
                className="ml-1 h-3.5 w-3.5"
                onClick={(e) => {
                  e.stopPropagation()
                  column?.setFilterValue(undefined)
                }}
              />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => {
              const isSelected = selectedValues.has(option.value)
              const count = facets?.get(option.value) ?? 0

              return (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    if (isSelected) {
                      selectedValues.delete(option.value)
                    } else {
                      selectedValues.add(option.value)
                    }
                    const filterValues = Array.from(selectedValues)
                    column?.setFilterValue(
                      filterValues.length ? filterValues : undefined
                    )
                  }}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span>{option.label}</span>
                  {count > 0 && (
                    <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                      {count}
                    </span>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Column filter input
function ColumnFilterInput({
  column,
  table,
  placeholder = "Filter...",
}: {
  column: any
  table: any
  placeholder?: string
}) {
  const firstValue = table
    .getPreFilteredRowModel()
    .flatRows[0]?.getValue(column.id)

  const columnFilterValue = column.getFilterValue()

  return typeof firstValue === "number" ? (
    <div className="flex items-center space-x-2">
      <Input
        type="number"
        value={(columnFilterValue as [number, number])?.[0] ?? ""}
        onChange={(e) =>
          column.setFilterValue((old: [number, number]) => [
            e.target.value,
            old?.[1],
          ])
        }
        placeholder={`Min ${placeholder}`}
        className="h-8 w-24 border-dashed"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        type="number"
        value={(columnFilterValue as [number, number])?.[1] ?? ""}
        onChange={(e) =>
          column.setFilterValue((old: [number, number]) => [
            old?.[0],
            e.target.value,
          ])
        }
        placeholder={`Max ${placeholder}`}
        className="h-8 w-24 border-dashed"
      />
    </div>
  ) : (
    <Input
      type="text"
      value={(columnFilterValue ?? "") as string}
      onChange={(e) => column.setFilterValue(e.target.value)}
      placeholder={placeholder}
      className="h-8 w-full border-dashed"
    />
  )
}

interface AdvancedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  showTotals?: boolean;
  totalsRow?: React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
  isLoading?: boolean;
  fixedFirstColumn?: boolean; // Option to pin the first column in place when scrolling horizontally
  fixedLastColumn?: boolean; // Option to pin the last column in place when scrolling horizontally
  stickyFooter?: boolean; // Option to keep the totals row visible when scrolling vertically
}

export function AdvancedDataTable<TData, TValue>({
  columns,
  data,
  showTotals = false,
  totalsRow,
  onRowClick,
  isLoading: initialIsLoading = false,
  fixedFirstColumn = false,
  fixedLastColumn = false,
  stickyFooter = false,
}: AdvancedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [isLoading, setIsLoading] = useState(initialIsLoading);
  
  // Ref for tracking table container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Update loading state from props
  useEffect(() => {
    setIsLoading(initialIsLoading);
  }, [initialIsLoading]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Set a reasonable page size based on data length
  useEffect(() => {
    if (data.length <= 10) {
      table.setPageSize(10);
    } else if (data.length <= 25) {
      table.setPageSize(25);
    } else {
      table.setPageSize(50);
    }
  }, [data.length, table]);

  // Scroll to top when page changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [table.getState().pagination.pageIndex]);
  
  // No need for manual scroll sync since we use a single table with sticky positioning

  const filteredColumns = columns.filter(
    (column) => "accessorKey" in column || "accessorFn" in column
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {/* Global Filter Inputs */}
        {filteredColumns
          .filter((column) => {
            // Only show filter for specific columns
            const id = "accessorKey" in column ? String(column.accessorKey) : "";
            return (
              id === "type" || 
              id === "status" || 
              id === "client" || 
              id === "name"
            );
          })
          .map((column) => {
            const columnDef = table.getColumn(
              "accessorKey" in column 
                ? String(column.accessorKey) 
                : column.id || ""
            );
            
            if (!columnDef) return null;
            
            const header = String(column.header || ("accessorKey" in column ? column.accessorKey : column.id));
            
            // Special handling for type and status columns - use faceted filter
            if (
              "accessorKey" in column && 
              (String(column.accessorKey) === "type" || String(column.accessorKey) === "status")
            ) {
              // Get unique values for faceted filter options
              const options = Array.from(
                new Set(
                  data.map((item: any) => {
                    const value = item[String(column.accessorKey)];
                    return {
                      label: value?.charAt(0).toUpperCase() + value?.slice(1) || "Unknown",
                      value: value || "",
                    };
                  })
                )
              );
              
              // Sort options alphabetically
              options.sort((a, b) => a.label.localeCompare(b.label));
              
              return (
                <DataTableFacetedFilter
                  key={columnDef.id}
                  column={columnDef}
                  title={header}
                  options={options}
                />
              );
            }
            
            return (
              <div key={columnDef.id} className="flex flex-col space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{header}</p>
                <ColumnFilterInput column={columnDef} table={table} placeholder={`Filter ${header}...`} />
              </div>
            );
          })}
      </div>

      {/* The main table container with fixed header and fixed first/last columns */}
      <div className="relative rounded-md border">
        {/* Container with fixed dimensions and overflow behavior */}
        <div 
          ref={tableContainerRef} 
          className={cn(
            "relative border rounded-md overflow-auto",
            stickyFooter ? "h-[calc(100vh-400px)]" : "h-[calc(100vh-300px)]"
          )}
        >
          <table className="w-full table-fixed border-separate border-spacing-0">
            {/* Table header that stays fixed during vertical scroll */}
            <thead className="sticky top-0 z-50 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th 
                      key={header.id}
                      style={{ 
                        width: header.getSize(), 
                        height: '48px',
                        ...(index === 0 && fixedFirstColumn ? { position: 'sticky', left: 0 } : {}),
                        ...(index === headerGroup.headers.length - 1 && fixedLastColumn ? { position: 'sticky', right: 0 } : {})
                      }}
                      className={cn(
                        "p-2 text-left border-b bg-background font-medium text-sm",
                        // Apply sticky styling to the first column if fixedFirstColumn is enabled
                        index === 0 && fixedFirstColumn ? 
                          "sticky left-0 bg-background z-50 border-r shadow-[1px_0_0_0_#e5e7eb]" : "",
                        // Apply sticky styling to the last column if fixedLastColumn is enabled
                        index === headerGroup.headers.length - 1 && fixedLastColumn ? 
                          "sticky right-0 bg-background z-50 border-l shadow-[-1px_0_0_0_#e5e7eb]" : "",
                      )}
                    >
                      <div className="flex items-center">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanSort() && (
                          <Button
                            variant="ghost"
                            onClick={() => header.column.toggleSorting()}
                            className="ml-1 p-1 h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary"
                            title="Sort by this column"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            
            {/* Table body */}
            <tbody>
              {isLoading ? (
                // Loading state skeleton
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {Array.from({ length: columns.length }).map((_, colIndex) => (
                      <td 
                        key={`skeleton-cell-${rowIndex}-${colIndex}`}
                        style={{ 
                          width: table.getHeaderGroups()[0]?.headers[colIndex]?.getSize(),
                          ...(colIndex === 0 && fixedFirstColumn ? { position: 'sticky', left: 0 } : {}),
                          ...(colIndex === columns.length - 1 && fixedLastColumn ? { position: 'sticky', right: 0 } : {})
                        }}
                        className={cn(
                          "p-2 border-b",
                          colIndex === 0 && fixedFirstColumn ? "sticky left-0 bg-background z-20 border-r shadow-[1px_0_0_0_#e5e7eb]" : "",
                          colIndex === columns.length - 1 && fixedLastColumn ? "sticky right-0 bg-background z-20 border-l shadow-[-1px_0_0_0_#e5e7eb]" : ""
                        )}
                      >
                        <Skeleton className="h-6 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "border-b",
                      onRowClick && "cursor-pointer hover:bg-muted/50",
                      row.getIsSelected() ? "bg-muted" : ""
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <td 
                        key={cell.id}
                        style={{ 
                          width: cell.column.getSize(),
                          ...(index === 0 && fixedFirstColumn ? { position: 'sticky', left: 0 } : {}),
                          ...(index === row.getVisibleCells().length - 1 && fixedLastColumn ? { position: 'sticky', right: 0 } : {})
                        }}
                        className={cn(
                          "p-2",
                          // Apply sticky styling to the first column if fixedFirstColumn is enabled
                          index === 0 && fixedFirstColumn ? 
                            "sticky left-0 z-20 border-r shadow-[1px_0_0_0_#e5e7eb]" : "",
                          // Apply sticky styling to the last column if fixedLastColumn is enabled
                          index === row.getVisibleCells().length - 1 && fixedLastColumn ? 
                            "sticky right-0 z-20 border-l shadow-[-1px_0_0_0_#e5e7eb]" : "",
                          // Ensure proper background color
                          row.getIsSelected() ? "bg-muted" : "bg-background"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center p-2 border-b">
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
            
            {/* Fixed footer */}
            {showTotals && (
              <tfoot className="sticky bottom-0 z-50 bg-background border-t-2 border-primary/20 shadow-[0_-3px_5px_rgba(0,0,0,0.15)]">
                <tr>
                  {Array.isArray(totalsRow) ? (
                    // If totalsRow is an array of cells, render them
                    totalsRow.map((cell, index) => (
                      <td 
                        key={`total-cell-${index}`}
                        style={{ 
                          width: table.getHeaderGroups()[0]?.headers[index]?.getSize(),
                          ...(index === 0 && fixedFirstColumn ? { position: 'sticky', left: 0 } : {}),
                          ...(index === totalsRow.length - 1 && fixedLastColumn ? { position: 'sticky', right: 0 } : {})
                        }}
                        className={cn(
                          "p-2 bg-background font-medium text-primary",
                          // Apply sticky styling to the first column if fixedFirstColumn is enabled
                          index === 0 && fixedFirstColumn ? 
                            "sticky left-0 z-50 border-r shadow-[1px_0_0_0_#e5e7eb]" : "",
                          // Apply sticky styling to the last column if fixedLastColumn is enabled
                          index === totalsRow.length - 1 && fixedLastColumn ? 
                            "sticky right-0 z-50 border-l shadow-[-1px_0_0_0_#e5e7eb]" : ""
                        )}
                      >
                        {cell}
                      </td>
                    ))
                  ) : (
                    // Otherwise, render the totalsRow as a single cell spanning all columns
                    <td colSpan={table.getAllColumns().length} className="p-2 bg-background font-medium text-primary">
                      {totalsRow}
                    </td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of {data.length} items
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}