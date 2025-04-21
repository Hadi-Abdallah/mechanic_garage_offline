"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { CalendarDateRangePicker } from "../ui/date-range-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatCurrency } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { TableHead, TableRow, TableHeader, TableCell, TableBody, Table } from "@/components/ui/table";
import { FileDown, Plus, Info, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  createFinanceCategory,
  createFinanceRecord,
  deleteFinanceCategory,
  deleteFinanceRecord,
  exportFinanceRecordsToCSV,
  getFinancialSummary, 
  updateFinanceCategory, 
  updateFinanceRecord 
} from "@/lib/actions";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getDateRangeLabel } from "@/lib/date-utils";
import { useOnlineStatus } from "@/lib/network-status";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300', '#a4de6c'];

type FinanceCategoryProps = {
  id: string;
  name: string;
  type: "income" | "expense";
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type FinanceRecordProps = {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  referenceNumber?: string;
  relatedEntityType?: "maintenance" | "salary" | "product" | "service" | "other";
  relatedEntityId?: string;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "check" | "other";
  attachmentUrl?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export function FinancesPageClient({
  initialCategories = [],
  initialRecords = [],
  initialIncomeCategories = [],
  initialExpenseCategories = []
}: {
  initialCategories: FinanceCategoryProps[];
  initialRecords: FinanceRecordProps[];
  initialIncomeCategories: FinanceCategoryProps[];
  initialExpenseCategories: FinanceCategoryProps[];
}) {
  // Online status
  const isOnline = useOnlineStatus();
  
  // State
  const [categories, setCategories] = useState<FinanceCategoryProps[]>(initialCategories);
  const [records, setRecords] = useState<FinanceRecordProps[]>(initialRecords);
  const [incomeCategories, setIncomeCategories] = useState<FinanceCategoryProps[]>(initialIncomeCategories);
  const [expenseCategories, setExpenseCategories] = useState<FinanceCategoryProps[]>(initialExpenseCategories);
  const [financialSummary, setFinancialSummary] = useState<any>(null);

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of the current month
    to: new Date()
  });

  // Selected tab
  const [selectedTab, setSelectedTab] = useState("overview");

  // New record form state
  const [newRecord, setNewRecord] = useState({
    categoryId: "",
    amount: "",
    description: ""
  });

  // New category form state
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "income",
    description: ""
  });

  // Dialog state
  const [addRecordDialogOpen, setAddRecordDialogOpen] = useState(false);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);

  // Load financial summary when date range changes
  useEffect(() => {
    const fetchFinancialSummary = async () => {
      try {
        if (!dateRange.from || !dateRange.to) {
          console.warn("Date range is incomplete");
          return;
        }

        const from = dateRange.from.toISOString();
        const to = dateRange.to ? dateRange.to.toISOString() : new Date().toISOString();
        
        const result = await getFinancialSummary(from, to, "month");
        if (result && result.success) {
          setFinancialSummary(result.data);
        } else {
          console.error("Failed to fetch financial summary:", result?.error);
          toast.error("Failed to fetch financial summary");
        }
      } catch (error) {
        console.error("Error fetching financial summary:", error);
        toast.error("An error occurred while fetching financial data");
      }
    };

    fetchFinancialSummary();
  }, [dateRange]);

  // Calculate incomes and expenses
  const displayedRecords = records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= dateRange.from && 
           (!dateRange.to || recordDate <= dateRange.to);
  });

  const incomesMap = new Map<string, number>();
  const expensesMap = new Map<string, number>();
  
  // Create a map for faster category lookups
  const categoryMap = new Map<string, FinanceCategoryProps>();
  categories.forEach(category => {
    categoryMap.set(category.id, category);
    if (category.type === "income") {
      incomesMap.set(category.id, 0);
    } else {
      expensesMap.set(category.id, 0);
    }
  });

  // Calculate totals by category
  displayedRecords.forEach(record => {
    const category = categoryMap.get(record.categoryId);
    if (category) {
      if (category.type === "income") {
        incomesMap.set(category.id, (incomesMap.get(category.id) || 0) + record.amount);
      } else {
        expensesMap.set(category.id, (expensesMap.get(category.id) || 0) + record.amount);
      }
    }
  });

  // Prepare data for charts
  const incomeData = Array.from(incomesMap.entries()).map(([id, amount]) => {
    const category = categoryMap.get(id);
    return {
      name: category?.name || "Unknown",
      value: amount
    };
  }).filter(item => item.value > 0);

  const expenseData = Array.from(expensesMap.entries()).map(([id, amount]) => {
    const category = categoryMap.get(id);
    return {
      name: category?.name || "Unknown",
      value: amount
    };
  }).filter(item => item.value > 0);

  // Total income and expense
  const totalIncome = incomeData.reduce((sum, item) => sum + item.value, 0);
  const totalExpense = expenseData.reduce((sum, item) => sum + item.value, 0);
  const netBalance = totalIncome - totalExpense;

  // Prepare time series data for bar chart
  const timeSeriesData = financialSummary?.timeSeriesData || [];

  // Handle add record
  const handleAddRecord = async () => {
    try {
      if (!newRecord.categoryId) {
        toast.error("Please select a transaction type");
        return;
      }

      if (!newRecord.amount || isNaN(Number(newRecord.amount)) || Number(newRecord.amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (!newRecord.description) {
        toast.error("Please enter a description");
        return;
      }

      const data = {
        ...newRecord,
        amount: Number(newRecord.amount),
        date: new Date().toISOString().split('T')[0], // Use current date
        createdBy: "User"
      };

      // Use the offline-aware API client instead of direct server action
      const { data: result, error, offline } = await api.post('/api/finance/records', data);
      
      if (!error) {
        // If operation was successful (either online or offline)
        if (result) {
          setRecords(prev => [...prev, result]);
        } else if (offline) {
          // If we're offline, add the local version to the UI
          // Create a temporary ID for optimistic UI updates
          const tempRecord = {
            ...data,
            id: `temp_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setRecords(prev => [...prev, tempRecord]);
        }
        
        setAddRecordDialogOpen(false);
        
        // Reset only the essential fields
        setNewRecord({
          ...newRecord,
          amount: "",
          description: ""
        });
        
        toast.success(offline 
          ? "Record saved offline. Will sync when connection is restored." 
          : "Record added successfully");
      } else {
        toast.error(error.message || "Failed to add record");
      }
    } catch (error) {
      console.error("Error adding record:", error);
      toast.error("An error occurred while adding the record");
    }
  };

  // Handle add category
  const handleAddCategory = async () => {
    try {
      if (!newCategory.name) {
        toast.error("Please enter a category name");
        return;
      }

      if (!newCategory.type) {
        toast.error("Please select a category type");
        return;
      }

      const data = {
        ...newCategory,
        isDefault: false
      };

      // Use the offline-aware API client
      const { data: result, error, offline } = await api.post('/api/finance/categories', data);
      
      if (!error) {
        // If operation was successful (either online or offline)
        let newCat;
        
        if (result) {
          newCat = result;
        } else if (offline) {
          // If offline, create a temporary record for UI updates
          newCat = {
            ...data,
            id: `temp_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        
        if (newCat) {
          setCategories(prev => [...prev, newCat]);
          
          if (newCat.type === "income") {
            setIncomeCategories(prev => [...prev, newCat]);
          } else {
            setExpenseCategories(prev => [...prev, newCat]);
          }
        }
        
        setAddCategoryDialogOpen(false);
        setNewCategory({
          name: "",
          type: "income",
          description: ""
        });
        
        toast.success(offline 
          ? "Category saved offline. Will sync when connection is restored." 
          : "Category added successfully");
      } else {
        toast.error(error.message || "Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("An error occurred while adding the category");
    }
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    try {
      if (!dateRange.from) {
        toast.error("Please select a date range first");
        return;
      }
      
      // Check if we're online - export requires online connectivity
      if (!isOnline) {
        toast.error("Cannot export CSV while offline. Please reconnect to the internet and try again.");
        return;
      }
      
      const from = dateRange.from.toISOString();
      const to = dateRange.to ? dateRange.to.toISOString() : new Date().toISOString();
      
      // Use the API client with requiresAuth and offline fallback disabled
      const { data: result, error } = await api.get(`/api/finance/export-csv?from=${from}&to=${to}`, { 
        offlineFallback: false 
      });
      
      if (!error && result) {
        // Create a download link
        const element = document.createElement("a");
        const file = new Blob([result.content], {type: 'text/csv'});
        element.href = URL.createObjectURL(file);
        element.download = result.filename || `finance_records_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(element); // Required for Firefox
        element.click();
        document.body.removeChild(element);
        toast.success("CSV exported successfully");
      } else {
        toast.error(error?.message || "Failed to export CSV");
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("An error occurred while exporting the CSV");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker
              date={dateRange}
              onUpdate={setDateRange}
            />
            {!isOnline && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center">
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
                Offline Mode
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {getDateRangeLabel(dateRange.from, dateRange.to)}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={addCategoryDialogOpen} onOpenChange={setAddCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new category for income or expense tracking.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="category-name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category-type" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={newCategory.type}
                    onValueChange={(value: "income" | "expense") => 
                      setNewCategory({ ...newCategory, type: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category-description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="category-description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddCategoryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleAddCategory}>Save Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog 
            open={addRecordDialogOpen} 
            onOpenChange={(open) => {
              if (open && incomeCategories.length > 0 && !newRecord.categoryId) {
                // When opening the dialog, auto-select the first income category if none is selected
                setNewRecord({
                  ...newRecord,
                  categoryId: incomeCategories[0]?.id || ""
                });
              }
              setAddRecordDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Financial Record</DialogTitle>
                <DialogDescription>
                  Add a new income or expense record to track your finances.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="record-type" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={newRecord.categoryId ? 
                      (categoryMap.get(newRecord.categoryId)?.type || "income") : 
                      "income"}
                    onValueChange={(value: "income" | "expense") => {
                      // Select the first category of the selected type
                      const firstCategory = value === "income" 
                        ? incomeCategories[0] 
                        : expenseCategories[0];
                      if (firstCategory) {
                        setNewRecord({ ...newRecord, categoryId: firstCategory.id });
                      }
                    }}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="record-amount" className="text-right">
                    Amount
                  </Label>
                  <Input
                    id="record-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newRecord.amount}
                    onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="record-description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="record-description"
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    className="col-span-3"
                    placeholder="What is this transaction for?"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddRecordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleAddRecord}>Add Record</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Income
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
                <p className="text-xs text-muted-foreground">
                  During selected period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
                <p className="text-xs text-muted-foreground">
                  During selected period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Net Balance
                </CardTitle>
                <Info className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Income - Expenses
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Income Distribution</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full">
                  {incomeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {incomeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => formatCurrency(value)}
                          labelFormatter={(name) => `Category: ${name}`}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">No income data for the selected period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Expense Distribution</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full">
                  {expenseData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {expenseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => formatCurrency(value)}
                          labelFormatter={(name) => `Category: ${name}`}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">No expense data for the selected period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses Over Time</CardTitle>
              <CardDescription>Monthly breakdown during the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timeSeriesData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        labelFormatter={(period) => {
                          // Format the period based on its format (YYYY, YYYY-MM, etc.)
                          if (period.length === 4) {
                            return `Year: ${period}`;
                          } else if (period.includes('-')) {
                            const [year, month] = period.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1);
                            return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                          }
                          return period;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#4ade80" />
                      <Bar dataKey="expense" name="Expenses" fill="#f87171" />
                      <Bar dataKey="balance" name="Balance" fill="#60a5fa" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No time series data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Your most recent financial records during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRecords.length > 0 ? (
                    // Sort by date, most recent first
                    [...displayedRecords]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 10) // Show only the 10 most recent
                      .map((record) => {
                        const category = categories.find(c => c.id === record.categoryId);
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              {new Date(record.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{category?.name || "Unknown"}</TableCell>
                            <TableCell>
                              <HoverCard>
                                <HoverCardTrigger>
                                  <span className="cursor-help underline decoration-dotted">
                                    {record.description.length > 30
                                      ? `${record.description.substring(0, 30)}...`
                                      : record.description}
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-semibold">Details</h4>
                                    <p className="text-sm">{record.description}</p>
                                    {record.notes && (
                                      <>
                                        <Separator />
                                        <p className="text-xs text-muted-foreground">
                                          <span className="font-semibold">Notes:</span> {record.notes}
                                        </p>
                                      </>
                                    )}
                                    {record.referenceNumber && (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-semibold">Reference:</span> {record.referenceNumber}
                                      </p>
                                    )}
                                    {record.paymentMethod && (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-semibold">Payment Method:</span>{" "}
                                        {record.paymentMethod.replace("_", " ")}
                                      </p>
                                    )}
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                            <TableCell>
                              <span className={category?.type === "income" ? "text-green-600" : "text-red-600"}>
                                {formatCurrency(record.amount)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={category?.type === "income" ? "success" : "destructive"}>
                                {category?.type === "income" ? "Income" : "Expense"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No records found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Income Records</span>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </CardTitle>
              <CardDescription>
                All income transactions during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRecords.length > 0 ? (
                      [...displayedRecords]
                        .filter(record => {
                          const category = categories.find(c => c.id === record.categoryId);
                          return category?.type === "income";
                        })
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((record) => {
                          const category = categories.find(c => c.id === record.categoryId);
                          return (
                            <TableRow key={record.id}>
                              <TableCell>
                                {new Date(record.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{category?.name || "Unknown"}</TableCell>
                              <TableCell>
                                <HoverCard>
                                  <HoverCardTrigger>
                                    <span className="cursor-help underline decoration-dotted">
                                      {record.description.length > 30
                                        ? `${record.description.substring(0, 30)}...`
                                        : record.description}
                                    </span>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80">
                                    <div className="space-y-1">
                                      <h4 className="text-sm font-semibold">Details</h4>
                                      <p className="text-sm">{record.description}</p>
                                      {record.notes && (
                                        <>
                                          <Separator />
                                          <p className="text-xs text-muted-foreground">
                                            <span className="font-semibold">Notes:</span> {record.notes}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              </TableCell>
                              <TableCell className="font-medium text-green-600">
                                {formatCurrency(record.amount)}
                              </TableCell>
                              <TableCell>{record.referenceNumber || "-"}</TableCell>
                              <TableCell>
                                {record.paymentMethod
                                  ? record.paymentMethod.replace("_", " ")
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No income records found for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Income Categories</CardTitle>
              <CardDescription>
                Manage your income categories for better financial organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Total (Period)</TableHead>
                      <TableHead>Default</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeCategories.length > 0 ? (
                      incomeCategories.map((category) => {
                        const totalAmount = Array.from(incomesMap.entries())
                          .find(([id]) => id === category.id)?.[1] || 0;
                        
                        return (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>
                              {category.description || "-"}
                            </TableCell>
                            <TableCell className="text-green-600">
                              {formatCurrency(totalAmount)}
                            </TableCell>
                            <TableCell>
                              {category.isDefault ? (
                                <Badge variant="outline">Default</Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No income categories found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Expense Records</span>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </CardTitle>
              <CardDescription>
                All expense transactions during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRecords.length > 0 ? (
                      [...displayedRecords]
                        .filter(record => {
                          const category = categories.find(c => c.id === record.categoryId);
                          return category?.type === "expense";
                        })
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((record) => {
                          const category = categories.find(c => c.id === record.categoryId);
                          return (
                            <TableRow key={record.id}>
                              <TableCell>
                                {new Date(record.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{category?.name || "Unknown"}</TableCell>
                              <TableCell>
                                <HoverCard>
                                  <HoverCardTrigger>
                                    <span className="cursor-help underline decoration-dotted">
                                      {record.description.length > 30
                                        ? `${record.description.substring(0, 30)}...`
                                        : record.description}
                                    </span>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80">
                                    <div className="space-y-1">
                                      <h4 className="text-sm font-semibold">Details</h4>
                                      <p className="text-sm">{record.description}</p>
                                      {record.notes && (
                                        <>
                                          <Separator />
                                          <p className="text-xs text-muted-foreground">
                                            <span className="font-semibold">Notes:</span> {record.notes}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              </TableCell>
                              <TableCell className="font-medium text-red-600">
                                {formatCurrency(record.amount)}
                              </TableCell>
                              <TableCell>{record.referenceNumber || "-"}</TableCell>
                              <TableCell>
                                {record.paymentMethod
                                  ? record.paymentMethod.replace("_", " ")
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No expense records found for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>
                Manage your expense categories for better financial organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Total (Period)</TableHead>
                      <TableHead>Default</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseCategories.length > 0 ? (
                      expenseCategories.map((category) => {
                        const totalAmount = Array.from(expensesMap.entries())
                          .find(([id]) => id === category.id)?.[1] || 0;
                        
                        return (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>
                              {category.description || "-"}
                            </TableCell>
                            <TableCell className="text-red-600">
                              {formatCurrency(totalAmount)}
                            </TableCell>
                            <TableCell>
                              {category.isDefault ? (
                                <Badge variant="outline">Default</Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No expense categories found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}