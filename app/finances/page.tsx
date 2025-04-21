import { FinancesPageClient } from "@/components/finances/finances-page-client";
import { getFinanceCategories, getFinanceRecords } from "@/lib/actions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finances - Mechanic Garage Management",
  description: "Income and Expense management for your garage business",
};

export default async function FinancesPage() {
  // Fetch initial finances data
  const categoriesResult = await getFinanceCategories();
  const recordsResult = await getFinanceRecords();

  const categories = categoriesResult.success ? categoriesResult.data : [];
  const records = recordsResult.success ? recordsResult.data : [];
  
  // Create empty default categories if needed
  const incomeCategories = categories.filter((cat: any) => cat.type === "income");
  const expenseCategories = categories.filter((cat: any) => cat.type === "expense");
  
  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Finances - Income & Expenses</h1>
      </div>
      
      <FinancesPageClient 
        initialCategories={categories} 
        initialRecords={records}
        initialIncomeCategories={incomeCategories}
        initialExpenseCategories={expenseCategories}
      />
    </div>
  );
}