"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { formatCurrency } from "@/lib/utils";

// Import the debug utilities
import { debugLog, debugError } from "@/lib/debug";

// Client actions
export async function getClients() {
  try {
    debugLog("Fetching all clients");
    const clients = await db.clients.getAll();
    return { success: true, data: clients };
  } catch (error) {
    debugError("Error fetching clients:", error);
    return { success: false, error: "Failed to fetch clients" };
  }
}

export async function getClientById(id: string) {
  try {
    const client = await db.clients.getById(id);
    return { success: true, data: client };
  } catch (error) {
    console.error(`Error fetching client ${id}:`, error);
    return { success: false, error: "Failed to fetch client" };
  }
}

export async function createClient(data: any) {
  try {
    debugLog("Creating client", data);
    const client = await db.clients.create(data);
    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error) {
    debugError("Error creating client:", error);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(id: string, data: any) {
  try {
    const client = await db.clients.update(id, data);
    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error(`Error updating client ${id}:`, error);
    return { success: false, error: "Failed to update client" };
  }
}

export async function updateClientField(
  id: string,
  field: string,
  value: string | number
) {
  try {
    debugLog(`Updating client field ${field} for client ${id}`, {
      field,
      value,
    });
    const client = await db.clients.getById(id);
    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const updateData = { [field]: value };
    const updatedClient = await db.clients.update(id, updateData);
    revalidatePath("/clients");
    return { success: true, data: updatedClient };
  } catch (error) {
    debugError(`Error updating client field ${field}:`, error);
    return { success: false, error: "Failed to update client field" };
  }
}

export async function deleteClient(id: string) {
  try {
    await db.clients.delete(id);
    revalidatePath("/clients");
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting client ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to delete client",
    };
  }
}

// Car actions
export async function getCars() {
  try {
    const cars = await db.cars.getAll();
    return { success: true, data: cars };
  } catch (error) {
    console.error("Error fetching cars:", error);
    return { success: false, error: "Failed to fetch cars" };
  }
}

export async function getCarByUin(uin: string) {
  try {
    const car = await db.cars.getByUin(uin);
    return { success: true, data: car };
  } catch (error) {
    console.error(`Error fetching car ${uin}:`, error);
    return { success: false, error: "Failed to fetch car" };
  }
}

export async function createCar(data: any) {
  try {
    // Debug logging to see what data we're receiving
    console.log("Creating car with data:", JSON.stringify(data));

    // Validate that data is provided
    if (!data) {
      throw new Error("Car data is required");
    }

    // Create a sanitized object with default values to prevent null access
    const sanitizedData: any = {
      uin: data.uin || "",
      licensePlate: data.licensePlate || "",
      make: data.make || "",
      model: data.model || "",
      year:
        typeof data.year === "number" ? data.year : new Date().getFullYear(),
      vin: data.vin || "",
      color: data.color || "",
      clientId: data.clientId || "",
      // Explicitly handle insuranceId: if "none" or falsy, use undefined
      insuranceId:
        data.insuranceId === "none" || !data.insuranceId
          ? undefined
          : data.insuranceId,
    };

    // Remove insuranceId property if it's undefined
    if (sanitizedData.insuranceId === undefined) {
      delete sanitizedData.insuranceId;
    }

    // Validate required fields
    const requiredFields = ["uin", "licensePlate", "make", "model", "clientId"];
    for (const field of requiredFields) {
      if (!sanitizedData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Ensure clientId exists if provided
    if (sanitizedData.clientId) {
      const clientExists = await db.clients.getById(sanitizedData.clientId);
      if (!clientExists) {
        throw new Error(
          `Client with ID ${sanitizedData.clientId} does not exist`
        );
      }
    }

    console.log("Sanitized car data:", JSON.stringify(sanitizedData));

    // Check if db and db.cars are available
    if (!db || !db.cars) {
      throw new Error("Database connection is not available");
    }

    // Check if a car with this UIN already exists
    try {
      const existingCar = await db.cars.getByUin(sanitizedData.uin);
      if (existingCar) {
        throw new Error(`Car with UIN ${sanitizedData.uin} already exists`);
      }
    } catch (checkError: any) {
      // If the error is not about the car existing, log it
      if (
        checkError.message &&
        !checkError.message.includes("already exists")
      ) {
        console.error("Error checking for existing car:", checkError);
      }
    }
    // Direct approach - attempt to insert full data
    let car;
    try {
      car = await db.cars.create(sanitizedData);
      revalidatePath("/cars");
      return { success: true, data: car };
    } catch (createError: any) {
      console.error("Error creating car:", createError);

      // Alternative approach - create a minimal car object first
      try {
        console.log("Trying alternative approach with minimal data");

        const minimalData: any = {
          uin: sanitizedData.uin,
          licensePlate: sanitizedData.licensePlate,
          make: sanitizedData.make,
          model: sanitizedData.model,
          clientId: sanitizedData.clientId,
        };

        car = await db.cars.create(minimalData);

        if (!car || !car.uin) {
          throw new Error("Minimal car insert failed: missing car identifier");
        }

        // Build updateData from additional fields, filtering out null, undefined, or empty strings
        const updateData = Object.fromEntries(
          Object.entries({
            year: sanitizedData.year,
            vin: sanitizedData.vin,
            color: sanitizedData.color,
            insuranceId: sanitizedData.insuranceId,
          }).filter(([_, v]) => v !== null && v !== undefined && v !== "")
        );

        // Only update if there's additional data
        if (Object.keys(updateData).length > 0) {
          // Update car using the uin string parameter
          await db.cars.update(car.uin, updateData);
        }

        revalidatePath("/cars");
        return { success: true, data: car };
      } catch (alternativeError: any) {
        console.error("Alternative approach failed:", alternativeError);
        throw new Error(
          `Failed to create car: ${alternativeError.message || "Unknown error"}`
        );
      }
    }
  } catch (error: any) {
    // Enhanced error logging
    console.error("Error creating car:", error);
    console.error("Error stack:", error.stack);
    return { success: false, error: error.message || "Failed to create car" };
  }
}

export async function updateCar(uin: string, data: any) {
  try {
    const car = await db.cars.update(uin, data);
    revalidatePath("/cars");
    return { success: true, data: car };
  } catch (error: any) {
    console.error(`Error updating car ${uin}:`, error);
    return { success: false, error: error.message || "Failed to update car" };
  }
}

export async function updateCarField(
  uin: string,
  field: string,
  value: string | number
) {
  try {
    const car = await db.cars.getByUin(uin);
    if (!car) {
      return { success: false, error: "Car not found" };
    }

    const updateData = { [field]: value };
    const updatedCar = await db.cars.update(uin, updateData);
    revalidatePath("/cars");
    return { success: true, data: updatedCar };
  } catch (error) {
    console.error(`Error updating car field ${field}:`, error);
    return { success: false, error: "Failed to update car field" };
  }
}

export async function deleteCar(uin: string) {
  try {
    await db.cars.delete(uin);
    revalidatePath("/cars");
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting car ${uin}:`, error);
    return { success: false, error: error.message || "Failed to delete car" };
  }
}

// Insurance actions
export async function getInsuranceCompanies() {
  try {
    const insurance = await db.insurance.getAll();
    return { success: true, data: insurance };
  } catch (error) {
    console.error("Error fetching insurance companies:", error);
    return { success: false, error: "Failed to fetch insurance companies" };
  }
}

export async function getInsuranceById(id: string) {
  try {
    const insurance = await db.insurance.getById(id);
    return { success: true, data: insurance };
  } catch (error) {
    console.error(`Error fetching insurance ${id}:`, error);
    return { success: false, error: "Failed to fetch insurance" };
  }
}

export async function createInsurance(data: any) {
  try {
    const insurance = await db.insurance.create(data);
    revalidatePath("/insurance");
    return { success: true, data: insurance };
  } catch (error) {
    console.error("Error creating insurance:", error);
    return { success: false, error: "Failed to create insurance" };
  }
}

export async function updateInsurance(id: string, data: any) {
  try {
    const insurance = await db.insurance.update(id, data);
    revalidatePath("/insurance");
    return { success: true, data: insurance };
  } catch (error) {
    console.error(`Error updating insurance ${id}:`, error);
    return { success: false, error: "Failed to update insurance" };
  }
}

export async function updateInsuranceField(
  id: string,
  field: string,
  value: string | number
) {
  try {
    const insurance = await db.insurance.getById(id);
    if (!insurance) {
      return { success: false, error: "Insurance not found" };
    }

    const updateData = { [field]: value };
    const updatedInsurance = await db.insurance.update(id, updateData);
    revalidatePath("/insurance");
    return { success: true, data: updatedInsurance };
  } catch (error) {
    console.error(`Error updating insurance field ${field}:`, error);
    return { success: false, error: "Failed to update insurance field" };
  }
}

export async function deleteInsurance(id: string) {
  try {
    await db.insurance.delete(id);
    revalidatePath("/insurance");
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting insurance ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to delete insurance",
    };
  }
}

// Service actions
export async function getServices() {
  try {
    const services = await db.services.getAll();
    return { success: true, data: services };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { success: false, error: "Failed to fetch services" };
  }
}

export async function getServiceById(id: string) {
  try {
    const service = await db.services.getById(id);
    return { success: true, data: service };
  } catch (error) {
    console.error(`Error fetching service ${id}:`, error);
    return { success: false, error: "Failed to fetch service" };
  }
}

export async function createService(data: any) {
  try {
    const service = await db.services.create(data);
    revalidatePath("/services");
    return { success: true, data: service };
  } catch (error) {
    console.error("Error creating service:", error);
    return { success: false, error: "Failed to create service" };
  }
}

export async function updateService(id: string, data: any) {
  try {
    const service = await db.services.update(id, data);
    revalidatePath("/services");
    return { success: true, data: service };
  } catch (error) {
    console.error(`Error updating service ${id}:`, error);
    return { success: false, error: "Failed to update service" };
  }
}

export async function updateServiceField(
  id: string,
  field: string,
  value: string | number
) {
  try {
    const service = await db.services.getById(id);
    if (!service) {
      return { success: false, error: "Service not found" };
    }

    const updateData = { [field]: value };
    const updatedService = await db.services.update(id, updateData);
    revalidatePath("/services");
    return { success: true, data: updatedService };
  } catch (error) {
    console.error(`Error updating service field ${field}:`, error);
    return { success: false, error: "Failed to update service field" };
  }
}

export async function deleteService(id: string) {
  try {
    await db.services.delete(id);
    revalidatePath("/services");
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting service ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to delete service",
    };
  }
}

// Product actions
export async function getProducts() {
  try {
    const products = await db.products.getAll();
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function getProductById(id: string) {
  try {
    const product = await db.products.getById(id);
    return { success: true, data: product };
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return { success: false, error: "Failed to fetch product" };
  }
}

export async function createProduct(data: any) {
  try {
    const product = await db.products.create(data);
    
    // Create finance expense record for initial inventory if stock is added
    const initialStock = (data.warehouseStock || 0) + (data.shopStock || 0);
    if (initialStock > 0) {
      // Use purchasePrice for expense calculation, fall back to price for backward compatibility
      const purchasePrice = data.purchasePrice;
      const totalCost = purchasePrice * initialStock;
      
      // Find or create expense category for inventory purchases
      let inventoryCategoryId = "";
      const categories = await db.financeCategories.getAll();
      const inventoryCategory = categories.find(
        (cat) => cat.type === "expense" && cat.name === "Inventory Purchases"
      );
      
      if (inventoryCategory) {
        inventoryCategoryId = inventoryCategory.id;
      } else {
        // Create a new category for inventory purchases
        const newCategory = await db.financeCategories.create({
          name: "Inventory Purchases",
          type: "expense",
          description: "Expenses for purchasing inventory and supplies",
          isDefault: true,
        });
        inventoryCategoryId = newCategory.id;
      }
      
      // Create the finance record for this inventory purchase
      await db.financeRecords.create({
        categoryId: inventoryCategoryId,
        amount: totalCost,
        description: `Initial inventory purchase: ${data.name} (${initialStock} units)`,
        date: new Date().toISOString().split('T')[0],
        relatedEntityType: "product",
        relatedEntityId: product.id,
        paymentMethod: "cash",
        notes: `Purchase price: ${formatCurrency(purchasePrice)} per unit`,
        createdBy: "System",
      });
    }
    
    revalidatePath("/products");
    return { success: true, data: product };
  } catch (error) {
    console.error("Error creating product:", error);
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProduct(id: string, data: any) {
  try {
    const product = await db.products.update(id, data);
    revalidatePath("/products");
    return { success: true, data: product };
  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
    return { success: false, error: "Failed to update product" };
  }
}

export async function updateProductField(
  id: string,
  field: string,
  value: string | number
) {
  try {
    const product = await db.products.getById(id);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Keep track of the old value to check if inventory increased
    const oldValue = product[field];
    
    // Create the update data
    const updateData = { [field]: value };
    
    // Process the update
    const updatedProduct = await db.products.update(id, updateData);
    
    // Create finance records for inventory changes
    if (field === 'warehouseStock' || field === 'shopStock') {
      // Calculate the change in inventory
      const oldStock = Number(oldValue) || 0;
      const newStock = Number(value) || 0;
      const stockChange = newStock - oldStock;
      
      // Only create finance records for positive inventory changes (purchases)
      if (stockChange > 0) {
        // Use purchasePrice for expense calculation
        const purchasePrice = product.purchasePrice;
        const totalCost = purchasePrice * stockChange;
        
        // Create finance expense record
        const location = field === 'warehouseStock' ? 'warehouse' : 'shop';
        await createInventoryExpenseRecord(
          product, 
          stockChange, 
          totalCost, 
          location
        );
      }
      // NOTE: Stock reductions through direct updates don't create finance records
      // because they should be handled through maintenance or explicit adjustments
    }
    
    revalidatePath("/products");
    return { success: true, data: updatedProduct };
  } catch (error) {
    console.error(`Error updating product field ${field}:`, error);
    return { success: false, error: "Failed to update product field" };
  }
}

export async function deleteProduct(id: string) {
  try {
    await db.products.delete(id);
    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting product ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to delete product",
    };
  }
}

export async function transferStock(
  id: string,
  quantity: number,
  from: "warehouse" | "shop",
  to: "warehouse" | "shop"
) {
  try {
    // Get the product before transferring stock to access current data
    const oldProduct = await db.products.getById(id);
    if (!oldProduct) {
      return { success: false, error: "Product not found" };
    }
    
    // Perform the transfer
    const product = await db.products.transferStock(id, quantity, from, to);
    
    // If this is adding new inventory (not just transferring existing stock)
    // We consider it new inventory when the source is neither warehouse nor shop
    if (from === "shop" && to === "warehouse" && quantity < 0) {
      // This is a stock increase in warehouse (negative transfer from shop to warehouse)
      const actualQuantity = Math.abs(quantity);
      
      // Use purchasePrice for expense calculation, fall back to price for backward compatibility
      const purchasePrice = product.purchasePrice;
      const totalCost = purchasePrice * actualQuantity;
      
      // Create a finance expense record
      await createInventoryExpenseRecord(product, actualQuantity, totalCost, "warehouse");
    } 
    else if (from === "warehouse" && to === "shop" && quantity < 0) {
      // This is a stock increase in shop (negative transfer from warehouse to shop)
      const actualQuantity = Math.abs(quantity);
      
      // Use purchasePrice for expense calculation, fall back to price for backward compatibility
      const purchasePrice = product.purchasePrice;
      const totalCost = purchasePrice * actualQuantity;
      
      // Create a finance expense record
      await createInventoryExpenseRecord(product, actualQuantity, totalCost, "shop");
    }
    
    revalidatePath("/products");
    return { success: true, data: product };
  } catch (error: any) {
    console.error(`Error transferring stock for product ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to transfer stock",
    };
  }
}

// Helper function to create inventory expense records
async function createInventoryExpenseRecord(
  product: any, 
  quantity: number, 
  totalCost: number,
  location: "warehouse" | "shop"
) {
  try {
    // Find or create expense category for inventory purchases
    let inventoryCategoryId = "";
    const categories = await db.financeCategories.getAll();
    const inventoryCategory = categories.find(
      (cat) => cat.type === "expense" && cat.name === "Inventory Purchases"
    );
    
    if (inventoryCategory) {
      inventoryCategoryId = inventoryCategory.id;
    } else {
      // Create a new category for inventory purchases
      const newCategory = await db.financeCategories.create({
        name: "Inventory Purchases",
        type: "expense",
        description: "Expenses for purchasing inventory and supplies",
        isDefault: true,
      });
      inventoryCategoryId = newCategory.id;
    }
    
    // Get supplier info if available
    let supplierInfo = "";
    if (product.supplierId) {
      try {
        const supplier = await db.suppliers.getById(product.supplierId);
        if (supplier) {
          supplierInfo = ` from ${supplier.name}`;
        }
      } catch (supplierError) {
        console.error("Error getting supplier details:", supplierError);
      }
    }
    
    // Create the finance record for this inventory purchase
    await db.financeRecords.create({
      categoryId: inventoryCategoryId,
      amount: totalCost,
      description: `Inventory purchase: ${product.name} (${quantity} units) for ${location}${supplierInfo}`,
      date: new Date().toISOString().split('T')[0],
      relatedEntityType: "product",
      relatedEntityId: product.id,
      paymentMethod: "cash",
      notes: `Purchase price: ${formatCurrency(product.purchasePrice)} per unit`,
      createdBy: "System",
    });
    
    return true;
  } catch (error) {
    console.error("Error creating inventory expense record:", error);
    return false;
  }
}

// Function to handle inventory adjustments with financial records
export async function adjustInventory(
  productId: string,
  adjustmentData: {
    warehouseAdjustment?: number;
    shopAdjustment?: number;
    reason: string;
    isExpense: boolean;
  }
) {
  try {
    const product = await db.products.getById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }
    
    const { warehouseAdjustment = 0, shopAdjustment = 0, reason, isExpense } = adjustmentData;
    
    // Validate adjustments
    if (warehouseAdjustment === 0 && shopAdjustment === 0) {
      return { success: false, error: "No adjustment specified" };
    }
    
    // Process warehouse adjustment
    if (warehouseAdjustment !== 0) {
      const newWarehouseStock = Math.max(0, product.warehouseStock + warehouseAdjustment);
      await db.products.update(productId, { warehouseStock: newWarehouseStock });
    }
    
    // Process shop adjustment
    if (shopAdjustment !== 0) {
      const newShopStock = Math.max(0, product.shopStock + shopAdjustment);
      await db.products.update(productId, { shopStock: newShopStock });
    }
    
    // Calculate total adjustment
    const totalAdjustment = warehouseAdjustment + shopAdjustment;
    
    // Create finance record for adjustments if needed
    if (isExpense && totalAdjustment > 0) {
      // This is a purchase, create expense record
      const purchasePrice = product.purchasePrice;
      const totalCost = purchasePrice * totalAdjustment;
      
      // Determine location based on which stock was adjusted more
      const location = warehouseAdjustment >= shopAdjustment ? "warehouse" : "shop";
      await createInventoryExpenseRecord(product, totalAdjustment, totalCost, location);
    } else if (!isExpense && totalAdjustment < 0) {
      // This is a write-off or adjustment reducing stock, create an adjustment record
      
      // Find or create adjustment category
      let adjustmentCategoryId = "";
      const categories = await db.financeCategories.getAll();
      const adjustmentCategory = categories.find(
        (cat) => cat.type === "expense" && cat.name === "Inventory Adjustments"
      );
      
      if (adjustmentCategory) {
        adjustmentCategoryId = adjustmentCategory.id;
      } else {
        // Create a new category for inventory adjustments
        const newCategory = await db.financeCategories.create({
          name: "Inventory Adjustments",
          type: "expense",
          description: "Stock adjustments, write-offs and corrections",
          isDefault: true,
        });
        adjustmentCategoryId = newCategory.id;
      }
      
      // Calculate the cost of the reduced inventory using purchase price
      const purchasePrice = product.purchasePrice;
      const adjustmentAmount = Math.abs(totalAdjustment) * purchasePrice;
      
      // Create the adjustment record
      await db.financeRecords.create({
        categoryId: adjustmentCategoryId,
        amount: adjustmentAmount,
        description: `Inventory adjustment: ${product.name} (${Math.abs(totalAdjustment)} units)`,
        date: new Date().toISOString().split('T')[0],
        relatedEntityType: "product",
        relatedEntityId: productId,
        notes: `Reason: ${reason}`,
        createdBy: "System",
      });
    }
    
    // Update paths
    revalidatePath("/products");
    revalidatePath("/finances");
    
    return { 
      success: true, 
      data: {
        productId,
        warehouseAdjustment,
        shopAdjustment,
        totalAdjustment
      }
    };
    
  } catch (error: any) {
    console.error(`Error adjusting inventory for product ${productId}:`, error);
    return {
      success: false,
      error: error.message || "Failed to adjust inventory"
    };
  }
}

// Supplier actions
export async function getSuppliers() {
  try {
    const suppliers = await db.suppliers.getAll();
    return { success: true, data: suppliers };
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return { success: false, error: "Failed to fetch suppliers" };
  }
}

export async function getSupplierById(id: string) {
  try {
    const supplier = await db.suppliers.getById(id);
    return { success: true, data: supplier };
  } catch (error) {
    console.error(`Error fetching supplier ${id}:`, error);
    return { success: false, error: "Failed to fetch supplier" };
  }
}

export async function createSupplier(data: any) {
  try {
    const supplier = await db.suppliers.create(data);
    revalidatePath("/suppliers");
    return { success: true, data: supplier };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return { success: false, error: "Failed to create supplier" };
  }
}

export async function updateSupplier(id: string, data: any) {
  try {
    const supplier = await db.suppliers.update(id, data);
    revalidatePath("/suppliers");
    return { success: true, data: supplier };
  } catch (error) {
    console.error(`Error updating supplier ${id}:`, error);
    return { success: false, error: "Failed to update supplier" };
  }
}

export async function updateSupplierField(
  id: string,
  field: string,
  value: string | number
) {
  try {
    const supplier = await db.suppliers.getById(id);
    if (!supplier) {
      return { success: false, error: "Supplier not found" };
    }

    const updateData = { [field]: value };
    const updatedSupplier = await db.suppliers.update(id, updateData);
    revalidatePath("/suppliers");
    return { success: true, data: updatedSupplier };
  } catch (error) {
    console.error(`Error updating supplier field ${field}:`, error);
    return { success: false, error: "Failed to update supplier field" };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await db.suppliers.delete(id);
    revalidatePath("/suppliers");
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting supplier ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to delete supplier",
    };
  }
}

// Maintenance actions
export async function getMaintenanceRequests() {
  try {
    console.log("Fetching all maintenance requests");

    let requests;
    try {
      requests = await db.maintenance.getAll();
      console.log(
        "Raw maintenance data type:",
        typeof requests,
        Array.isArray(requests) ? "is array" : "not an array"
      );

      // If requests is not an array, try to convert it
      if (!Array.isArray(requests)) {
        console.warn(
          "db.maintenance.getAll() did not return an array:",
          requests
        );

        // If requests is an object with data property that's an array, use that
        if (
          requests &&
          typeof requests === "object" &&
          "data" in requests &&
          Array.isArray(requests.data)
        ) {
          console.log("Using requests.data as it's an array");
          requests = requests.data;
        } else {
          // Otherwise, use an empty array
          console.warn("Converting requests to empty array");
          requests = [];
        }
      }
    } catch (error) {
      console.error("Error in db.maintenance.getAll():", error);
      return {
        success: false,
        error:
          "Database error: " +
          (error instanceof Error ? error.message : String(error)),
        data: [],
      };
    }

    console.log(`Successfully fetched ${requests.length} maintenance requests`);
    return { success: true, data: requests };
  } catch (error) {
    console.error("Error fetching maintenance requests:", error);
    return {
      success: false,
      error:
        "Failed to fetch maintenance requests: " +
        (error instanceof Error ? error.message : String(error)),
      data: [],
    };
  }
}

export async function getMaintenanceById(id: string) {
  try {
    const request = await db.maintenance.getById(id);
    return { success: true, data: request };
  } catch (error) {
    console.error(`Error fetching maintenance request ${id}:`, error);
    return { success: false, error: "Failed to fetch maintenance request" };
  }
}

export async function createMaintenanceRequest(data: any) {
  try {
    // Create the maintenance request
    const request = await db.maintenance.create(data);
    
    // In this simplified model, we don't create expense records for using products in maintenance
    // Products are already counted as expenses when purchased
    
    revalidatePath("/maintenance");
    revalidatePath("/finances");
    return { success: true, data: request };
  } catch (error: any) {
    console.error("Error creating maintenance request:", error);
    return {
      success: false,
      error: error.message || "Failed to create maintenance request",
    };
  }
}

export async function updateMaintenanceRequest(id: string, data: any) {
  try {
    // Get the original request to compare product changes
    const originalRequest = await db.maintenance.getById(id);
    
    // Update the maintenance request
    const updatedRequest = await db.maintenance.update(id, data);
    
    // In this simplified model, we don't create additional expense records for product changes
    // Products are already counted as expenses when purchased
    
    revalidatePath("/maintenance");
    revalidatePath("/finances");
    return { success: true, data: updatedRequest };
  } catch (error: any) {
    console.error(`Error updating maintenance request ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to update maintenance request",
    };
  }
}

export async function deleteMaintenanceRequest(id: string) {
  try {
    await db.maintenance.delete(id);
    revalidatePath("/maintenance");
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting maintenance request ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to delete maintenance request",
    };
  }
}

export async function makePayment(id: string, amount: number) {
  try {
    // Get maintenance request details before payment
    const maintenanceRequest = await db.maintenance.getById(id);
    if (!maintenanceRequest) {
      return { success: false, error: "Maintenance request not found" };
    }

    // Make payment in the maintenance system
    const updatedRequest = await db.maintenance.makePayment(id, amount);
    
    // Create a finance record for this payment
    try {
      // Find or create income category for maintenance payments
      let maintenanceCategoryId = "";
      const categories = await db.financeCategories.getAll();
      const maintenanceCategory = categories.find(
        (cat) => cat.type === "income" && cat.name === "Maintenance Payments"
      );
      
      if (maintenanceCategory) {
        maintenanceCategoryId = maintenanceCategory.id;
      } else {
        // Create a new category for maintenance payments
        const newCategory = await db.financeCategories.create({
          name: "Maintenance Payments",
          type: "income",
          description: "Income from garage maintenance services",
          isDefault: true,
        });
        maintenanceCategoryId = newCategory.id;
      }

      // Get client and car details for the description
      let clientName = "Unknown Client";
      let carDetails = "Unknown Vehicle";
      
      try {
        const client = await db.clients.getById(maintenanceRequest.clientId);
        if (client) {
          clientName = client.name;
        }
        
        const car = await db.cars.getByUin(maintenanceRequest.carUin);
        if (car) {
          carDetails = `${car.make} ${car.model} (${car.licensePlate})`;
        }
      } catch (detailsError) {
        console.error("Error getting client/car details:", detailsError);
      }
      
      // Create the finance record for this payment
      await db.financeRecords.create({
        categoryId: maintenanceCategoryId,
        amount: amount,
        description: `Payment for maintenance #${id.slice(0, 8)} - ${clientName} - ${carDetails}`,
        date: new Date().toISOString().split('T')[0], // Current date
        relatedEntityType: "maintenance",
        relatedEntityId: id,
        paymentMethod: "cash", // Default to cash, can be updated later
        notes: `Payment for maintenance with total cost: ${formatCurrency(maintenanceRequest.totalCost)}`,
        createdBy: "System"
      });
      
    } catch (financeError) {
      console.error(`Error creating finance record for maintenance payment ${id}:`, financeError);
      // Continue with the payment process even if finance record creation fails
    }
    
    revalidatePath("/maintenance");
    revalidatePath("/finances");
    return { success: true, data: updatedRequest };
  } catch (error: any) {
    console.error(`Error making payment for maintenance request ${id}:`, error);
    return { success: false, error: error.message || "Failed to make payment" };
  }
}

// Log actions
// Update the getLogs function to include better error handling and logging

export async function getLogs() {
  try {
    console.log("Fetching all logs");

    // Get logs from the database
    let logs;
    try {
      logs = await db.logs.getAll();
      console.log(
        "Raw logs data type:",
        typeof logs,
        Array.isArray(logs) ? "is array" : "not an array"
      );

      // If logs is not an array, try to convert it or create an empty array
      if (!Array.isArray(logs)) {
        console.warn("db.logs.getAll() did not return an array:", logs);

        // If logs is an object with data property that's an array, use that
        if (
          logs &&
          typeof logs === "object" &&
          "data" in logs &&
          Array.isArray(logs.data)
        ) {
          console.log("Using logs.data as it's an array");
          logs = logs.data;
        } else {
          // Otherwise, use an empty array
          console.warn("Converting logs to empty array");
          logs = [];
        }
      }
    } catch (error) {
      console.error("Error in db.logs.getAll():", error);
      logs = [];
    }

    console.log(`Working with ${logs.length} logs`);

    // Enrich logs with related entity names - only if logs is an array
    const enrichedLogs = Array.isArray(logs)
      ? await Promise.all(
          logs.map(async (log) => {
            const enrichedLog = { ...log };

            // Add client name if clientId exists
            if (log.clientId) {
              try {
                const client = await db.clients.getById(log.clientId);
                if (client) {
                  enrichedLog.clientName = client.name;
                }
              } catch (error) {
                console.error(
                  `Error fetching client for log: ${log.id}`,
                  error
                );
              }
            }

            // Add car details if carUin exists
            if (log.carUin) {
              try {
                const car = await db.cars.getByUin(log.carUin);
                if (car) {
                  enrichedLog.carDetails = `${car.make} ${car.model} (${car.licensePlate})`;
                }
              } catch (error) {
                console.error(`Error fetching car for log: ${log.id}`, error);
              }
            }

            // Add insurance name if insuranceId exists
            if (log.insuranceId) {
              try {
                const insurance = await db.insurance.getById(log.insuranceId);
                if (insurance) {
                  enrichedLog.insuranceName = insurance.name;
                }
              } catch (error) {
                console.error(
                  `Error fetching insurance for log: ${log.id}`,
                  error
                );
              }
            }

            // Add service name if serviceId exists
            if (log.serviceId) {
              try {
                const service = await db.services.getById(log.serviceId);
                if (service) {
                  enrichedLog.serviceName = service.name;
                }
              } catch (error) {
                console.error(
                  `Error fetching service for log: ${log.id}`,
                  error
                );
              }
            }

            // Add product name if productId exists
            if (log.productId) {
              try {
                const product = await db.products.getById(log.productId);
                if (product) {
                  enrichedLog.productName = product.name;
                }
              } catch (error) {
                console.error(
                  `Error fetching product for log: ${log.id}`,
                  error
                );
              }
            }

            return enrichedLog;
          })
        )
      : [];

    return { success: true, data: enrichedLogs };
  } catch (error) {
    console.error("Error fetching logs:", error);
    return {
      success: false,
      error:
        "Failed to fetch logs: " +
        (error instanceof Error ? error.message : String(error)),
      data: [],
    };
  }
}

export async function getFilteredLogs(filters: any) {
  try {
    const logs = await db.logs.getFiltered(filters);
    return { success: true, data: logs };
  } catch (error) {
    console.error("Error fetching filtered logs:", error);
    return { success: false, error: "Failed to fetch filtered logs" };
  }
}

export async function getLogsByDateRange(startDate: string, endDate: string) {
  try {
    let logs;
    try {
      logs = await db.logs.getByDateRange(startDate, endDate);

      // If logs is not an array, handle it
      if (!Array.isArray(logs)) {
        console.warn("db.logs.getByDateRange did not return an array:", logs);

        // If logs is an object with data property that's an array, use that
        if (
          logs &&
          typeof logs === "object" &&
          "data" in logs &&
          Array.isArray(logs.data)
        ) {
          logs = logs.data;
        } else {
          // Otherwise, use an empty array
          logs = [];
        }
      }
    } catch (error) {
      console.error(
        `Error in db.logs.getByDateRange(${startDate}, ${endDate}):`,
        error
      );
      logs = [];
    }

    // Enrich logs with related entity names (same as above)
    const enrichedLogs = Array.isArray(logs)
      ? await Promise.all(
          logs.map(async (log) => {
            const enrichedLog = { ...log };

            // Add client name if clientId exists
            if (log.clientId) {
              try {
                const client = await db.clients.getById(log.clientId);
                if (client) {
                  enrichedLog.clientName = client.name;
                }
              } catch (error) {
                console.error(
                  `Error fetching client for log: ${log.id}`,
                  error
                );
              }
            }

            // Add car details if carUin exists
            if (log.carUin) {
              try {
                const car = await db.cars.getByUin(log.carUin);
                if (car) {
                  enrichedLog.carDetails = `${car.make} ${car.model} (${car.licensePlate})`;
                }
              } catch (error) {
                console.error(`Error fetching car for log: ${log.id}`, error);
              }
            }

            // Add insurance name if insuranceId exists
            if (log.insuranceId) {
              try {
                const insurance = await db.insurance.getById(log.insuranceId);
                if (insurance) {
                  enrichedLog.insuranceName = insurance.name;
                }
              } catch (error) {
                console.error(
                  `Error fetching insurance for log: ${log.id}`,
                  error
                );
              }
            }

            // Add service name if serviceId exists
            if (log.serviceId) {
              try {
                const service = await db.services.getById(log.serviceId);
                if (service) {
                  enrichedLog.serviceName = service.name;
                }
              } catch (error) {
                console.error(
                  `Error fetching service for log: ${log.id}`,
                  error
                );
              }
            }

            // Add product name if productId exists
            if (log.productId) {
              try {
                const product = await db.products.getById(log.productId);
                if (product) {
                  enrichedLog.productName = product.name;
                }
              } catch (error) {
                console.error(
                  `Error fetching product for log: ${log.id}`,
                  error
                );
              }
            }

            return enrichedLog;
          })
        )
      : [];

    return { success: true, data: enrichedLogs };
  } catch (error) {
    console.error(
      `Error fetching logs between ${startDate} and ${endDate}:`,
      error
    );
    return {
      success: false,
      error: "Failed to fetch logs by date range",
      data: [],
    };
  }
}

// Add a new function to get maintenance requests with enriched data
export async function getEnrichedMaintenanceRequests() {
  try {
    let requests;
    try {
      requests = await db.maintenance.getAll();

      // If requests is not an array, handle it
      if (!Array.isArray(requests)) {
        console.warn(
          "db.maintenance.getAll did not return an array:",
          requests
        );

        // If requests is an object with data property that's an array, use that
        if (
          requests &&
          typeof requests === "object" &&
          "data" in requests &&
          Array.isArray(requests.data)
        ) {
          requests = requests.data;
        } else {
          // Otherwise, use an empty array
          requests = [];
        }
      }
    } catch (error) {
      console.error("Error in db.maintenance.getAll():", error);
      requests = [];
    }

    // Enrich maintenance requests with related data
    const enrichedRequests = Array.isArray(requests)
      ? await Promise.all(
          requests.map(async (request) => {
            try {
              const client = await db.clients.getById(request.clientId);
              const car = await db.cars.getByUin(request.carUin);

              // Get service details
              const serviceDetails = Array.isArray(request.servicesUsed)
                ? await Promise.all(
                    request.servicesUsed.map(async (serviceUsed) => {
                      try {
                        const service = await db.services.getById(
                          serviceUsed.serviceId
                        );
                        return {
                          ...serviceUsed,
                          name: service?.name || "Unknown Service",
                          cost: service
                            ? service.standardFee * serviceUsed.quantity
                            : 0,
                        };
                      } catch (error) {
                        console.error(
                          `Error processing service details for ${serviceUsed.serviceId}:`,
                          error
                        );
                        return {
                          ...serviceUsed,
                          name: "Unknown Service",
                          cost: 0,
                        };
                      }
                    })
                  )
                : [];

              // Get product details
              const productDetails = Array.isArray(request.productsUsed)
                ? await Promise.all(
                    request.productsUsed.map(async (productUsed) => {
                      try {
                        const product = await db.products.getById(
                          productUsed.productId
                        );
                        return {
                          ...productUsed,
                          name: product?.name || "Unknown Product",
                          // Use salePrice for customer charges, fall back to price for backward compatibility
                          unitPrice: product?.salePrice || 0,
                          cost: product
                            ? (product?.salePrice || 0) * productUsed.quantity
                            : 0,
                        };
                      } catch (error) {
                        console.error(
                          `Error processing product details for ${productUsed.productId}:`,
                          error
                        );
                        return {
                          ...productUsed,
                          name: "Unknown Product",
                          unitPrice: 0,
                          cost: 0,
                        };
                      }
                    })
                  )
                : [];

              return {
                ...request,
                clientName: client?.name || "Unknown Client",
                carDetails: car
                  ? `${car.make} ${car.model} (${car.licensePlate})`
                  : "Unknown Car",
                serviceDetails,
                productDetails,
              };
            } catch (error) {
              console.error(
                `Error enriching maintenance request ${request.id}:`,
                error
              );
              return {
                ...request,
                clientName: "Unknown Client",
                carDetails: "Unknown Car",
                serviceDetails: [],
                productDetails: [],
              };
            }
          })
        )
      : [];

    return { success: true, data: enrichedRequests };
  } catch (error) {
    console.error("Error fetching enriched maintenance requests:", error);
    return {
      success: false,
      error: "Failed to fetch maintenance requests with details",
      data: [],
    };
  }
}

// Add client cars relationship data
export async function getClientWithCars(id: string) {
  try {
    const client = await db.clients.getById(id);
    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const cars = await db.cars.getByClientId(id);

    // For each car, get its maintenance history count
    const carsWithMaintenanceCount = await Promise.all(
      cars.map(async (car) => {
        const maintenance = await db.maintenance.getByCarUin(car.uin);
        return {
          ...car,
          maintenanceCount: maintenance.length,
        };
      })
    );

    // Get total spent by client
    const maintenanceRequests = await db.maintenance.getByClientId(id);
    const totalSpent = maintenanceRequests.reduce(
      (sum, req) => sum + req.totalCost,
      0
    );
    const outstandingBalance = maintenanceRequests.reduce(
      (sum, req) => sum + req.remainingBalance,
      0
    );

    return {
      success: true,
      data: {
        client,
        cars: carsWithMaintenanceCount,
        stats: {
          carCount: cars.length,
          maintenanceCount: maintenanceRequests.length,
          totalSpent,
          outstandingBalance,
        },
      },
    };
  } catch (error) {
    console.error(`Error fetching client with cars: ${id}`, error);
    return { success: false, error: "Failed to fetch client with cars" };
  }
}

export async function getClientWithRequests(id: string) {
  try {
    const client = await db.clients.getById(id);
    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const maintenanceRequests = await db.maintenance.getByClientId(id);

    // Get the cars associated with the requests
    const uniqueCarUins = [...new Set(maintenanceRequests.map(req => req.carUin))];
    const cars = await Promise.all(uniqueCarUins.map(uin => db.cars.getByUin(uin)));

    // Enrich maintenance requests with car details
    const enrichedRequests = await Promise.all(
      maintenanceRequests.map(async (request) => {
        const car = cars.find(c => c?.uin === request.carUin);
        return {
          ...request,
          carDetails: car ? `${car.make} ${car.model} (${car.licensePlate})` : request.carUin
        };
      })
    );

    // Calculate statistics
    const totalSpent = maintenanceRequests.reduce(
      (sum, req) => sum + req.totalCost,
      0
    );
    const outstandingBalance = maintenanceRequests.reduce(
      (sum, req) => sum + req.remainingBalance,
      0
    );

    // Count requests by status
    const statusCounts = maintenanceRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count requests by payment status
    const paymentStatusCounts = maintenanceRequests.reduce((acc, req) => {
      acc[req.paymentStatus] = (acc[req.paymentStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        client,
        maintenanceRequests: enrichedRequests,
        stats: {
          totalRequests: maintenanceRequests.length,
          uniqueCars: uniqueCarUins.length,
          totalSpent,
          outstandingBalance,
          statusCounts,
          paymentStatusCounts,
          averageRequestCost: maintenanceRequests.length > 0 
            ? totalSpent / maintenanceRequests.length 
            : 0
        },
      },
    };
  } catch (error) {
    console.error(`Error fetching client with maintenance requests: ${id}`, error);
    return { success: false, error: "Failed to fetch client with maintenance requests" };
  }
}

// Add a function to get a car with its maintenance history
export async function getCarWithMaintenanceHistory(uin: string) {
  try {
    const car = await db.cars.getByUin(uin);
    if (!car) {
      return { success: false, error: "Car not found" };
    }

    const maintenanceHistory = await db.maintenance.getByCarUin(uin);
    const client = await db.clients.getById(car.clientId);

    // Get insurance details if applicable
    let insurance = null;
    if (car.insuranceId) {
      insurance = await db.insurance.getById(car.insuranceId);
    }

    // Enrich maintenance history with more details
    const enrichedHistory = await Promise.all(
      maintenanceHistory.map(async (request) => {
        const serviceDetails = await Promise.all(
          request.servicesUsed.map(async (serviceUsed) => {
            const service = await db.services.getById(serviceUsed.serviceId);
            return {
              ...serviceUsed,
              name: service?.name || "Unknown Service",
              cost: service ? service.standardFee * serviceUsed.quantity : 0,
            };
          })
        );

        const productDetails = await Promise.all(
          request.productsUsed.map(async (productUsed) => {
            const product = await db.products.getById(productUsed.productId);
            return {
              ...productUsed,
              name: product?.name || "Unknown Product",
              // Use salePrice for customer charges, fall back to price for backward compatibility
              cost: product ? (product.salePrice) * productUsed.quantity : 0,
            };
          })
        );

        return {
          ...request,
          serviceDetails,
          productDetails,
        };
      })
    );

    return {
      success: true,
      data: {
        car,
        client: client || { name: "Unknown Client" },
        insurance,
        maintenanceHistory: enrichedHistory,
        stats: {
          maintenanceCount: maintenanceHistory.length,
          totalCost: maintenanceHistory.reduce(
            (sum, req) => sum + req.totalCost,
            0
          ),
          outstandingBalance: maintenanceHistory.reduce(
            (sum, req) => sum + req.remainingBalance,
            0
          ),
        },
      },
    };
  } catch (error) {
    console.error(`Error fetching car with maintenance history: ${uin}`, error);
    return {
      success: false,
      error: "Failed to fetch car with maintenance history",
    };
  }
}

// Add a similar function for supplier with their products
export async function getSupplierWithProducts(id: string) {
  try {
    const supplier = await db.suppliers.getById(id);
    if (!supplier) {
      return { success: false, error: "Supplier not found" };
    }

    const products = await db.products.getAll();
    const supplierProducts = products.filter(
      (product) => product.supplierId === id
    );

    // Get low stock products
    const lowStockProducts = supplierProducts.filter(
      (product) =>
        product.warehouseStock + product.shopStock <= product.lowStockThreshold
    );

    return {
      success: true,
      data: {
        supplier,
        products: supplierProducts,
        stats: {
          productCount: supplierProducts.length,
          totalStock: supplierProducts.reduce(
            (sum, p) => sum + p.warehouseStock + p.shopStock,
            0
          ),
          lowStockCount: lowStockProducts.length,
          totalValue: supplierProducts.reduce(
            // Use purchasePrice for inventory value calculation, fall back to price for backward compatibility
            (sum, p) => sum + (p.purchasePrice) * (p.warehouseStock + p.shopStock),
            0
          ),
        },
      },
    };
  } catch (error) {
    console.error(`Error fetching supplier with products: ${id}`, error);
    return { success: false, error: "Failed to fetch supplier with products" };
  }
}

// Add a function to get detailed analytics
export async function getSystemAnalytics(
  period: "week" | "month" | "year" = "month"
) {
  try {
    const now = new Date();
    const startDate = new Date();

    // Set start date based on period
    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // Get all maintenance requests
    const allMaintenanceRequests = await db.maintenance.getAll();

    // Filter by period
    const periodMaintenanceRequests = allMaintenanceRequests.filter((req) => {
      const reqDate = new Date(req.startDate);
      return reqDate >= startDate && reqDate <= now;
    });

    // Get all clients and cars
    const clients = await db.clients.getAll();
    const cars = await db.cars.getAll();

    // Get products and filter low stock items
    const products = await db.products.getAll();
    const lowStockProducts = products.filter(
      (product) =>
        product.warehouseStock + product.shopStock <= product.lowStockThreshold
    );

    // Calculate revenue, costs, etc.
    const totalRevenue = periodMaintenanceRequests.reduce(
      (sum, req) => sum + req.totalCost,
      0
    );
    const paidRevenue = periodMaintenanceRequests.reduce(
      (sum, req) => sum + req.paidAmount,
      0
    );
    const outstandingRevenue = periodMaintenanceRequests.reduce(
      (sum, req) => sum + req.remainingBalance,
      0
    );

    // Get maintenance status distribution
    const statusDistribution = {
      pending: periodMaintenanceRequests.filter(
        (req) => req.status === "pending"
      ).length,
      inProgress: periodMaintenanceRequests.filter(
        (req) => req.status === "in-progress"
      ).length,
      completed: periodMaintenanceRequests.filter(
        (req) => req.status === "completed"
      ).length,
      cancelled: periodMaintenanceRequests.filter(
        (req) => req.status === "cancelled"
      ).length,
    };

    return {
      success: true,
      data: {
        period,
        maintenance: {
          total: periodMaintenanceRequests.length,
          totalRevenue,
          paidRevenue,
          outstandingRevenue,
          statusDistribution,
        },
        inventory: {
          totalProducts: products.length,
          lowStockProducts: lowStockProducts.length,
          totalWarehouseStock: products.reduce(
            (sum, p) => sum + p.warehouseStock,
            0
          ),
          totalShopStock: products.reduce((sum, p) => sum + p.shopStock, 0),
        },
        clients: {
          total: clients.length,
          cars: cars.length,
          carsPerClient: clients.length
            ? (cars.length / clients.length).toFixed(2)
            : 0,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching system analytics:", error);
    return { success: false, error: "Failed to fetch system analytics" };
  }
}

// Update the getDailyReportData function to handle potential errors better

export async function getDailyReportData(date: string) {
  try {
    console.log(`Getting daily report data for date: ${date}`);

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        success: false,
        error: "Invalid date format. Expected YYYY-MM-DD",
        data: {
          date,
          newCars: [],
          services: [],
          products: [],
          payments: [],
          totalPayments: 0,
          maintenance: [],
        },
      };
    }

    // Create date range for precise filtering using Lebanon timezone (UTC+2/+3)
    // Start of day in Lebanon (00:00:00)
    const lebanonTimezoneOffset = 3; // Lebanon is UTC+2 or UTC+3 depending on DST, using +3 to be safe
    const startDate = new Date(
      `${date}T00:00:00.000+0${lebanonTimezoneOffset}:00`
    );
    // End of day in Lebanon (23:59:59.999)
    const endDate = new Date(
      `${date}T23:59:59.999+0${lebanonTimezoneOffset}:00`
    );

    console.log(
      `Using Lebanon date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Helper function to check if a date is within the target date in Lebanon timezone
    const isDateInRange = (dateStr: string): boolean => {
      try {
        if (!dateStr) return false;

        // Parse the date string to a Date object
        const dateObj = new Date(dateStr);

        // Check if valid date
        if (isNaN(dateObj.getTime())) return false;

        // Convert to Lebanon timezone
        const lebanonDate = new Date(dateObj.getTime());
        lebanonDate.setHours(lebanonDate.getHours() + lebanonTimezoneOffset);

        // Get YYYY-MM-DD in Lebanon timezone
        const lebanonDateStr = lebanonDate.toISOString().split("T")[0];

        // Compare with the target date
        return lebanonDateStr === date;
      } catch (e) {
        console.error("Error parsing date:", e, "for date string:", dateStr);
        return false;
      }
    };

    // Fetch all required data in parallel for better performance
    const [logsResult, maintenanceResult, carsResult] =
      await Promise.allSettled([
        db.logs.getByDateRange(date),
        db.maintenance.getByDateRange(date),
        db.cars.getByDateRange(date),
      ]);

    // Process logs
    let logs: any[] = [];
    if (logsResult.status === "fulfilled") {
      logs = Array.isArray(logsResult.value) ? logsResult.value : [];
      console.log(`Fetched ${logs.length} logs for date ${date}`);
    } else {
      console.error("Error fetching logs:", logsResult.reason);
      // Fallback for logs
      try {
        const allLogs = await db.logs.getAll();
        logs = Array.isArray(allLogs)
          ? allLogs.filter((log) => isDateInRange(log.timestamp))
          : [];
        console.log(`Fallback: Filtered ${logs.length} logs for date ${date}`);
      } catch (error) {
        console.error("Error in logs fallback:", error);
      }
    }

    // Process maintenance requests
    let maintenanceRequests: any[] = [];
    if (maintenanceResult.status === "fulfilled") {
      maintenanceRequests = Array.isArray(maintenanceResult.value)
        ? maintenanceResult.value
        : [];
      console.log(
        `Fetched ${maintenanceRequests.length} maintenance requests for date ${date}`
      );
    } else {
      console.error("Error fetching maintenance:", maintenanceResult.reason);
      // Fallback for maintenance
      try {
        const allRequests = await db.maintenance.getAll();
        if (Array.isArray(allRequests)) {
          maintenanceRequests = allRequests.filter((req) =>
            isDateInRange(req.createdAt)
          );
          console.log(
            `Fallback: Filtered ${maintenanceRequests.length} maintenance requests for date ${date}`
          );
        }
      } catch (error) {
        console.error("Error in maintenance fallback:", error);
      }
    }

    // Process cars
    let newCars: any[] = [];
    if (carsResult.status === "fulfilled") {
      newCars = Array.isArray(carsResult.value) ? carsResult.value : [];
      console.log(`Fetched ${newCars.length} new cars for date ${date}`);
    } else {
      console.error("Error fetching cars:", carsResult.reason);
      // Fallback for cars
      try {
        const allCars = await db.cars.getAll();
        if (Array.isArray(allCars)) {
          newCars = allCars.filter((car) => isDateInRange(car.createdAt));
          console.log(
            `Fallback: Filtered ${newCars.length} new cars for date ${date}`
          );
        }
      } catch (error) {
        console.error("Error in cars fallback:", error);
      }
    }

    // Enrich cars with client data
    const enrichedCars = await Promise.all(
      (newCars || []).map(async (car) => {
        try {
          if (!car || !car.clientId) {
            return { ...car, clientName: "Unknown Client" };
          }

          const client = await db.clients.getById(car.clientId);
          return {
            ...car,
            clientName: client ? client.name : "Unknown Client",
          };
        } catch (error) {
          console.error(
            `Error enriching car data for car ${car?.uin || "unknown"}:`,
            error
          );
          return {
            ...car,
            clientName: "Unknown Client",
          };
        }
      })
    );

    // Extract services used on this date from maintenance requests
    const servicesUsed: any[] = [];
    for (const request of maintenanceRequests || []) {
      if (
        !request ||
        !request.servicesUsed ||
        !Array.isArray(request.servicesUsed)
      ) {
        continue;
      }

      for (const serviceUsed of request.servicesUsed) {
        try {
          if (!serviceUsed || !serviceUsed.serviceId) continue;

          const service = await db.services.getById(serviceUsed.serviceId);
          if (!service) continue;

          const client = request.clientId
            ? await db.clients.getById(request.clientId)
            : null;
          const car = request.carUin
            ? await db.cars.getByUin(request.carUin)
            : null;

          servicesUsed.push({
            serviceId: serviceUsed.serviceId,
            serviceName: service.name,
            quantity: serviceUsed.quantity || 1,
            unitPrice: service.standardFee || 0,
            totalCost: (service.standardFee || 0) * (serviceUsed.quantity || 1),
            maintenanceId: request.id,
            clientId: request.clientId,
            clientName: client ? client.name : "Unknown Client",
            carUin: request.carUin,
            carDetails: car
              ? `${car.make} ${car.model} (${car.licensePlate})`
              : "Unknown Car",
            timestamp: request.createdAt,
          });
        } catch (error) {
          console.error(
            `Error processing service ${
              serviceUsed?.serviceId || "unknown"
            } for maintenance ${request?.id || "unknown"}:`,
            error
          );
        }
      }
    }

    // Extract products used on this date from maintenance requests
    const productsUsed: any[] = [];
    for (const request of maintenanceRequests || []) {
      if (
        !request ||
        !request.productsUsed ||
        !Array.isArray(request.productsUsed)
      ) {
        continue;
      }

      for (const productUsed of request.productsUsed) {
        try {
          if (!productUsed || !productUsed.productId) continue;

          const product = await db.products.getById(productUsed.productId);
          if (!product) continue;

          const client = request.clientId
            ? await db.clients.getById(request.clientId)
            : null;
          const car = request.carUin
            ? await db.cars.getByUin(request.carUin)
            : null;

          // Use salePrice for customer charges, fall back to price for backward compatibility
          const priceToUse = product.salePrice ?? 0;
          
          productsUsed.push({
            productId: productUsed.productId,
            productName: product.name,
            quantity: productUsed.quantity || 1,
            unitPrice: priceToUse,
            totalCost: priceToUse * (productUsed.quantity || 1),
            stockSource: productUsed.stockSource || "shop",
            maintenanceId: request.id,
            clientId: request.clientId,
            clientName: client ? client.name : "Unknown Client",
            carUin: request.carUin,
            carDetails: car
              ? `${car.make} ${car.model} (${car.licensePlate})`
              : "Unknown Car",
            timestamp: request.createdAt,
          });
        } catch (error) {
          console.error(
            `Error processing product ${
              productUsed?.productId || "unknown"
            } for maintenance ${request?.id || "unknown"}:`,
            error
          );
        }
      }
    }

    // Extract payments made on this date
    const payments = (logs || [])
      .filter(
        (log) =>
          log &&
          log.actionType === "update" &&
          log.tableName === "maintenance" &&
          log.paymentAmount &&
          isDateInRange(log.timestamp)
      )
      .map((log) => ({
        maintenanceId: log.maintenanceId,
        amount: log.paymentAmount || 0,
        paymentMethod: log.paymentMethod || "Cash",
        clientId: log.clientId,
        clientName: log.clientName || "Unknown Client",
        carUin: log.carUin,
        carDetails: log.carDetails || "Unknown Car",
        remainingBalance: log.remainingBalance || 0,
        timestamp: log.timestamp,
        adminName: log.adminName,
      }));

    // Enrich maintenance requests with client and car details
    const enrichedMaintenance = await Promise.all(
      (maintenanceRequests || []).map(async (request) => {
        try {
          if (!request) return null;

          const client = request.clientId
            ? await db.clients.getById(request.clientId)
            : null;
          const car = request.carUin
            ? await db.cars.getByUin(request.carUin)
            : null;

          // Get service details
          const serviceDetails = Array.isArray(request.servicesUsed)
            ? await Promise.all(
                request.servicesUsed.map(async (serviceUsed) => {
                  try {
                    if (!serviceUsed || !serviceUsed.serviceId) {
                      return {
                        serviceId: "unknown",
                        name: "Unknown Service",
                        quantity: 0,
                        cost: 0,
                      };
                    }

                    const service = await db.services.getById(
                      serviceUsed.serviceId
                    );
                    return {
                      ...serviceUsed,
                      name: service?.name || "Unknown Service",
                      cost: service
                        ? (service.standardFee || 0) *
                          (serviceUsed.quantity || 1)
                        : 0,
                    };
                  } catch (error) {
                    console.error(
                      `Error processing service details for ${
                        serviceUsed?.serviceId || "unknown"
                      }:`,
                      error
                    );
                    return {
                      serviceId: serviceUsed?.serviceId || "unknown",
                      name: "Unknown Service",
                      quantity: serviceUsed?.quantity || 0,
                      cost: 0,
                    };
                  }
                })
              )
            : [];

          // Get product details
          const productDetails = Array.isArray(request.productsUsed)
            ? await Promise.all(
                request.productsUsed.map(async (productUsed) => {
                  try {
                    if (!productUsed || !productUsed.productId) {
                      return {
                        productId: "unknown",
                        name: "Unknown Product",
                        quantity: 0,
                        unitPrice: 0,
                        cost: 0,
                      };
                    }

                    const product = await db.products.getById(
                      productUsed.productId
                    );
                    return {
                      ...productUsed,
                      name: product?.name || "Unknown Product",
                      // Use salePrice for customer charges, fall back to price for backward compatibility
                      unitPrice: product?.salePrice || 0,
                      cost: product
                        ? (product.salePrice || 0) * (productUsed.quantity || 1)
                        : 0,
                    };
                  } catch (error) {
                    console.error(
                      `Error processing product details for ${
                        productUsed?.productId || "unknown"
                      }:`,
                      error
                    );
                    return {
                      productId: productUsed?.productId || "unknown",
                      name: "Unknown Product",
                      quantity: productUsed?.quantity || 0,
                      unitPrice: 0,
                      cost: 0,
                    };
                  }
                })
              )
            : [];

          // Filter out null values
          const filteredServiceDetails = serviceDetails.filter(Boolean);
          const filteredProductDetails = productDetails.filter(Boolean);

          return {
            ...request,
            clientName: client?.name || "Unknown Client",
            carDetails: car
              ? `${car.make} ${car.model} (${car.licensePlate})`
              : "Unknown Car",
            serviceDetails: filteredServiceDetails,
            productDetails: filteredProductDetails,
          };
        } catch (error) {
          console.error(
            `Error enriching maintenance request ${request?.id || "unknown"}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out null values
    const filteredMaintenance = enrichedMaintenance.filter(Boolean);

    // Calculate total payments with safeguards
    const totalPayments = (payments || []).reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0
    );

    console.log(`Successfully compiled daily report data for ${date}`);

    return {
      success: true,
      data: {
        date,
        newCars: enrichedCars || [],
        services: servicesUsed || [],
        products: productsUsed || [],
        payments: payments || [],
        totalPayments,
        maintenance: filteredMaintenance || [],
      },
    };
  } catch (error) {
    console.error(`Error fetching daily report data for ${date}:`, error);
    return {
      success: false,
      error:
        "Failed to fetch daily report data: " +
        (error instanceof Error ? error.message : String(error)),
      data: {
        date,
        newCars: [],
        services: [],
        products: [],
        payments: [],
        totalPayments: 0,
        maintenance: [],
      },
    };
  }
}

// Add this function to get data by date range
export async function getCarsByDateRange(startDate: string, endDate: string) {
  try {
    console.log(`Fetching cars between ${startDate} and ${endDate}`);

    // Validate date format
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return {
        success: false,
        error: "Invalid date format. Expected YYYY-MM-DD",
        data: [],
      };
    }

    // Lebanon timezone offset (UTC+3)
    const lebanonTimezoneOffset = 3;

    // Create date range for precise filtering using Lebanon timezone
    const startDateTime = new Date(
      `${startDate}T00:00:00.000+0${lebanonTimezoneOffset}:00`
    );
    const endDateTime = new Date(
      `${endDate}T23:59:59.999+0${lebanonTimezoneOffset}:00`
    );

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return {
        success: false,
        error: "Invalid date values",
        data: [],
      };
    }

    console.log(
      `Using Lebanon date range: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`
    );

    // Helper function to check if a date is within the target range in Lebanon timezone
    const isDateInRange = (dateStr: string): boolean => {
      try {
        if (!dateStr) return false;

        // Parse the date string to a Date object
        const dateObj = new Date(dateStr);

        // Check if valid date
        if (isNaN(dateObj.getTime())) return false;

        // Convert to Lebanon timezone
        const lebanonDate = new Date(dateObj.getTime());
        lebanonDate.setHours(lebanonDate.getHours() + lebanonTimezoneOffset);

        return lebanonDate >= startDateTime && lebanonDate <= endDateTime;
      } catch (e) {
        console.error("Error parsing date:", e, "for date string:", dateStr);
        return false;
      }
    };

    let cars = [];
    try {
      // Try using the db method first
      cars = await db.cars.getByDateRange(startDate, endDate);
      if (!Array.isArray(cars)) {
        console.warn("db.cars.getByDateRange did not return an array:", cars);
        cars = [];
      }
      console.log(`Found ${cars.length} cars using getByDateRange`);
    } catch (error) {
      console.error("Error using getByDateRange for cars:", error);
      cars = [];
    }

    // If no cars found or error occurred, use fallback method
    if (cars.length === 0) {
      try {
        console.log("Using fallback method to filter cars by date");
        const allCars = await db.cars.getAll();
        if (Array.isArray(allCars)) {
          cars = allCars.filter((car) => {
            try {
              return isDateInRange(car.createdAt);
            } catch (e) {
              console.error("Error parsing date for car:", e);
              return false;
            }
          });
          console.log(`Found ${cars.length} cars using fallback method`);
        } else {
          console.warn("db.cars.getAll did not return an array");
        }
      } catch (fallbackError) {
        console.error("Error in fallback for cars:", fallbackError);
      }
    }

    return { success: true, data: cars };
  } catch (error) {
    console.error(
      `Error fetching cars between ${startDate} and ${endDate}:`,
      error
    );
    return {
      success: false,
      error: "Failed to fetch cars by date range",
      data: [],
    };
  }
}

export async function getMaintenanceByDateRange(
  startDate: string,
  endDate: string
) {
  try {
    console.log(`Fetching maintenance between ${startDate} and ${endDate}`);

    // Validate date format
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return {
        success: false,
        error: "Invalid date format. Expected YYYY-MM-DD",
        data: [],
      };
    }

    // Lebanon timezone offset (UTC+3)
    const lebanonTimezoneOffset = 3;

    // Create date range for precise filtering using Lebanon timezone
    const startDateTime = new Date(
      `${startDate}T00:00:00.000+0${lebanonTimezoneOffset}:00`
    );
    const endDateTime = new Date(
      `${endDate}T23:59:59.999+0${lebanonTimezoneOffset}:00`
    );

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return {
        success: false,
        error: "Invalid date values",
        data: [],
      };
    }

    console.log(
      `Using Lebanon date range: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`
    );

    // Helper function to check if a date is within the target range in Lebanon timezone
    const isDateInRange = (dateStr: string): boolean => {
      try {
        if (!dateStr) return false;

        // Parse the date string to a Date object
        const dateObj = new Date(dateStr);

        // Check if valid date
        if (isNaN(dateObj.getTime())) return false;

        // Convert to Lebanon timezone
        const lebanonDate = new Date(dateObj.getTime());
        lebanonDate.setHours(lebanonDate.getHours() + lebanonTimezoneOffset);

        return lebanonDate >= startDateTime && lebanonDate <= endDateTime;
      } catch (e) {
        console.error("Error parsing date:", e, "for date string:", dateStr);
        return false;
      }
    };

    let requests = [];
    try {
      // Try using the db method first
      requests = await db.maintenance.getByDateRange(startDate, endDate);
      if (!Array.isArray(requests)) {
        console.warn(
          "db.maintenance.getByDateRange did not return an array:",
          requests
        );
        requests = [];
      }
      console.log(
        `Found ${requests.length} maintenance requests using getByDateRange`
      );
    } catch (error) {
      console.error("Error using getByDateRange for maintenance:", error);
      requests = [];
    }

    // If no requests found or error occurred, use fallback method
    if (requests.length === 0) {
      try {
        console.log("Using fallback method to filter maintenance by date");
        const allRequests = await db.maintenance.getAll();
        if (Array.isArray(allRequests)) {
          requests = allRequests.filter((req) => {
            try {
              return isDateInRange(req.createdAt);
            } catch (e) {
              console.error("Error filtering maintenance by date:", e);
              return false;
            }
          });
          console.log(
            `Found ${requests.length} maintenance requests using fallback method`
          );
        } else {
          console.warn("db.maintenance.getAll did not return an array");
        }
      } catch (fallbackError) {
        console.error("Error in fallback for maintenance:", fallbackError);
      }
    }

    return { success: true, data: requests };
  } catch (error) {
    console.error(
      `Error fetching maintenance between ${startDate} and ${endDate}:`,
      error
    );
    return {
      success: false,
      error:
        "Failed to fetch maintenance by date range: " +
        (error instanceof Error ? error.message : String(error)),
      data: [],
    };
  }
}

export async function exportDatabaseBackup() {
  try {
    // Get all data from all tables
    const [
      clients,
      cars,
      insurance,
      services,
      products,
      suppliers,
      maintenance,
      logs,
    ] = await Promise.all([
      db.clients.getAll(),
      db.cars.getAll(),
      db.insurance.getAll(),
      db.services.getAll(),
      db.products.getAll(),
      db.suppliers.getAll(),
      db.maintenance.getAll(),
      db.logs.getAll(),
    ]);

    // Create a backup object with all data
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        clients,
        cars,
        insurance,
        services,
        products,
        suppliers,
        maintenance,
        logs,
      },
    };

    return { success: true, data: backup };
  } catch (error) {
    console.error("Error exporting database backup:", error);
    return { success: false, error: "Failed to export database backup" };
  }
}

export async function importDatabaseBackup(backupData: any) {
  try {
    // Validate backup data structure
    if (!backupData || !backupData.data) {
      return { success: false, error: "Invalid backup data format" };
    }

    // Add version check for forward compatibility
    if (backupData.version && parseFloat(backupData.version) > 1.0) {
      console.warn(`Backup version ${backupData.version} is newer than the current system version 1.0. Some features may not work correctly.`);
    }

    const { data } = backupData;

    // Validate required data collections
    const requiredCollections = [
      "clients",
      "cars",
      "services",
      "products",
      "maintenance",
    ];
    for (const collection of requiredCollections) {
      if (!data[collection] || !Array.isArray(data[collection])) {
        return {
          success: false,
          error: `Missing or invalid ${collection} data in backup`,
        };
      }
    }

    // Clear existing data and import from backup
    // Note: In a real implementation, this would be done in a transaction
    // and with proper error handling for each collection

    // Helper function to clear all items of a collection
    async function clearCollection(collection: string, getAllFunc: () => Promise<any[]>, deleteFunc: (id: string) => Promise<any>) {
      try {
        const items = await getAllFunc();
        for (const item of items) {
          // Handle different ID field names (cars use uin, others use id)
          const id = collection === 'cars' ? item.uin : item.id;
          // Only try to delete if we have a delete function (logs don't have one)
          if (typeof deleteFunc === 'function') {
            await deleteFunc(id);
          }
        }
      } catch (error) {
        console.error(`Error clearing collection ${collection}:`, error);
      }
    }

    // Import clients
    if (data.clients && data.clients.length > 0) {
      await clearCollection('clients', 
        () => db.clients.getAll(), 
        (id: string) => db.clients.delete(id)
      );
      for (const client of data.clients) {
        await db.clients.create(client);
      }
    }

    // Import cars
    if (data.cars && data.cars.length > 0) {
      await clearCollection('cars', 
        () => db.cars.getAll(), 
        (id: string) => db.cars.delete(id)
      );
      for (const car of data.cars) {
        await db.cars.create(car);
      }
    }

    // Import insurance
    if (data.insurance && data.insurance.length > 0) {
      await clearCollection('insurance', 
        () => db.insurance.getAll(), 
        (id: string) => db.insurance.delete(id)
      );
      for (const ins of data.insurance) {
        await db.insurance.create(ins);
      }
    }

    // Import services
    if (data.services && data.services.length > 0) {
      await clearCollection('services', 
        () => db.services.getAll(), 
        (id: string) => db.services.delete(id)
      );
      for (const service of data.services) {
        await db.services.create(service);
      }
    }

    // Import products
    if (data.products && data.products.length > 0) {
      await clearCollection('products', 
        () => db.products.getAll(), 
        (id: string) => db.products.delete(id)
      );
      for (const product of data.products) {
        await db.products.create(product);
      }
    }

    // Import suppliers
    if (data.suppliers && data.suppliers.length > 0) {
      await clearCollection('suppliers', 
        () => db.suppliers.getAll(), 
        (id: string) => db.suppliers.delete(id)
      );
      for (const supplier of data.suppliers) {
        await db.suppliers.create(supplier);
      }
    }

    // Import maintenance
    if (data.maintenance && data.maintenance.length > 0) {
      await clearCollection('maintenance', 
        () => db.maintenance.getAll(), 
        (id: string) => db.maintenance.delete(id)
      );
      for (const request of data.maintenance) {
        await db.maintenance.create(request);
      }
    }

    // Import logs
    if (data.logs && data.logs.length > 0) {
      try {
        // Special handling for logs - we don't want to delete existing logs
        // as they are part of the audit trail. Instead, we'll append the backup logs
        // to the existing logs, treating them as historical records
        
        // Get all existing logs to check for duplicates
        const existingLogs = await db.logs.getAll();
        const existingLogIds = new Set(existingLogs.map(log => log.id));
        
        // Track statistics for user feedback
        let logsAdded = 0;
        let logsDuplicated = 0;
        
        // Create new logs from the backup, skipping any with IDs that already exist
        for (const log of data.logs) {
          if (log.id && existingLogIds.has(log.id)) {
            // Skip duplicate logs
            logsDuplicated++;
            continue;
          }
          
          // Create a new log entry
          await db.logs.create(log);
          logsAdded++;
        }
        
        console.log(`Logs import complete: ${logsAdded} logs added, ${logsDuplicated} duplicates skipped`);
      } catch (error) {
        console.error("Error importing logs:", error);
        // Continue with the import even if logs fail - don't fail the whole process
      }
    }

    // Add a log entry for the restore operation
    await db.logs.create({
      actionType: "create", // Using allowed actionType
      tableName: "system",
      adminName: "System Admin",
      afterValue: JSON.stringify({ message: "Database restored from backup" }),
    });

    // Revalidate all paths to refresh the UI
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error importing database backup:", error);
    return { success: false, error: "Failed to import database backup" };
  }
}

// Employees actions
export async function getEmployees() {
  try {
    debugLog("Fetching all employees");
    const employees = await db.employees.getAll();
    return { success: true, data: employees };
  } catch (error) {
    debugError("Error fetching employees:", error);
    return { success: false, error: "Failed to fetch employees" };
  }
}

export async function getEmployeeById(id: string) {
  try {
    const employee = await db.employees.getById(id);
    return { success: true, data: employee };
  } catch (error) {
    console.error(`Error fetching employee ${id}:`, error);
    return { success: false, error: "Failed to fetch employee" };
  }
}

export async function createEmployee(data: any) {
  try {
    debugLog("Creating employee", data);
    const employee = await db.employees.create(data);
    revalidatePath("/employees");
    return { success: true, data: employee };
  } catch (error) {
    debugError("Error creating employee:", error);
    return { success: false, error: "Failed to create employee" };
  }
}

export async function updateEmployee(id: string, data: any) {
  try {
    const employee = await db.employees.update(id, data);
    revalidatePath("/employees");
    return { success: true, data: employee };
  } catch (error) {
    console.error(`Error updating employee ${id}:`, error);
    return { success: false, error: "Failed to update employee" };
  }
}

export async function deleteEmployee(id: string) {
  try {
    await db.employees.delete(id);
    revalidatePath("/employees");
    return { success: true };
  } catch (error) {
    console.error(`Error deleting employee ${id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete employee" 
    };
  }
}

// Salary actions
export async function getSalaries() {
  try {
    debugLog("Fetching all salaries");
    const salaries = await db.salaries.getAll();
    return { success: true, data: salaries };
  } catch (error) {
    debugError("Error fetching salaries:", error);
    return { success: false, error: "Failed to fetch salaries" };
  }
}

export async function getSalaryById(id: string) {
  try {
    const salary = await db.salaries.getById(id);
    return { success: true, data: salary };
  } catch (error) {
    console.error(`Error fetching salary ${id}:`, error);
    return { success: false, error: "Failed to fetch salary" };
  }
}

export async function getSalariesByEmployeeId(employeeId: string) {
  try {
    const salaries = await db.salaries.getByEmployeeId(employeeId);
    return { success: true, data: salaries };
  } catch (error) {
    console.error(`Error fetching salaries for employee ${employeeId}:`, error);
    return { success: false, error: "Failed to fetch employee salaries" };
  }
}

export async function createSalary(data: any) {
  try {
    debugLog("Creating salary", data);
    const salary = await db.salaries.create(data);
    revalidatePath("/employees");
    return { success: true, data: salary };
  } catch (error) {
    debugError("Error creating salary:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create salary" 
    };
  }
}

export async function updateSalary(id: string, data: any) {
  try {
    const salary = await db.salaries.update(id, data);
    revalidatePath("/employees");
    return { success: true, data: salary };
  } catch (error) {
    console.error(`Error updating salary ${id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update salary" 
    };
  }
}

export async function deleteSalary(id: string) {
  try {
    await db.salaries.delete(id);
    revalidatePath("/employees");
    return { success: true };
  } catch (error) {
    console.error(`Error deleting salary ${id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete salary" 
    };
  }
}

export async function getSalariesByDateRange(startDate: string, endDate?: string, granularity: "day" | "week" | "month" | "year" = "month") {
  try {
    const salaries = await db.salaries.getByDateRange(startDate, endDate, granularity);
    return { success: true, data: salaries };
  } catch (error) {
    console.error(`Error fetching salaries by date range:`, error);
    return { success: false, error: "Failed to fetch salaries by date range" };
  }
}

// Finance Category actions
export async function getFinanceCategories() {
  try {
    debugLog("Fetching all finance categories");
    const categories = await db.financeCategories.getAll();
    return { success: true, data: categories };
  } catch (error) {
    debugError("Error fetching finance categories:", error);
    return { success: false, error: "Failed to fetch finance categories" };
  }
}

export async function getFinanceCategoryById(id: string) {
  try {
    const category = await db.financeCategories.getById(id);
    return { success: true, data: category };
  } catch (error) {
    console.error(`Error fetching finance category ${id}:`, error);
    return { success: false, error: "Failed to fetch finance category" };
  }
}

export async function getFinanceCategoriesByType(type: "income" | "expense") {
  try {
    const categories = await db.financeCategories.getByType(type);
    return { success: true, data: categories };
  } catch (error) {
    console.error(`Error fetching finance categories by type ${type}:`, error);
    return { success: false, error: "Failed to fetch finance categories by type" };
  }
}

export async function createFinanceCategory(data: any) {
  try {
    debugLog("Creating finance category", data);
    const category = await db.financeCategories.create(data);
    revalidatePath("/finances");
    return { success: true, data: category };
  } catch (error) {
    debugError("Error creating finance category:", error);
    return { success: false, error: "Failed to create finance category" };
  }
}

export async function updateFinanceCategory(id: string, data: any) {
  try {
    const category = await db.financeCategories.update(id, data);
    revalidatePath("/finances");
    return { success: true, data: category };
  } catch (error) {
    console.error(`Error updating finance category ${id}:`, error);
    return { success: false, error: "Failed to update finance category" };
  }
}

export async function deleteFinanceCategory(id: string) {
  try {
    await db.financeCategories.delete(id);
    revalidatePath("/finances");
    return { success: true };
  } catch (error) {
    console.error(`Error deleting finance category ${id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete finance category" 
    };
  }
}

// Finance Record actions
export async function getFinanceRecords() {
  try {
    debugLog("Fetching all finance records");
    const records = await db.financeRecords.getAll();
    return { success: true, data: records };
  } catch (error) {
    debugError("Error fetching finance records:", error);
    return { success: false, error: "Failed to fetch finance records" };
  }
}

export async function getFinanceRecordById(id: string) {
  try {
    const record = await db.financeRecords.getById(id);
    return { success: true, data: record };
  } catch (error) {
    console.error(`Error fetching finance record ${id}:`, error);
    return { success: false, error: "Failed to fetch finance record" };
  }
}

export async function getFinanceRecordsByCategoryId(categoryId: string) {
  try {
    const records = await db.financeRecords.getByCategoryId(categoryId);
    return { success: true, data: records };
  } catch (error) {
    console.error(`Error fetching finance records for category ${categoryId}:`, error);
    return { success: false, error: "Failed to fetch finance records by category" };
  }
}

export async function getFinanceRecordsByType(type: "income" | "expense") {
  try {
    const records = await db.financeRecords.getByType(type);
    return { success: true, data: records };
  } catch (error) {
    console.error(`Error fetching finance records by type ${type}:`, error);
    return { success: false, error: "Failed to fetch finance records by type" };
  }
}

export async function createFinanceRecord(data: any) {
  try {
    debugLog("Creating finance record", data);
    const record = await db.financeRecords.create(data);
    revalidatePath("/finances");
    return { success: true, data: record };
  } catch (error) {
    debugError("Error creating finance record:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create finance record" 
    };
  }
}

export async function updateFinanceRecord(id: string, data: any) {
  try {
    const record = await db.financeRecords.update(id, data);
    revalidatePath("/finances");
    return { success: true, data: record };
  } catch (error) {
    console.error(`Error updating finance record ${id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update finance record" 
    };
  }
}

export async function deleteFinanceRecord(id: string) {
  try {
    await db.financeRecords.delete(id);
    revalidatePath("/finances");
    return { success: true };
  } catch (error) {
    console.error(`Error deleting finance record ${id}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete finance record" 
    };
  }
}

export async function getFinanceRecordsByDateRange(startDate: string, endDate?: string, granularity: "day" | "week" | "month" | "year" = "month") {
  try {
    const records = await db.financeRecords.getByDateRange(startDate, endDate, granularity);
    return { success: true, data: records };
  } catch (error) {
    console.error(`Error fetching finance records by date range:`, error);
    return { success: false, error: "Failed to fetch finance records by date range" };
  }
}

export async function getFinancialSummary(startDate: string, endDate?: string, granularity: "day" | "week" | "month" | "year" = "month") {
  try {
    const summary = await db.financeRecords.getFinancialSummary(startDate, endDate, granularity);
    return { success: true, data: summary };
  } catch (error) {
    console.error(`Error fetching financial summary:`, error);
    return { success: false, error: "Failed to fetch financial summary" };
  }
}

// Finance Export
export async function exportFinanceRecordsToCSV(startDate?: string, endDate?: string) {
  try {
    let records;
    if (startDate) {
      const result = await getFinanceRecordsByDateRange(startDate, endDate);
      if (!result.success) {
        throw new Error(result.error);
      }
      records = result.data;
    } else {
      const result = await getFinanceRecords();
      if (!result.success) {
        throw new Error(result.error);
      }
      records = result.data;
    }
    
    // Get categories for mapping
    const categoriesResult = await getFinanceCategories();
    if (!categoriesResult.success) {
      throw new Error(categoriesResult.error);
    }
    
    const categories = categoriesResult.data;
    const categoryMap = new Map();
    categories.forEach((category: any) => {
      categoryMap.set(category.id, category);
    });
    
    // Create CSV header
    let csvContent = "Date,Category,Type,Description,Amount,Payment Method,Reference Number,Related Entity,Notes\n";
    
    // Add rows
    for (const record of records) {
      const category = categoryMap.get(record.categoryId);
      const categoryName = category ? category.name : 'Unknown';
      const categoryType = category ? category.type : 'Unknown';
      
      const row = [
        new Date(record.date).toLocaleDateString(),
        categoryName,
        categoryType,
        `"${record.description.replace(/"/g, '""')}"`,
        record.amount.toFixed(2),
        record.paymentMethod || '',
        record.referenceNumber || '',
        record.relatedEntityType ? `${record.relatedEntityType}: ${record.relatedEntityId}` : '',
        record.notes ? `"${record.notes.replace(/"/g, '""')}"` : ''
      ];
      
      csvContent += row.join(',') + '\n';
    }
    
    return { 
      success: true, 
      data: {
        content: csvContent,
        filename: `finance_records_${new Date().toISOString().split('T')[0]}.csv`
      }
    };
  } catch (error) {
    console.error(`Error exporting finance records to CSV:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to export finance records to CSV" 
    };
  }
}

// Employee Export
export async function exportEmployeesToCSV() {
  try {
    const result = await getEmployees();
    if (!result.success) {
      throw new Error(result.error);
    }
    const employees = result.data;
    
    // Create CSV header
    let csvContent = "Name,Position,Hire Date,Contact,Email,Base Salary,Status\n";
    
    // Add rows
    for (const employee of employees) {
      const row = [
        `"${employee.name.replace(/"/g, '""')}"`,
        `"${employee.position.replace(/"/g, '""')}"`,
        new Date(employee.hireDate).toLocaleDateString(),
        `"${employee.contact.replace(/"/g, '""')}"`,
        `"${employee.email.replace(/"/g, '""')}"`,
        employee.baseSalary.toFixed(2),
        employee.isActive ? 'Active' : 'Inactive'
      ];
      
      csvContent += row.join(',') + '\n';
    }
    
    return { 
      success: true, 
      data: {
        content: csvContent,
        filename: `employees_${new Date().toISOString().split('T')[0]}.csv`
      }
    };
  } catch (error) {
    console.error(`Error exporting employees to CSV:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to export employees to CSV" 
    };
  }
}
