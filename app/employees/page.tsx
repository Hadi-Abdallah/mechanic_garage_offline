import { EmployeesPageClient } from "@/components/employees/employees-page-client";
import { getEmployees, getSalaries } from "@/lib/actions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employees - Mechanic Garage Management",
  description: "Manage employees and salary information",
};

export default async function EmployeesPage() {
  // Fetch initial employees data
  const employeesResult = await getEmployees();
  const salariesResult = await getSalaries();

  const employees = employeesResult.success ? employeesResult.data : [];
  const salaries = salariesResult.success ? salariesResult.data : [];
  
  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Employees & Salaries</h1>
      </div>
      
      <EmployeesPageClient 
        initialEmployees={employees} 
        initialSalaries={salaries}
      />
    </div>
  );
}