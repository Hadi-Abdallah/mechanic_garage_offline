"use server"

import { db } from "@/lib/db"
import { debugLog } from "@/lib/debug"

export async function seedDatabase() {
  try {
    // Check if database already has data
    const existingClients = await db.clients.getAll()
    if (existingClients.length > 0) {
      return { success: true, message: "Database already has data" }
    }

    // Seed clients
    const client1 = await db.clients.create({
      name: "John Doe",
      contact: "555-123-4567",
      email: "john@example.com",
      address: "123 Main St, Anytown, CA 12345",
    })

    const client2 = await db.clients.create({
      name: "Jane Smith",
      contact: "555-987-6543",
      email: "jane@example.com",
      address: "456 Oak Ave, Somewhere, CA 67890",
    })

    // Seed insurance companies
    const insurance1 = await db.insurance.create({
      name: "ABC Insurance",
      contactPerson: "Bob Johnson",
      email: "bob@abcinsurance.com",
      phone: "555-111-2222",
      address: "789 Insurance Blvd, Insure City, CA 54321",
    })

    // Seed cars
    await db.cars.create({
      uin: "CAR001",
      licensePlate: "ABC123",
      make: "Toyota",
      model: "Camry",
      year: 2020,
      vin: "1HGCM82633A123456",
      color: "Blue",
      clientId: client1.id,
      insuranceId: insurance1.id,
    })

    await db.cars.create({
      uin: "CAR002",
      licensePlate: "XYZ789",
      make: "Honda",
      model: "Accord",
      year: 2019,
      vin: "5YJSA1E29JF123456",
      color: "Red",
      clientId: client2.id,
    })

    // Seed services
    const service1 = await db.services.create({
      name: "Oil Change",
      description: "Standard oil change service with filter replacement",
      standardFee: 49.99,
    })

    const service2 = await db.services.create({
      name: "Brake Inspection",
      description: "Complete brake system inspection and adjustment",
      standardFee: 79.99,
    })

    // Seed suppliers
    const supplier1 = await db.suppliers.create({
      name: "Auto Parts Plus",
      contact: "Sarah Lee",
      email: "sarah@autopartsplus.com",
      phone: "555-333-4444",
      address: "101 Parts Lane, Partsville, CA 11111",
    })

    // Seed products
    await db.products.create({
      name: "Oil Filter",
      description: "Premium oil filter for most vehicles",
      price: 12.99,
      warehouseStock: 50,
      shopStock: 10,
      supplierId: supplier1.id,
      lowStockThreshold: 15,
    })

    await db.products.create({
      name: "Brake Pads",
      description: "High-performance ceramic brake pads",
      price: 39.99,
      warehouseStock: 30,
      shopStock: 8,
      supplierId: supplier1.id,
      lowStockThreshold: 10,
    })

    debugLog("Database seeded successfully")
    return { success: true, message: "Database seeded successfully" }
  } catch (error) {
    debugLog("Error seeding database", error)
    return { success: false, error: "Failed to seed database" }
  }
}

