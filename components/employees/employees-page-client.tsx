"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn, formatCurrency } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { useOnlineStatus } from "@/lib/network-status";
import { Badge } from "@/components/ui/badge";
import { TableHead, TableRow, TableHeader, TableCell, TableBody, Table } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileDown, Plus, Eye, Edit, Trash, WifiOff, CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  createEmployee, 
  createSalary, 
  deleteEmployee, 
  deleteSalary, 
  exportEmployeesToCSV, 
  getSalariesByDateRange, 
  getSalariesByEmployeeId, 
  updateEmployee, 
  updateSalary 
} from "@/lib/actions";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

type EmployeeProps = {
  id: string;
  name: string;
  position: string;
  hireDate: string;
  contact: string;
  email: string;
  baseSalary: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SalaryProps = {
  id: string;
  employeeId: string;
  amount: number;
  paymentDate: string;
  paymentPeriod: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
};

export function EmployeesPageClient({
  initialEmployees = [],
  initialSalaries = []
}: {
  initialEmployees: EmployeeProps[];
  initialSalaries: SalaryProps[];
}) {
  // Online status
  const isOnline = useOnlineStatus();
  
  // State
  const [employees, setEmployees] = useState<EmployeeProps[]>(initialEmployees);
  const [salaries, setSalaries] = useState<SalaryProps[]>(initialSalaries);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProps | null>(null);
  const [selectedSalary, setSelectedSalary] = useState<SalaryProps | null>(null);
  const [employeeSalaries, setEmployeeSalaries] = useState<SalaryProps[]>([]);

  // Dialog states
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [editEmployeeDialogOpen, setEditEmployeeDialogOpen] = useState(false);
  const [addSalaryDialogOpen, setAddSalaryDialogOpen] = useState(false);
  const [editSalaryDialogOpen, setEditSalaryDialogOpen] = useState(false);
  const [viewEmployeeDialogOpen, setViewEmployeeDialogOpen] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [deleteSalaryConfirmDialogOpen, setDeleteSalaryConfirmDialogOpen] = useState(false);

  // Form states
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    position: "",
    hireDate: new Date().toISOString().split("T")[0],
    contact: "",
    email: "",
    baseSalary: "",
    isActive: true
  });

  const [editingEmployee, setEditingEmployee] = useState<Partial<EmployeeProps> | null>(null);
  
  const [newSalary, setNewSalary] = useState({
    employeeId: "",
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentPeriod: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
    isPaid: false
  });

  const [editingSalary, setEditingSalary] = useState<Partial<SalaryProps> | null>(null);

  // Reset form when dialogs close
  useEffect(() => {
    if (!addEmployeeDialogOpen) {
      setNewEmployee({
        name: "",
        position: "",
        hireDate: new Date().toISOString().split("T")[0],
        contact: "",
        email: "",
        baseSalary: "",
        isActive: true
      });
    }
  }, [addEmployeeDialogOpen]);

  useEffect(() => {
    if (!editEmployeeDialogOpen) {
      setEditingEmployee(null);
    }
  }, [editEmployeeDialogOpen]);

  useEffect(() => {
    if (!addSalaryDialogOpen) {
      setNewSalary({
        employeeId: "",
        amount: 0,
        paymentDate: new Date().toISOString().split("T")[0],
        paymentPeriod: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
        isPaid: false
      });
    }
  }, [addSalaryDialogOpen]);

  useEffect(() => {
    if (!editSalaryDialogOpen) {
      setEditingSalary(null);
    }
  }, [editSalaryDialogOpen]);

  // Load employee salaries when an employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      const loadEmployeeSalaries = async () => {
        try {
          // Use the offline-aware API client
          const response = await api.get(`/api/employees/${selectedEmployee.id}/salaries`);
          
          if (response.error) {
            throw new Error(response.error.message || "Failed to load employee salaries");
          }
          
          if (response.data) {
            setEmployeeSalaries(response.data);
          } else {
            setEmployeeSalaries([]);
          }
          
          // Show offline mode toast if we're working offline
          if (response.offline) {
            toast.info("Loading salaries in offline mode. Data may not be up to date.");
          }
        } catch (error: any) {
          console.error("Error loading employee salaries:", error);
          toast.error(error.message || "An error occurred while loading employee salaries");
        }
      };

      loadEmployeeSalaries();
    } else {
      setEmployeeSalaries([]);
    }
  }, [selectedEmployee, isOnline]);

  // No need for net amount calculation with simplified salary model

  // Salary statistics
  const totalSalaries = salaries.reduce((sum, salary) => sum + salary.amount, 0);
  const averageSalary = employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.baseSalary, 0) / employees.length : 0;
  const activeSalaryCount = salaries.filter(s => s.isPaid).length;
  const pendingSalaryCount = salaries.filter(s => !s.isPaid).length;

  // Position distribution instead of department
  const positions: { [key: string]: number } = {};
  employees.forEach(emp => {
    if (emp.position) {
      positions[emp.position] = (positions[emp.position] || 0) + 1;
    }
  });

  const positionData = Object.entries(positions).map(([name, count]) => ({
    name,
    count
  }));

  // Online status is already defined at the top of the component
  
  // Handle add employee
  const handleAddEmployee = async () => {
    try {
      // Validate required fields
      if (!newEmployee.name) {
        toast.error("Employee name is required");
        return;
      }

      if (!newEmployee.position) {
        toast.error("Position is required");
        return;
      }

      // Department field has been removed in the simplified model

      if (!newEmployee.hireDate) {
        toast.error("Hire date is required");
        return;
      }

      if (!newEmployee.contact) {
        toast.error("Contact number is required");
        return;
      }

      if (!newEmployee.baseSalary || isNaN(Number(newEmployee.baseSalary)) || Number(newEmployee.baseSalary) < 0) {
        toast.error("Please enter a valid base salary");
        return;
      }

      const data = {
        ...newEmployee,
        baseSalary: Number(newEmployee.baseSalary || 0)
      };

      // Use the offline-aware API client
      const response = await api.post('/api/employees', data);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to add employee");
      }
      
      // Show appropriate message based on offline status
      const successMessage = response.offline
        ? "Employee will be added when you're back online."
        : "Employee added successfully.";
        
      toast.success(successMessage);
      
      if (response.data) {
        setEmployees(prev => [...prev, response.data]);
      }
      
      setAddEmployeeDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast.error(error.message || "An error occurred while adding the employee");
    }
  };

  // Handle update employee
  const handleUpdateEmployee = async () => {
    try {
      if (!editingEmployee || !editingEmployee.id) {
        toast.error("No employee selected for editing");
        return;
      }

      // Validate required fields
      if (!editingEmployee.name) {
        toast.error("Employee name is required");
        return;
      }

      if (!editingEmployee.position) {
        toast.error("Position is required");
        return;
      }

      // Department field has been removed in the simplified model

      if (!editingEmployee.baseSalary || isNaN(Number(editingEmployee.baseSalary)) || Number(editingEmployee.baseSalary) < 0) {
        toast.error("Please enter a valid base salary");
        return;
      }

      const data = {
        ...editingEmployee,
        baseSalary: typeof editingEmployee.baseSalary === 'string' 
          ? Number(editingEmployee.baseSalary) 
          : editingEmployee.baseSalary
      };

      // Use the offline-aware API client
      const response = await api.put(`/api/employees/${editingEmployee.id}`, data);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to update employee");
      }
      
      // Show appropriate message based on offline status
      const successMessage = response.offline
        ? "Employee will be updated when you're back online."
        : "Employee updated successfully.";
        
      toast.success(successMessage);
      
      if (response.data) {
        setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? response.data : emp));
        
        // If this was the selected employee, update that too
        if (selectedEmployee && selectedEmployee.id === editingEmployee.id) {
          setSelectedEmployee(response.data);
        }
      }
      
      setEditEmployeeDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating employee:", error);
      toast.error(error.message || "An error occurred while updating the employee");
    }
  };

  // Handle delete employee
  const handleDeleteEmployee = async () => {
    try {
      if (!selectedEmployee) {
        toast.error("No employee selected for deletion");
        return;
      }

      // Use the offline-aware API client
      const response = await api.delete(`/api/employees/${selectedEmployee.id}`);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to delete employee");
      }
      
      // Show appropriate message based on offline status
      const successMessage = response.offline
        ? "Employee will be deleted when you're back online."
        : "Employee deleted successfully.";
        
      toast.success(successMessage);
      
      // Update UI even if offline
      setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
      setDeleteConfirmDialogOpen(false);
      setViewEmployeeDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(error.message || "An error occurred while deleting the employee");
    }
  };

  // Handle add salary
  const handleAddSalary = async () => {
    try {
      // Validate required fields
      if (!newSalary.employeeId) {
        toast.error("Please select an employee");
        return;
      }

      if (!newSalary.amount || isNaN(Number(newSalary.amount)) || Number(newSalary.amount) <= 0) {
        toast.error("Please enter a valid salary amount");
        return;
      }

      if (!newSalary.paymentDate) {
        toast.error("Payment date is required");
        return;
      }

      if (!newSalary.paymentPeriod) {
        toast.error("Payment period is required");
        return;
      }

      const data = {
        ...newSalary,
        amount: Number(newSalary.amount)
      };

      // Use the offline-aware API client
      const response = await api.post('/api/salaries', data);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to add salary record");
      }
      
      // Show appropriate message based on offline status
      const successMessage = response.offline
        ? "Salary record will be added when you're back online."
        : "Salary record added successfully.";
        
      toast.success(successMessage);
      
      if (response.data) {
        setSalaries(prev => [...prev, response.data]);
        
        // If this was for the selected employee, update their salaries
        if (selectedEmployee && selectedEmployee.id === newSalary.employeeId) {
          setEmployeeSalaries(prev => [...prev, response.data]);
        }
      }
      
      setAddSalaryDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding salary:", error);
      toast.error(error.message || "An error occurred while adding the salary record");
    }
  };

  // Handle update salary
  const handleUpdateSalary = async () => {
    try {
      if (!editingSalary || !editingSalary.id) {
        toast.error("No salary record selected for editing");
        return;
      }

      // Validate required fields
      if (!editingSalary.amount || isNaN(Number(editingSalary.amount)) || Number(editingSalary.amount) <= 0) {
        toast.error("Please enter a valid salary amount");
        return;
      }

      if (!editingSalary.paymentDate) {
        toast.error("Payment date is required");
        return;
      }

      if (!editingSalary.paymentPeriod) {
        toast.error("Payment period is required");
        return;
      }

      const data = {
        ...editingSalary,
        amount: typeof editingSalary.amount === 'string' 
          ? Number(editingSalary.amount) 
          : editingSalary.amount
      };

      // Use the offline-aware API client
      const response = await api.put(`/api/salaries/${editingSalary.id}`, data);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to update salary record");
      }
      
      // Show appropriate message based on offline status
      const successMessage = response.offline
        ? "Salary record will be updated when you're back online."
        : "Salary record updated successfully.";
        
      toast.success(successMessage);
      
      if (response.data) {
        setSalaries(prev => prev.map(sal => sal.id === editingSalary.id ? response.data : sal));
        
        // If this was for the selected employee, update their salaries
        if (selectedEmployee && selectedEmployee.id === response.data.employeeId) {
          setEmployeeSalaries(prev => prev.map(sal => sal.id === editingSalary.id ? response.data : sal));
        }
        
        // If this was the selected salary, update that too
        if (selectedSalary && selectedSalary.id === editingSalary.id) {
          setSelectedSalary(response.data);
        }
      }
      
      setEditSalaryDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating salary:", error);
      toast.error(error.message || "An error occurred while updating the salary record");
    }
  };

  // Handle delete salary
  const handleDeleteSalary = async () => {
    try {
      if (!selectedSalary) {
        toast.error("No salary record selected for deletion");
        return;
      }

      // Use the offline-aware API client
      const response = await api.delete(`/api/salaries/${selectedSalary.id}`);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to delete salary record");
      }
      
      // Show appropriate message based on offline status
      const successMessage = response.offline
        ? "Salary record will be deleted when you're back online."
        : "Salary record deleted successfully.";
        
      toast.success(successMessage);
      
      // Update UI even if offline
      setSalaries(prev => prev.filter(sal => sal.id !== selectedSalary.id));
      
      // If this was for the selected employee, update their salaries
      if (selectedEmployee && selectedEmployee.id === selectedSalary.employeeId) {
        setEmployeeSalaries(prev => prev.filter(sal => sal.id !== selectedSalary.id));
      }
      
      setDeleteSalaryConfirmDialogOpen(false);
      setSelectedSalary(null);
    } catch (error: any) {
      console.error("Error deleting salary:", error);
      toast.error(error.message || "An error occurred while deleting the salary record");
    }
  };

  // Handle export employees to CSV
  const handleExportEmployeesCSV = async () => {
    // CSV export requires being online - it's a file download operation
    if (!isOnline) {
      toast.error("CSV export is only available when online");
      return;
    }
    
    try {
      // Use the API client for offline-aware operation
      const response = await api.get('/api/employees/export-csv');
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to export employees to CSV");
      }
      
      if (!response.data || response.offline) {
        toast.error("CSV export is not available offline");
        return;
      }
      
      // Create a download link
      const element = document.createElement("a");
      const file = new Blob([response.data.content], {type: 'text/csv'});
      element.href = URL.createObjectURL(file);
      element.download = response.data.filename || `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(element); // Required for Firefox
      element.click();
      document.body.removeChild(element);
      toast.success("Employees exported to CSV successfully");
    } catch (error: any) {
      console.error("Error exporting employees to CSV:", error);
      toast.error(error.message || "An error occurred while exporting employees to CSV");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center gap-2">
          {!isOnline && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center">
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
              Offline Mode
            </Badge>
          )}
          <span className="text-muted-foreground">
            {employees.length} employee{employees.length !== 1 ? 's' : ''} in system
          </span>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportEmployeesCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={addEmployeeDialogOpen} onOpenChange={setAddEmployeeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Enter the details for the new employee
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="position" className="text-right">
                    Position
                  </Label>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                {/* Department field has been removed in the simplified model */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hireDate" className="text-right">
                    Hire Date
                  </Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={newEmployee.hireDate}
                    onChange={(e) => setNewEmployee({ ...newEmployee, hireDate: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contact" className="text-right">
                    Contact
                  </Label>
                  <Input
                    id="contact"
                    value={newEmployee.contact}
                    onChange={(e) => setNewEmployee({ ...newEmployee, contact: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="baseSalary" className="text-right">
                    Base Salary
                  </Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    value={newEmployee.baseSalary}
                    onChange={(e) => setNewEmployee({ ...newEmployee, baseSalary: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                {/* Bank Account field has been removed in the simplified model */}
                {/* Tax ID field has been removed in the simplified model */}
                {/* Address field has been removed in the simplified model */}
                {/* Emergency Contact field has been removed in the simplified model */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isActive" className="text-right">
                    Active
                  </Label>
                  <div className="flex items-center col-span-3">
                    <Switch
                      id="isActive"
                      checked={newEmployee.isActive}
                      onCheckedChange={(checked) => setNewEmployee({ ...newEmployee, isActive: checked })}
                    />
                    <Label htmlFor="isActive" className="ml-2">
                      {newEmployee.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddEmployeeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleAddEmployee}>Add Employee</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="salaries">Salaries</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground">
                  {employees.filter(e => e.isActive).length} active, {employees.filter(e => !e.isActive).length} inactive
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Base Salary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(averageSalary)}</div>
                <p className="text-xs text-muted-foreground">
                  Per active employee
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Position Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(positions).length}</div>
                <p className="text-xs text-muted-foreground">
                  Different positions in organization
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Position distribution chart */}
          <Card>
            <CardHeader>
              <CardTitle>Position Distribution</CardTitle>
              <CardDescription>Employee count by position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {positionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={positionData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Employees" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No position data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employee listing */}
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>List of all employees in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      {/* Department column has been removed in the simplified model */}
                      <TableHead>Contact</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length > 0 ? (
                      employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          {/* Department cell has been removed in the simplified model */}
                          <TableCell>{employee.contact}</TableCell>
                          <TableCell>{formatCurrency(employee.baseSalary)}</TableCell>
                          <TableCell>
                            <Badge variant={employee.isActive ? "success" : "secondary"}>
                              {employee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setViewEmployeeDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingEmployee(employee);
                                  setEditEmployeeDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No employees found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* View Employee Dialog */}
          <Dialog open={viewEmployeeDialogOpen} onOpenChange={setViewEmployeeDialogOpen}>
            <DialogContent className="max-w-3xl">
              {selectedEmployee && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span>Employee Details</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingEmployee(selectedEmployee);
                            setEditEmployeeDialogOpen(true);
                            setViewEmployeeDialogOpen(false);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmDialogOpen(true)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="col-span-2 font-medium">{selectedEmployee.name}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-muted-foreground">Position:</span>
                          <span className="col-span-2">{selectedEmployee.position}</span>
                        </div>
                        {/* Department field has been removed in the simplified model */}
                        <div className="grid grid-cols-3">
                          <span className="text-muted-foreground">Hire Date:</span>
                          <span className="col-span-2">
                            {new Date(selectedEmployee.hireDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="col-span-2">
                            <Badge variant={selectedEmployee.isActive ? "success" : "secondary"}>
                              {selectedEmployee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-muted-foreground">Base Salary:</span>
                          <span className="col-span-2 font-medium">
                            {formatCurrency(selectedEmployee.baseSalary)}
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-medium mt-6 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="col-span-2">{selectedEmployee.email}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="col-span-2">{selectedEmployee.contact}</span>
                        </div>
                        {/* Address field has been removed in the simplified model */}
                        {/* Emergency Contact field has been removed in the simplified model */}
                      </div>
                      
                      {/* Payment Information section has been removed in the simplified model */}
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">Salary History</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewSalary(prev => ({
                              ...prev,
                              employeeId: selectedEmployee.id
                            }));
                            setAddSalaryDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Salary
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-[400px] pr-4">
                        {employeeSalaries.length > 0 ? (
                          <div className="space-y-4">
                            {employeeSalaries
                              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                              .map((salary) => (
                                <Card key={salary.id} className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h4 className="font-semibold">{salary.paymentPeriod}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        Payment date: {new Date(salary.paymentDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <Badge variant={salary.isPaid ? "success" : "outline"}>
                                      {salary.isPaid ? "Paid" : "Pending"}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                    <div>
                                      <span className="text-muted-foreground">Amount:</span>
                                      <span className="ml-2 font-bold">{formatCurrency(salary.amount)}</span>
                                    </div>
                                  </div>

                                  
                                  <div className="flex justify-end gap-2 mt-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedSalary(salary);
                                        setEditingSalary(salary);
                                        setEditSalaryDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => {
                                        setSelectedSalary(salary);
                                        setDeleteSalaryConfirmDialogOpen(true);
                                      }}
                                    >
                                      <Trash className="h-3 w-3 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            No salary records found for this employee
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Employee Dialog */}
          <Dialog open={editEmployeeDialogOpen} onOpenChange={setEditEmployeeDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Employee</DialogTitle>
                <DialogDescription>
                  Update the employee details
                </DialogDescription>
              </DialogHeader>
              {editingEmployee && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="edit-name"
                      value={editingEmployee.name}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-position" className="text-right">
                      Position
                    </Label>
                    <Input
                      id="edit-position"
                      value={editingEmployee.position}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  {/* Department field has been removed in the simplified model */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-hireDate" className="text-right">
                      Hire Date
                    </Label>
                    <Input
                      id="edit-hireDate"
                      type="date"
                      value={editingEmployee.hireDate?.toString().split('T')[0]}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, hireDate: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-contact" className="text-right">
                      Contact
                    </Label>
                    <Input
                      id="edit-contact"
                      value={editingEmployee.contact}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, contact: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingEmployee.email}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-baseSalary" className="text-right">
                      Base Salary
                    </Label>
                    <Input
                      id="edit-baseSalary"
                      type="number"
                      value={editingEmployee.baseSalary}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, baseSalary: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  {/* Bank Account field has been removed in the simplified model */}
                  {/* Tax ID field has been removed in the simplified model */}
                  {/* Address field has been removed in the simplified model */}
                  {/* Emergency Contact field has been removed in the simplified model */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-isActive" className="text-right">
                      Active
                    </Label>
                    <div className="flex items-center col-span-3">
                      <Switch
                        id="edit-isActive"
                        checked={editingEmployee.isActive}
                        onCheckedChange={(checked) => setEditingEmployee({ ...editingEmployee, isActive: checked })}
                      />
                      <Label htmlFor="edit-isActive" className="ml-2">
                        {editingEmployee.isActive ? 'Active' : 'Inactive'}
                      </Label>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditEmployeeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpdateEmployee}>Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Employee Confirmation Dialog */}
          <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this employee? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p>
                  This will permanently delete <strong>{selectedEmployee?.name}</strong> and their records from the system.
                </p>
                {employeeSalaries.length > 0 && (
                  <p className="mt-4 text-red-600">
                    Warning: This employee has {employeeSalaries.length} salary records that will also be deleted.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteConfirmDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={handleDeleteEmployee}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="salaries" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Salary Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalSalaries)}</div>
                <p className="text-xs text-muted-foreground">
                  All time
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Paid Salaries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSalaryCount}</div>
                <p className="text-xs text-muted-foreground">
                  Already processed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Salaries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingSalaryCount}</div>
                <p className="text-xs text-muted-foreground">
                  Waiting for payment
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(salaries.length > 0 ? totalSalaries / salaries.length : 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per salary record
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Salary Records</span>
                <Dialog open={addSalaryDialogOpen} onOpenChange={setAddSalaryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Salary
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Salary Record</DialogTitle>
                      <DialogDescription>
                        Create a new salary payment record
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="salary-employee" className="text-right">
                          Employee
                        </Label>
                        <Select
                          value={newSalary.employeeId}
                          onValueChange={(value) => setNewSalary({ ...newSalary, employeeId: value })}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.length > 0 ? (
                              employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-employees" disabled>
                                No employees available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="salary-amount" className="text-right">
                          Amount
                        </Label>
                        <Input
                          id="salary-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newSalary.amount}
                          onChange={(e) => setNewSalary({ ...newSalary, amount: Number(e.target.value) })}
                          className="col-span-3"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="salary-period" className="text-right">
                          Period
                        </Label>
                        <Input
                          id="salary-period"
                          value={newSalary.paymentPeriod}
                          onChange={(e) => setNewSalary({ ...newSalary, paymentPeriod: e.target.value })}
                          className="col-span-3"
                          placeholder="e.g., January 2023"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="salary-payment-date" className="text-right">
                          Payment Date
                        </Label>
                        <Input
                          id="salary-payment-date"
                          type="date"
                          value={newSalary.paymentDate}
                          onChange={(e) => setNewSalary({ ...newSalary, paymentDate: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="salary-is-paid" className="text-right">
                          Payment Status
                        </Label>
                        <div className="flex items-center col-span-3">
                          <Switch
                            id="salary-is-paid"
                            checked={newSalary.isPaid}
                            onCheckedChange={(checked) => setNewSalary({ ...newSalary, isPaid: checked })}
                          />
                          <Label htmlFor="salary-is-paid" className="ml-2">
                            {newSalary.isPaid ? 'Paid' : 'Pending'}
                          </Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setAddSalaryDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={handleAddSalary}>Add Salary</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                All salary records in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.length > 0 ? (
                      [...salaries]
                        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                        .map((salary) => {
                          const employee = employees.find(e => e.id === salary.employeeId);
                          return (
                            <TableRow key={salary.id}>
                              <TableCell className="font-medium">
                                {employee ? employee.name : 'Unknown Employee'}
                              </TableCell>
                              <TableCell>{salary.paymentPeriod}</TableCell>
                              <TableCell>
                                {new Date(salary.paymentDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <HoverCard>
                                  <HoverCardTrigger className="cursor-help underline decoration-dotted">
                                    {formatCurrency(salary.amount)}
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-60">
                                    <div className="space-y-1.5">
                                      <p className="text-sm font-bold">
                                        <span>Amount:</span> {formatCurrency(salary.amount)}
                                      </p>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              </TableCell>
                              <TableCell>
                                <Badge variant={salary.isPaid ? "success" : "outline"}>
                                  {salary.isPaid ? "Paid" : "Pending"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedSalary(salary);
                                      setEditingSalary(salary);
                                      setEditSalaryDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedSalary(salary);
                                      setDeleteSalaryConfirmDialogOpen(true);
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No salary records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Edit Salary Dialog */}
          <Dialog open={editSalaryDialogOpen} onOpenChange={setEditSalaryDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Salary Record</DialogTitle>
                <DialogDescription>
                  Update the salary payment details
                </DialogDescription>
              </DialogHeader>
              {editingSalary && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-salary-employee" className="text-right">
                      Employee
                    </Label>
                    <div className="col-span-3 font-medium">
                      {employees.find(e => e.id === editingSalary.employeeId)?.name || 'Unknown Employee'}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-salary-amount" className="text-right">
                      Amount
                    </Label>
                    <Input
                      id="edit-salary-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingSalary.amount}
                      onChange={(e) => setEditingSalary({ ...editingSalary, amount: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-salary-period" className="text-right">
                      Period
                    </Label>
                    <Input
                      id="edit-salary-period"
                      value={editingSalary.paymentPeriod}
                      onChange={(e) => setEditingSalary({ ...editingSalary, paymentPeriod: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-salary-payment-date" className="text-right">
                      Payment Date
                    </Label>
                    <Input
                      id="edit-salary-payment-date"
                      type="date"
                      value={editingSalary.paymentDate?.toString().split('T')[0]}
                      onChange={(e) => setEditingSalary({ ...editingSalary, paymentDate: e.target.value })}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-salary-is-paid" className="text-right">
                      Payment Status
                    </Label>
                    <div className="flex items-center col-span-3">
                      <Switch
                        id="edit-salary-is-paid"
                        checked={editingSalary.isPaid}
                        onCheckedChange={(checked) => setEditingSalary({ ...editingSalary, isPaid: checked })}
                      />
                      <Label htmlFor="edit-salary-is-paid" className="ml-2">
                        {editingSalary.isPaid ? 'Paid' : 'Pending'}
                      </Label>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditSalaryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpdateSalary}>Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Salary Confirmation Dialog */}
          <Dialog open={deleteSalaryConfirmDialogOpen} onOpenChange={setDeleteSalaryConfirmDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this salary record? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {selectedSalary && (
                <div className="py-4">
                  <p>
                    This will permanently delete the salary record for{' '}
                    <strong>
                      {employees.find(e => e.id === selectedSalary.employeeId)?.name || 'Unknown Employee'}
                    </strong>
                    {' '}for the period <strong>{selectedSalary.paymentPeriod}</strong>.
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteSalaryConfirmDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={handleDeleteSalary}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}