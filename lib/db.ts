import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

// Entity types
export type Client = {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type Car = {
  uin: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  color: string;
  clientId: string;
  insuranceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Insurance = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  policyNumber?: string;
  coverageType?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  standardFee: number;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price?: number; // Legacy field, marked as optional
  purchasePrice: number; // Cost price when buying from supplier
  salePrice: number; // Price when selling to customers
  warehouseStock: number;
  shopStock: number;
  supplierId: string;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceRequest = {
  id: string;
  carUin: string;
  clientId: string;
  servicesUsed: { serviceId: string; quantity: number }[];
  productsUsed: {
    productId: string;
    quantity: number;
    stockSource: "warehouse" | "shop";
  }[];
  additionalFee: number;
  discount: number;
  discountJustification?: string;
  totalCost: number;
  paidAmount: number;
  remainingBalance: number;
  paymentStatus: "pending" | "partial" | "paid";
  startDate: string;
  endDate?: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  // Enriched properties (added at runtime)
  clientName?: string;
  carDetails?: string;
  serviceDetails?: Array<{
    serviceId: string;
    quantity: number;
    name: string;
    cost: number;
  }>;
  productDetails?: Array<{
    productId: string;
    quantity: number;
    stockSource: "warehouse" | "shop";
    name: string;
    unitPrice: number;
    cost: number;
  }>;
};

export type LogEntry = {
  id: string;
  actionType: "create" | "update" | "delete";
  tableName: string;
  timestamp: string;
  adminName: string;
  beforeValue?: string;
  afterValue?: string;
  clientId?: string;
  carUin?: string;
  insuranceId?: string;
  serviceId?: string;
  productId?: string;
  maintenanceId?: string;
  startDate?: string;
  endDate?: string;
  paymentAmount?: number;
  discount?: number;
  additionalFees?: number;
  remainingBalance?: number;
};

export type Employee = {
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

export type Salary = {
  id: string;
  employeeId: string;
  amount: number;
  paymentDate: string;
  paymentPeriod: string; // "January 2023", "Q1 2023", etc.
  notes?: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinanceCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinanceRecord = {
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

// Database operations
export const db = {
  // Client operations
  clients: {
    async getAll(): Promise<Client[]> {
      const clientIds = await redis.smembers("clients");
      if (!clientIds.length) return [];

      const clients = await Promise.all(
        clientIds.map(async (id) => {
          const client = await redis.hgetall(`client:${id}`);
          return client as unknown as Client;
        })
      );

      return clients.filter(Boolean);
    },

    async getById(id: string): Promise<Client | null> {
      const client = await redis.hgetall(`client:${id}`);
      if (!client || Object.keys(client).length === 0) return null;
      return Object.keys(client).length ? (client as unknown as Client) : null;
    },

    async create(
      client: Omit<Client, "id" | "createdAt" | "updatedAt">
    ): Promise<Client> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newClient: Client = {
        id,
        ...client,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`client:${id}`, newClient as any);
      await redis.sadd("clients", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "clients",
        adminName: "System",
        afterValue: JSON.stringify(newClient),
        clientId: id,
      });

      return newClient;
    },

    async update(
      id: string,
      data: Partial<Omit<Client, "id" | "createdAt" | "updatedAt">>
    ): Promise<Client | null> {
      const client = await this.getById(id);
      if (!client) return null;

      const beforeValue = JSON.stringify(client);

      const updatedClient: Client = {
        ...client,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`client:${id}`, updatedClient as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "clients",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedClient),
        clientId: id,
      });

      return updatedClient;
    },

    async delete(id: string): Promise<boolean> {
      const client = await this.getById(id);
      if (!client) return false;

      // Check if client has cars
      const clientCars = await db.cars.getByClientId(id);
      if (clientCars.length > 0) {
        throw new Error("Cannot delete client with associated cars");
      }

      await redis.del(`client:${id}`);
      await redis.srem("clients", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "clients",
        adminName: "System",
        beforeValue: JSON.stringify(client),
        clientId: id,
      });

      return true;
    },
  },

  // Car operations
  cars: {
    async getAll(): Promise<Car[]> {
      const carUins = await redis.smembers("cars");
      if (!carUins.length) return [];

      const cars = await Promise.all(
        carUins.map(async (uin) => {
          const car = await redis.hgetall(`car:${uin}`);
          return car as unknown as Car;
        })
      );

      return cars.filter(Boolean);
    },

    async getByUin(uin: string): Promise<Car | null> {
      const car = await redis.hgetall(`car:${uin}`);
      if (!car || Object.keys(car).length === 0) return null;
      return car as unknown as Car;
    },

    async getByClientId(clientId: string): Promise<Car[]> {
      const cars = await this.getAll();
      return cars.filter((car) => car.clientId === clientId);
    },

    async create(car: Omit<Car, "createdAt" | "updatedAt">): Promise<Car> {
      // Check if UIN already exists
      const existingCar = await this.getByUin(car.uin);
      if (existingCar) {
        throw new Error(`Car with UIN ${car.uin} already exists`);
      }
      // Check if client exists
      const client = await db.clients.getById(car.clientId);
      if (!client) {
        throw new Error(`Client with ID ${car.clientId} does not exist`);
      }

      // Check if insurance exists if provided
      if (car.insuranceId) {
        const insurance = await db.insurance.getById(car.insuranceId);
        if (!insurance) {
          throw new Error(
            `Insurance with ID ${car.insuranceId} does not exist`
          );
        }
      }

      const now = new Date().toISOString();

      const newCar: Car = {
        ...car,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`car:${car.uin}`, newCar as any);
      await redis.sadd("cars", car.uin);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "cars",
        adminName: "System",
        afterValue: JSON.stringify(newCar),
        carUin: car.uin,
        clientId: car.clientId,
        insuranceId: car.insuranceId,
      });

      return newCar;
    },

    async update(
      uin: string,
      data: Partial<Omit<Car, "uin" | "createdAt" | "updatedAt">>
    ): Promise<Car | null> {
      const car = await this.getByUin(uin);
      if (!car) return null;

      const beforeValue = JSON.stringify(car);

      // Check if client exists if changing client
      if (data.clientId && data.clientId !== car.clientId) {
        const client = await db.clients.getById(data.clientId);
        if (!client) {
          throw new Error(`Client with ID ${data.clientId} does not exist`);
        }
      }

      // Check if insurance exists if changing insurance
      if (data.insuranceId && data.insuranceId !== car.insuranceId) {
        const insurance = await db.insurance.getById(data.insuranceId);
        if (!insurance) {
          throw new Error(
            `Insurance with ID ${data.insuranceId} does not exist`
          );
        }
      }

      const updatedCar: Car = {
        ...car,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`car:${uin}`, updatedCar as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "cars",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedCar),
        carUin: uin,
        clientId: updatedCar.clientId,
        insuranceId: updatedCar.insuranceId,
      });

      return updatedCar;
    },

    async delete(uin: string): Promise<boolean> {
      const car = await this.getByUin(uin);
      if (!car) return false;

      // Check if car has maintenance requests
      const maintenanceRequests = await db.maintenance.getByCarUin(uin);
      if (maintenanceRequests.length > 0) {
        throw new Error(
          "Cannot delete car with associated maintenance requests"
        );
      }

      await redis.del(`car:${uin}`);
      await redis.srem("cars", uin);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "cars",
        adminName: "System",
        beforeValue: JSON.stringify(car),
        carUin: uin,
        clientId: car.clientId,
        insuranceId: car.insuranceId,
      });

      return true;
    },

    async getByDateRange(
      startDate: string,
      endDate?: string,
      granularity: 'day' | 'week' | 'month' | 'year' = 'day'
    ): Promise<Car[]> {
      const cars = await this.getAll();
      let start = new Date(startDate);
      let end: Date;
    
      if (endDate) {
        end = new Date(endDate);
      } else {
        // Compute range based on granularity
        switch (granularity) {
          case 'day': {
            const startOfDay = new Date(start);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(start);
            endOfDay.setHours(23, 59, 59, 999);
            start = startOfDay;
            end = endOfDay;
            break;
          }
          case 'week': {
            // Assuming week starts on Sunday.
            const dayOfWeek = start.getDay();
            const startOfWeek = new Date(start);
            startOfWeek.setDate(start.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            start = startOfWeek;
            end = endOfWeek;
            break;
          }
          case 'month': {
            const startOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
            const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            start = startOfMonth;
            end = endOfMonth;
            break;
          }
          case 'year': {
            const startOfYear = new Date(start.getFullYear(), 0, 1);
            const endOfYear = new Date(start.getFullYear(), 11, 31);
            endOfYear.setHours(23, 59, 59, 999);
            start = startOfYear;
            end = endOfYear;
            break;
          }
          default:
            throw new Error('Invalid granularity provided.');
        }
      }
    
      return cars.filter((car) => {
        const carDate = new Date(car.createdAt);
        return carDate >= start && carDate <= end;
      });
    }
    ,
  },

  // Insurance operations
  insurance: {
    async getAll(): Promise<Insurance[]> {
      const insuranceIds = await redis.smembers("insurance");
      if (!insuranceIds.length) return [];

      const insurances = await Promise.all(
        insuranceIds.map(async (id) => {
          const insurance = await redis.hgetall(`insurance:${id}`);
          return insurance as unknown as Insurance;
        })
      );

      return insurances.filter(Boolean);
    },

    async getById(id: string): Promise<Insurance | null> {
      const insurance = await redis.hgetall(`insurance:${id}`);

      if (!insurance || Object.keys(insurance).length === 0) return null;
      return Object.keys(insurance).length
        ? (insurance as unknown as Insurance)
        : null;
    },

    async create(
      insurance: Omit<Insurance, "id" | "createdAt" | "updatedAt">
    ): Promise<Insurance> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newInsurance: Insurance = {
        id,
        ...insurance,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`insurance:${id}`, newInsurance as any);
      await redis.sadd("insurance", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "insurance",
        adminName: "System",
        afterValue: JSON.stringify(newInsurance),
        insuranceId: id,
      });

      return newInsurance;
    },

    async update(
      id: string,
      data: Partial<Omit<Insurance, "id" | "createdAt" | "updatedAt">>
    ): Promise<Insurance | null> {
      const insurance = await this.getById(id);
      if (!insurance) return null;

      const beforeValue = JSON.stringify(insurance);

      const updatedInsurance: Insurance = {
        ...insurance,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`insurance:${id}`, updatedInsurance as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "insurance",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedInsurance),
        insuranceId: id,
      });

      return updatedInsurance;
    },

    async delete(id: string): Promise<boolean> {
      const insurance = await this.getById(id);
      if (!insurance) return false;

      // Check if insurance is associated with any cars
      const cars = await db.cars.getAll();
      const associatedCars = cars.filter((car) => car.insuranceId === id);

      if (associatedCars.length > 0) {
        throw new Error("Cannot delete insurance with associated cars");
      }

      await redis.del(`insurance:${id}`);
      await redis.srem("insurance", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "insurance",
        adminName: "System",
        beforeValue: JSON.stringify(insurance),
        insuranceId: id,
      });

      return true;
    },
  },

  // Service operations
  services: {
    async getAll(): Promise<Service[]> {
      const serviceIds = await redis.smembers("services");
      if (!serviceIds.length) return [];

      const services = await Promise.all(
        serviceIds.map(async (id) => {
          const service = await redis.hgetall(`service:${id}`);
          return service as unknown as Service;
        })
      );

      return services.filter(Boolean);
    },

    async getById(id: string): Promise<Service | null> {
      const service = await redis.hgetall(`service:${id}`);
      if (!service || Object.keys(service).length === 0) return null;
      return Object.keys(service).length
        ? (service as unknown as Service)
        : null;
    },

    async create(
      service: Omit<Service, "id" | "createdAt" | "updatedAt">
    ): Promise<Service> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newService: Service = {
        id,
        ...service,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`service:${id}`, newService as any);
      await redis.sadd("services", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "services",
        adminName: "System",
        afterValue: JSON.stringify(newService),
        serviceId: id,
      });

      return newService;
    },

    async update(
      id: string,
      data: Partial<Omit<Service, "id" | "createdAt" | "updatedAt">>
    ): Promise<Service | null> {
      const service = await this.getById(id);
      if (!service) return null;

      const beforeValue = JSON.stringify(service);

      const updatedService: Service = {
        ...service,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`service:${id}`, updatedService as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "services",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedService),
        serviceId: id,
      });

      return updatedService;
    },

    async delete(id: string): Promise<boolean> {
      const service = await this.getById(id);
      if (!service) return false;

      // Check if service is used in any maintenance requests
      const maintenanceRequests = await db.maintenance.getAll();
      const associatedRequests = maintenanceRequests.filter((request) =>
        request.servicesUsed.some((s) => s.serviceId === id)
      );

      if (associatedRequests.length > 0) {
        throw new Error("Cannot delete service used in maintenance requests");
      }

      await redis.del(`service:${id}`);
      await redis.srem("services", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "services",
        adminName: "System",
        beforeValue: JSON.stringify(service),
        serviceId: id,
      });

      return true;
    },
  },

  // Product operations
  products: {
    async getAll(): Promise<Product[]> {
      const productIds = await redis.smembers("products");
      if (!productIds.length) return [];

      const products = await Promise.all(
        productIds.map(async (id) => {
          const product = await redis.hgetall(`product:${id}`);
          return product as unknown as Product;
        })
      );

      return products.filter(Boolean);
    },

    async getById(id: string): Promise<Product | null> {
      const product = await redis.hgetall(`product:${id}`);

      if (!product || Object.keys(product).length === 0) return null;
      return Object.keys(product).length
        ? (product as unknown as Product)
        : null;
    },

    async create(
      product: Omit<Product, "id" | "createdAt" | "updatedAt">
    ): Promise<Product> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Check if supplier exists
      const supplier = await db.suppliers.getById(product.supplierId);
      if (!supplier) {
        throw new Error(
          `Supplier with ID ${product.supplierId} does not exist`
        );
      }

      const newProduct: Product = {
        id,
        ...product,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`product:${id}`, newProduct as any);
      await redis.sadd("products", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "products",
        adminName: "System",
        afterValue: JSON.stringify(newProduct),
        productId: id,
      });

      return newProduct;
    },

    async update(
      id: string,
      data: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
    ): Promise<Product | null> {
      const product = await this.getById(id);
      if (!product) return null;

      const beforeValue = JSON.stringify(product);

      // Check if supplier exists if changing supplier
      if (data.supplierId && data.supplierId !== product.supplierId) {
        const supplier = await db.suppliers.getById(data.supplierId);
        if (!supplier) {
          throw new Error(`Supplier with ID ${data.supplierId} does not exist`);
        }
      }

      const updatedProduct: Product = {
        ...product,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`product:${id}`, updatedProduct as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "products",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedProduct),
        productId: id,
      });

      return updatedProduct;
    },

    async delete(id: string): Promise<boolean> {
      const product = await this.getById(id);
      if (!product) return false;

      // Check if product is used in any maintenance requests
      const maintenanceRequests = await db.maintenance.getAll();
      const associatedRequests = maintenanceRequests.filter((request) =>
        request.productsUsed.some((p) => p.productId === id)
      );

      if (associatedRequests.length > 0) {
        throw new Error("Cannot delete product used in maintenance requests");
      }

      await redis.del(`product:${id}`);
      await redis.srem("products", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "products",
        adminName: "System",
        beforeValue: JSON.stringify(product),
        productId: id,
      });

      return true;
    },

    async transferStock(
      id: string,
      quantity: number,
      from: "warehouse" | "shop",
      to: "warehouse" | "shop"
    ): Promise<Product | null> {
      const product = await this.getById(id);
      if (!product) return null;

      if (from === to) {
        throw new Error("Cannot transfer to the same location");
      }

      const beforeValue = JSON.stringify(product);

      // Check if source has enough stock
      if (from === "warehouse" && product.warehouseStock < quantity) {
        throw new Error("Not enough stock in warehouse");
      } else if (from === "shop" && product.shopStock < quantity) {
        throw new Error("Not enough stock in shop");
      }

      const updatedProduct: Product = {
        ...product,
        warehouseStock:
          from === "warehouse"
            ? product.warehouseStock - quantity
            : product.warehouseStock + quantity,
        shopStock:
          from === "shop"
            ? product.shopStock - quantity
            : product.shopStock + quantity,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`product:${id}`, updatedProduct as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "products",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedProduct),
        productId: id,
      });

      return updatedProduct;
    },

    async checkLowStock(): Promise<Product[]> {
      const products = await this.getAll();
      return products.filter(
        (product) =>
          product.warehouseStock + product.shopStock <=
          product.lowStockThreshold
      );
    },
  },

  // Supplier operations
  suppliers: {
    async getAll(): Promise<Supplier[]> {
      const supplierIds = await redis.smembers("suppliers");
      if (!supplierIds.length) return [];

      const suppliers = await Promise.all(
        supplierIds.map(async (id) => {
          const supplier = await redis.hgetall(`supplier:${id}`);
          return supplier as unknown as Supplier;
        })
      );

      return suppliers.filter(Boolean);
    },

    async getById(id: string): Promise<Supplier | null> {
      const supplier = await redis.hgetall(`supplier:${id}`);

      if (!supplier || Object.keys(supplier).length === 0) return null;
      return Object.keys(supplier).length
        ? (supplier as unknown as Supplier)
        : null;
    },

    async create(
      supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">
    ): Promise<Supplier> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newSupplier: Supplier = {
        id,
        ...supplier,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`supplier:${id}`, newSupplier as any);
      await redis.sadd("suppliers", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "suppliers",
        adminName: "System",
        afterValue: JSON.stringify(newSupplier),
      });

      return newSupplier;
    },

    async update(
      id: string,
      data: Partial<Omit<Supplier, "id" | "createdAt" | "updatedAt">>
    ): Promise<Supplier | null> {
      const supplier = await this.getById(id);
      if (!supplier) return null;

      const beforeValue = JSON.stringify(supplier);

      const updatedSupplier: Supplier = {
        ...supplier,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`supplier:${id}`, updatedSupplier as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "suppliers",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedSupplier),
      });

      return updatedSupplier;
    },

    async delete(id: string): Promise<boolean> {
      const supplier = await this.getById(id);
      if (!supplier) return false;

      // Check if supplier has associated products
      const products = await db.products.getAll();
      const associatedProducts = products.filter(
        (product) => product.supplierId === id
      );

      if (associatedProducts.length > 0) {
        throw new Error("Cannot delete supplier with associated products");
      }

      await redis.del(`supplier:${id}`);
      await redis.srem("suppliers", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "suppliers",
        adminName: "System",
        beforeValue: JSON.stringify(supplier),
      });

      return true;
    },
  },

  // Maintenance operations
  maintenance: {
    async getAll(): Promise<MaintenanceRequest[]> {
      const maintenanceIds = await redis.smembers("maintenance");
      if (!maintenanceIds.length) return [];

      const maintenanceRequests = await Promise.all(
        maintenanceIds.map(async (id) => {
          const request = await redis.hgetall(`maintenance:${id}`);
          return request as unknown as MaintenanceRequest;
        })
      );

      return maintenanceRequests.filter(Boolean);
    },

    async getById(id: string): Promise<MaintenanceRequest | null> {
      const request = await redis.hgetall(`maintenance:${id}`);

      if (!request || Object.keys(request).length === 0) return null;
      return Object.keys(request).length
        ? (request as unknown as MaintenanceRequest)
        : null;
    },

    async getByCarUin(carUin: string): Promise<MaintenanceRequest[]> {
      const requests = await this.getAll();
      return requests.filter((request) => request.carUin === carUin);
    },

    async getByClientId(clientId: string): Promise<MaintenanceRequest[]> {
      const requests = await this.getAll();
      return requests.filter((request) => request.clientId === clientId);
    },

    async create(
      request: Omit<
        MaintenanceRequest,
        "id" | "totalCost" | "remainingBalance" | "createdAt" | "updatedAt"
      >
    ): Promise<MaintenanceRequest> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Check if car exists
      const car = await db.cars.getByUin(request.carUin);
      if (!car) {
        throw new Error(`Car with UIN ${request.carUin} does not exist`);
      }

      // Check if client exists
      const client = await db.clients.getById(request.clientId);
      if (!client) {
        throw new Error(`Client with ID ${request.clientId} does not exist`);
      }

      // Check if services exist and calculate service cost
      let serviceCost = 0;
      for (const serviceUsed of request.servicesUsed) {
        const service = await db.services.getById(serviceUsed.serviceId);
        if (!service) {
          throw new Error(
            `Service with ID ${serviceUsed.serviceId} does not exist`
          );
        }
        serviceCost += service.standardFee * serviceUsed.quantity;
      }

      // Check if products exist, have enough stock, and calculate product cost
      let productCost = 0;
      for (const productUsed of request.productsUsed) {
        const product = await db.products.getById(productUsed.productId);
        if (!product) {
          throw new Error(
            `Product with ID ${productUsed.productId} does not exist`
          );
        }

        // Check stock
        if (
          productUsed.stockSource === "warehouse" &&
          product.warehouseStock < productUsed.quantity
        ) {
          throw new Error(
            `Not enough warehouse stock for product ${product.name}`
          );
        } else if (
          productUsed.stockSource === "shop" &&
          product.shopStock < productUsed.quantity
        ) {
          throw new Error(`Not enough shop stock for product ${product.name}`);
        }

        productCost += product.salePrice * productUsed.quantity;

        // Update product stock
        if (productUsed.stockSource === "warehouse") {
          await db.products.update(productUsed.productId, {
            warehouseStock: product.warehouseStock - productUsed.quantity,
          });
        } else {
          await db.products.update(productUsed.productId, {
            shopStock: product.shopStock - productUsed.quantity,
          });
        }
      }

      // Calculate total cost
      const totalCost =
        serviceCost +
        productCost +
        (request.additionalFee || 0) -
        (request.discount || 0);
      const remainingBalance = totalCost - (request.paidAmount || 0);

      const newRequest: MaintenanceRequest = {
        id,
        ...request,
        totalCost,
        remainingBalance,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`maintenance:${id}`, newRequest as any);
      await redis.sadd("maintenance", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "maintenance",
        adminName: "System",
        afterValue: JSON.stringify(newRequest),
        maintenanceId: id,
        clientId: request.clientId,
        carUin: request.carUin,
        startDate: request.startDate,
        paymentAmount: request.paidAmount,
        discount: request.discount,
        additionalFees: request.additionalFee,
        remainingBalance,
      });

      return newRequest;
    },

    async update(
      id: string,
      data: Partial<
        Omit<
          MaintenanceRequest,
          "id" | "totalCost" | "remainingBalance" | "createdAt" | "updatedAt"
        >
      >
    ): Promise<MaintenanceRequest | null> {
      const request = await this.getById(id);
      if (!request) return null;

      const beforeValue = JSON.stringify(request);

      // Recalculate costs if services or products changed
      let totalCost = request.totalCost;

      if (data.servicesUsed) {
        // Calculate new service cost
        let serviceCost = 0;
        for (const serviceUsed of data.servicesUsed) {
          const service = await db.services.getById(serviceUsed.serviceId);
          if (!service) {
            throw new Error(
              `Service with ID ${serviceUsed.serviceId} does not exist`
            );
          }
          serviceCost += service.standardFee * serviceUsed.quantity;
        }

        // Adjust total cost by removing old service costs and adding new ones
        // This is a simplification - in a real system you'd need to track the original costs
        const oldServiceCost = request.servicesUsed.reduce(
          async (acc, serviceUsed) => {
            const service = await db.services.getById(serviceUsed.serviceId);
            return (
              (await acc) +
              (service ? service.standardFee * serviceUsed.quantity : 0)
            );
          },
          Promise.resolve(0)
        );

        totalCost = totalCost - (await oldServiceCost) + serviceCost;
      }

      if (data.productsUsed) {
        // Handle product stock changes
        // First, return the old products to stock
        for (const productUsed of request.productsUsed) {
          const product = await db.products.getById(productUsed.productId);
          if (product) {
            if (productUsed.stockSource === "warehouse") {
              await db.products.update(productUsed.productId, {
                warehouseStock: product.warehouseStock + productUsed.quantity,
              });
            } else {
              await db.products.update(productUsed.productId, {
                shopStock: product.shopStock + productUsed.quantity,
              });
            }
          }
        }

        // Then, deduct the new products from stock
        let productCost = 0;
        for (const productUsed of data.productsUsed) {
          const product = await db.products.getById(productUsed.productId);
          if (!product) {
            throw new Error(
              `Product with ID ${productUsed.productId} does not exist`
            );
          }

          // Check stock
          if (
            productUsed.stockSource === "warehouse" &&
            product.warehouseStock < productUsed.quantity
          ) {
            throw new Error(
              `Not enough warehouse stock for product ${product.name}`
            );
          } else if (
            productUsed.stockSource === "shop" &&
            product.shopStock < productUsed.quantity
          ) {
            throw new Error(
              `Not enough shop stock for product ${product.name}`
            );
          }

          productCost += product.salePrice * productUsed.quantity;

          // Update product stock
          if (productUsed.stockSource === "warehouse") {
            await db.products.update(productUsed.productId, {
              warehouseStock: product.warehouseStock - productUsed.quantity,
            });
          } else {
            await db.products.update(productUsed.productId, {
              shopStock: product.shopStock - productUsed.quantity,
            });
          }
        }

        // Adjust total cost by removing old product costs and adding new ones
        // This is a simplification - in a real system you'd need to track the original costs
        const oldProductCost = request.productsUsed.reduce(
          async (acc, productUsed) => {
            const product = await db.products.getById(productUsed.productId);
            return (
              (await acc) + (product ? product.salePrice * productUsed.quantity : 0)
            );
          },
          Promise.resolve(0)
        );

        totalCost = totalCost - (await oldProductCost) + productCost;
      }

      // Adjust for changes in additional fee or discount
      if (data.additionalFee !== undefined) {
        totalCost =
          totalCost - (request.additionalFee || 0) + (data.additionalFee || 0);
      }

      if (data.discount !== undefined) {
        totalCost = totalCost + (request.discount || 0) - (data.discount || 0);
      }

      // Calculate new remaining balance
      const paidAmount =
        data.paidAmount !== undefined ? data.paidAmount : request.paidAmount;
      const remainingBalance = totalCost - paidAmount;

      // Update payment status based on remaining balance
      let paymentStatus = request.paymentStatus;
      if (remainingBalance <= 0) {
        paymentStatus = "paid";
      } else if (paidAmount > 0) {
        paymentStatus = "partial";
      } else {
        paymentStatus = "pending";
      }

      const updatedRequest: MaintenanceRequest = {
        ...request,
        ...data,
        totalCost,
        remainingBalance,
        paymentStatus,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`maintenance:${id}`, updatedRequest as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "maintenance",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedRequest),
        maintenanceId: id,
        clientId: updatedRequest.clientId,
        carUin: updatedRequest.carUin,
        startDate: updatedRequest.startDate,
        endDate: updatedRequest.endDate,
        paymentAmount: data.paidAmount,
        discount: data.discount,
        additionalFees: data.additionalFee,
        remainingBalance,
      });

      return updatedRequest;
    },

    async delete(id: string): Promise<boolean> {
      const request = await this.getById(id);
      if (!request) return false;

      // Return products to stock
      for (const productUsed of request.productsUsed) {
        const product = await db.products.getById(productUsed.productId);
        if (product) {
          if (productUsed.stockSource === "warehouse") {
            await db.products.update(productUsed.productId, {
              warehouseStock: product.warehouseStock + productUsed.quantity,
            });
          } else {
            await db.products.update(productUsed.productId, {
              shopStock: product.shopStock + productUsed.quantity,
            });
          }
        }
      }

      await redis.del(`maintenance:${id}`);
      await redis.srem("maintenance", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "maintenance",
        adminName: "System",
        beforeValue: JSON.stringify(request),
        maintenanceId: id,
        clientId: request.clientId,
        carUin: request.carUin,
      });

      return true;
    },

    async makePayment(
      id: string,
      amount: number
    ): Promise<MaintenanceRequest | null> {
      const request = await this.getById(id);
      if (!request) return null;

      if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      const beforeValue = JSON.stringify(request);

      const newPaidAmount = request.paidAmount + amount;
      const newRemainingBalance = request.totalCost - newPaidAmount;

      let newPaymentStatus = "pending";
      if (newRemainingBalance <= 0) {
        newPaymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "partial";
      }

      const updatedRequest: MaintenanceRequest = {
        ...request,
        paidAmount: newPaidAmount,
        remainingBalance: newRemainingBalance,
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`maintenance:${id}`, updatedRequest as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "maintenance",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedRequest),
        maintenanceId: id,
        clientId: request.clientId,
        carUin: request.carUin,
        paymentAmount: amount,
        remainingBalance: newRemainingBalance,
      });

      return updatedRequest;
    },

    async getByDateRange(
      startDate: string,
      endDate?: string,
      granularity: 'day' | 'week' | 'month' | 'year' = 'day'
    ): Promise<MaintenanceRequest[]> {
      const requests = await this.getAll();
      let start = new Date(startDate);
      let end: Date;
    
      if (endDate) {
        end = new Date(endDate);
      } else {
        // Compute range based on granularity
        switch (granularity) {
          case 'day': {
            const startOfDay = new Date(start);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(start);
            endOfDay.setHours(23, 59, 59, 999);
            start = startOfDay;
            end = endOfDay;
            break;
          }
          case 'week': {
            // Assuming week starts on Sunday.
            const dayOfWeek = start.getDay();
            const startOfWeek = new Date(start);
            startOfWeek.setDate(start.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            start = startOfWeek;
            end = endOfWeek;
            break;
          }
          case 'month': {
            const startOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
            const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            start = startOfMonth;
            end = endOfMonth;
            break;
          }
          case 'year': {
            const startOfYear = new Date(start.getFullYear(), 0, 1);
            const endOfYear = new Date(start.getFullYear(), 11, 31);
            endOfYear.setHours(23, 59, 59, 999);
            start = startOfYear;
            end = endOfYear;
            break;
          }
          default:
            throw new Error('Invalid granularity provided.');
        }
      }
    
      return requests.filter((request) => {
        const requestDate = new Date(request.createdAt);
        return requestDate >= start && requestDate <= end;
      });
    }
    ,
  },

  // Logging operations
  logs: {
    async getAll(): Promise<LogEntry[]> {
      const logIds = await redis.smembers("logs");
      if (!logIds.length) return [];

      const logs = await Promise.all(
        logIds.map(async (id) => {
          const log = await redis.hgetall(`log:${id}`);
          return log as unknown as LogEntry;
        })
      );

      return logs
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    },

    async getById(id: string): Promise<LogEntry | null> {
      const log = await redis.hgetall(`log:${id}`);

      if (!log || Object.keys(log).length === 0) return null;
      return Object.keys(log).length ? (log as unknown as LogEntry) : null;
    },

    async create(log: Omit<LogEntry, "id" | "timestamp">): Promise<LogEntry> {
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const newLog: LogEntry = {
        id,
        ...log,
        timestamp,
      };

      // Filter out keys with null or undefined values
      const filteredLog = Object.fromEntries(
        Object.entries(newLog).filter(([_, v]) => v !== null && v !== undefined)
      );

      await redis.hset(`log:${id}`, filteredLog as any);
      await redis.sadd("logs", id);

      return newLog;
    },

    async getFiltered(filters: Partial<LogEntry>): Promise<LogEntry[]> {
      const logs = await this.getAll();

      return logs.filter((log) => {
        for (const [key, value] of Object.entries(filters)) {
          if (log[key as keyof LogEntry] !== value) {
            return false;
          }
        }
        return true;
      });
    },

    async getByDateRange(
      startDate: string,
      endDate?: string,
      granularity: "day" | "week" | "month" | "year" = "day"
    ): Promise<LogEntry[]> {
      const logs = await this.getAll();
      let start = new Date(startDate);
      let end: Date;

      if (endDate) {
        end = new Date(endDate);
      } else {
        // When no endDate is provided, set the range based on the chosen granularity.
        switch (granularity) {
          case "day": {
            const startOfDay = new Date(start);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(start);
            endOfDay.setHours(23, 59, 59, 999);
            start = startOfDay;
            end = endOfDay;
            break;
          }
          case "week": {
            // Here we assume the week starts on Sunday.
            const dayOfWeek = start.getDay(); // 0 (Sun) to 6 (Sat)
            const startOfWeek = new Date(start);
            startOfWeek.setDate(start.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            start = startOfWeek;
            end = endOfWeek;
            break;
          }
          case "month": {
            const startOfMonth = new Date(
              start.getFullYear(),
              start.getMonth(),
              1
            );
            const endOfMonth = new Date(
              start.getFullYear(),
              start.getMonth() + 1,
              0
            );
            endOfMonth.setHours(23, 59, 59, 999);
            start = startOfMonth;
            end = endOfMonth;
            break;
          }
          case "year": {
            const startOfYear = new Date(start.getFullYear(), 0, 1);
            const endOfYear = new Date(start.getFullYear(), 11, 31);
            endOfYear.setHours(23, 59, 59, 999);
            start = startOfYear;
            end = endOfYear;
            break;
          }
          default:
            throw new Error("Invalid granularity provided.");
        }
      }

      return logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    },
  },

  // Employee operations
  employees: {
    async getAll(): Promise<Employee[]> {
      const employeeIds = await redis.smembers("employees");
      if (!employeeIds.length) return [];

      const employees = await Promise.all(
        employeeIds.map(async (id) => {
          const employee = await redis.hgetall(`employee:${id}`);
          return employee as unknown as Employee;
        })
      );

      return employees.filter(Boolean);
    },

    async getById(id: string): Promise<Employee | null> {
      const employee = await redis.hgetall(`employee:${id}`);
      if (!employee || Object.keys(employee).length === 0) return null;
      return employee as unknown as Employee;
    },

    async create(
      employee: Omit<Employee, "id" | "createdAt" | "updatedAt">
    ): Promise<Employee> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newEmployee: Employee = {
        id,
        ...employee,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`employee:${id}`, newEmployee as any);
      await redis.sadd("employees", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "employees",
        adminName: "System",
        afterValue: JSON.stringify(newEmployee),
      });

      return newEmployee;
    },

    async update(
      id: string,
      data: Partial<Omit<Employee, "id" | "createdAt" | "updatedAt">>
    ): Promise<Employee | null> {
      const employee = await this.getById(id);
      if (!employee) return null;

      const beforeValue = JSON.stringify(employee);

      const updatedEmployee: Employee = {
        ...employee,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`employee:${id}`, updatedEmployee as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "employees",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedEmployee),
      });

      return updatedEmployee;
    },

    async delete(id: string): Promise<boolean> {
      const employee = await this.getById(id);
      if (!employee) return false;

      // Check if employee has salaries
      const employeeSalaries = await db.salaries.getByEmployeeId(id);
      if (employeeSalaries.length > 0) {
        throw new Error("Cannot delete employee with associated salaries");
      }

      await redis.del(`employee:${id}`);
      await redis.srem("employees", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "employees",
        adminName: "System",
        beforeValue: JSON.stringify(employee),
      });

      return true;
    },
  },

  // Salary operations
  salaries: {
    async getAll(): Promise<Salary[]> {
      const salaryIds = await redis.smembers("salaries");
      if (!salaryIds.length) return [];

      const salaries = await Promise.all(
        salaryIds.map(async (id) => {
          const salary = await redis.hgetall(`salary:${id}`);
          return salary as unknown as Salary;
        })
      );

      return salaries.filter(Boolean);
    },

    async getById(id: string): Promise<Salary | null> {
      const salary = await redis.hgetall(`salary:${id}`);
      if (!salary || Object.keys(salary).length === 0) return null;
      return salary as unknown as Salary;
    },

    async getByEmployeeId(employeeId: string): Promise<Salary[]> {
      const salaries = await this.getAll();
      return salaries.filter((salary) => salary.employeeId === employeeId);
    },

    async create(
      salary: Omit<Salary, "id" | "createdAt" | "updatedAt">
    ): Promise<Salary> {
      // Validate employee exists
      const employee = await db.employees.getById(salary.employeeId);
      if (!employee) {
        throw new Error(`Employee with ID ${salary.employeeId} does not exist`);
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newSalary: Salary = {
        id,
        ...salary,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`salary:${id}`, newSalary as any);
      await redis.sadd("salaries", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "salaries",
        adminName: "System",
        afterValue: JSON.stringify(newSalary),
      });

      // If the salary is paid, create a finance record for it
      if (newSalary.isPaid) {
        // Find or create expense category for salaries
        let salaryCategoryId = "";
        const categories = await db.financeCategories.getAll();
        const salaryCategory = categories.find(
          (cat) => cat.type === "expense" && cat.name === "Employee Salaries"
        );

        if (salaryCategory) {
          salaryCategoryId = salaryCategory.id;
        } else {
          const newCategory = await db.financeCategories.create({
            name: "Employee Salaries",
            type: "expense",
            description: "Salary payments to employees",
            isDefault: true,
          });
          salaryCategoryId = newCategory.id;
        }

        // Create finance expense record for the salary
        await db.financeRecords.create({
          categoryId: salaryCategoryId,
          amount: newSalary.amount,
          description: `Salary payment for ${employee.name} (${newSalary.paymentPeriod})`,
          date: newSalary.paymentDate,
          relatedEntityType: "salary",
          relatedEntityId: id,
          paymentMethod: "bank_transfer",
          notes: newSalary.notes,
          createdBy: "System",
        });
      }

      return newSalary;
    },

    async update(
      id: string,
      data: Partial<Omit<Salary, "id" | "createdAt" | "updatedAt">>
    ): Promise<Salary | null> {
      const salary = await this.getById(id);
      if (!salary) return null;

      // If changing employee, validate new employee exists
      if (data.employeeId && data.employeeId !== salary.employeeId) {
        const employee = await db.employees.getById(data.employeeId);
        if (!employee) {
          throw new Error(`Employee with ID ${data.employeeId} does not exist`);
        }
      }

      const beforeValue = JSON.stringify(salary);
      const wasNotPaid = !salary.isPaid;

      const updatedSalary: Salary = {
        ...salary,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`salary:${id}`, updatedSalary as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "salaries",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedSalary),
      });

      // If the salary was not paid before and is now paid, create a finance record
      if (wasNotPaid && updatedSalary.isPaid) {
        const employee = await db.employees.getById(updatedSalary.employeeId);
        
        // Find or create expense category for salaries
        let salaryCategoryId = "";
        const categories = await db.financeCategories.getAll();
        const salaryCategory = categories.find(
          (cat) => cat.type === "expense" && cat.name === "Employee Salaries"
        );

        if (salaryCategory) {
          salaryCategoryId = salaryCategory.id;
        } else {
          const newCategory = await db.financeCategories.create({
            name: "Employee Salaries",
            type: "expense",
            description: "Salary payments to employees",
            isDefault: true,
          });
          salaryCategoryId = newCategory.id;
        }

        // Create finance expense record for the salary
        await db.financeRecords.create({
          categoryId: salaryCategoryId,
          amount: updatedSalary.amount,
          description: `Salary payment for ${employee?.name || "Employee"} (${updatedSalary.paymentPeriod})`,
          date: updatedSalary.paymentDate,
          relatedEntityType: "salary",
          relatedEntityId: id,
          paymentMethod: "bank_transfer",
          notes: updatedSalary.notes,
          createdBy: "System",
        });
      }

      return updatedSalary;
    },

    async delete(id: string): Promise<boolean> {
      const salary = await this.getById(id);
      if (!salary) return false;

      await redis.del(`salary:${id}`);
      await redis.srem("salaries", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "salaries",
        adminName: "System",
        beforeValue: JSON.stringify(salary),
      });

      // If the salary was paid, find and delete related finance records
      if (salary.isPaid) {
        const financeRecords = await db.financeRecords.getAll();
        const relatedRecords = financeRecords.filter(
          (record) => 
            record.relatedEntityType === "salary" && 
            record.relatedEntityId === id
        );

        // Delete related finance records
        for (const record of relatedRecords) {
          await db.financeRecords.delete(record.id);
        }
      }

      return true;
    },

    async getByDateRange(
      startDate: string,
      endDate?: string,
      granularity: "day" | "week" | "month" | "year" = "day"
    ): Promise<Salary[]> {
      const salaries = await this.getAll();
      let start = new Date(startDate);
      let end: Date;

      if (endDate) {
        end = new Date(endDate);
      } else {
        // Compute range based on granularity
        switch (granularity) {
          case "day": {
            const startOfDay = new Date(start);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(start);
            endOfDay.setHours(23, 59, 59, 999);
            start = startOfDay;
            end = endOfDay;
            break;
          }
          case "week": {
            // Assuming week starts on Sunday.
            const dayOfWeek = start.getDay();
            const startOfWeek = new Date(start);
            startOfWeek.setDate(start.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            start = startOfWeek;
            end = endOfWeek;
            break;
          }
          case "month": {
            const startOfMonth = new Date(
              start.getFullYear(),
              start.getMonth(),
              1
            );
            const endOfMonth = new Date(
              start.getFullYear(),
              start.getMonth() + 1,
              0
            );
            endOfMonth.setHours(23, 59, 59, 999);
            start = startOfMonth;
            end = endOfMonth;
            break;
          }
          case "year": {
            const startOfYear = new Date(start.getFullYear(), 0, 1);
            const endOfYear = new Date(start.getFullYear(), 11, 31);
            endOfYear.setHours(23, 59, 59, 999);
            start = startOfYear;
            end = endOfYear;
            break;
          }
          default:
            throw new Error("Invalid granularity provided.");
        }
      }

      return salaries.filter((salary) => {
        const paymentDate = new Date(salary.paymentDate);
        return paymentDate >= start && paymentDate <= end;
      });
    },
  },

  // Finance Category operations
  financeCategories: {
    async getAll(): Promise<FinanceCategory[]> {
      const categoryIds = await redis.smembers("financeCategories");
      if (!categoryIds.length) return [];

      const categories = await Promise.all(
        categoryIds.map(async (id) => {
          const category = await redis.hgetall(`financeCategory:${id}`);
          return category as unknown as FinanceCategory;
        })
      );

      return categories.filter(Boolean);
    },

    async getById(id: string): Promise<FinanceCategory | null> {
      const category = await redis.hgetall(`financeCategory:${id}`);
      if (!category || Object.keys(category).length === 0) return null;
      return category as unknown as FinanceCategory;
    },

    async getByType(type: "income" | "expense"): Promise<FinanceCategory[]> {
      const categories = await this.getAll();
      return categories.filter(category => category.type === type);
    },

    async create(
      category: Omit<FinanceCategory, "id" | "createdAt" | "updatedAt">
    ): Promise<FinanceCategory> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newCategory: FinanceCategory = {
        id,
        ...category,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`financeCategory:${id}`, newCategory as any);
      await redis.sadd("financeCategories", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "financeCategories",
        adminName: "System",
        afterValue: JSON.stringify(newCategory),
      });

      return newCategory;
    },

    async update(
      id: string,
      data: Partial<Omit<FinanceCategory, "id" | "createdAt" | "updatedAt">>
    ): Promise<FinanceCategory | null> {
      const category = await this.getById(id);
      if (!category) return null;

      const beforeValue = JSON.stringify(category);

      const updatedCategory: FinanceCategory = {
        ...category,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`financeCategory:${id}`, updatedCategory as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "financeCategories",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedCategory),
      });

      return updatedCategory;
    },

    async delete(id: string): Promise<boolean> {
      const category = await this.getById(id);
      if (!category) return false;

      // Check if category has finance records
      const records = await db.financeRecords.getAll();
      const relatedRecords = records.filter(
        (record) => record.categoryId === id
      );

      if (relatedRecords.length > 0) {
        throw new Error(
          "Cannot delete category with associated finance records"
        );
      }

      await redis.del(`financeCategory:${id}`);
      await redis.srem("financeCategories", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "financeCategories",
        adminName: "System",
        beforeValue: JSON.stringify(category),
      });

      return true;
    },
  },

  // Finance Record operations
  financeRecords: {
    async getAll(): Promise<FinanceRecord[]> {
      const recordIds = await redis.smembers("financeRecords");
      if (!recordIds.length) return [];

      const records = await Promise.all(
        recordIds.map(async (id) => {
          const record = await redis.hgetall(`financeRecord:${id}`);
          return record as unknown as FinanceRecord;
        })
      );

      return records.filter(Boolean);
    },

    async getById(id: string): Promise<FinanceRecord | null> {
      const record = await redis.hgetall(`financeRecord:${id}`);
      if (!record || Object.keys(record).length === 0) return null;
      return record as unknown as FinanceRecord;
    },

    async getByCategoryId(categoryId: string): Promise<FinanceRecord[]> {
      const records = await this.getAll();
      return records.filter((record) => record.categoryId === categoryId);
    },

    async getByType(type: "income" | "expense"): Promise<FinanceRecord[]> {
      const records = await this.getAll();
      const categories = await db.financeCategories.getAll();
      
      // Create a map of category IDs to their types for faster lookup
      const categoryTypeMap = new Map<string, "income" | "expense">();
      categories.forEach(category => {
        categoryTypeMap.set(category.id, category.type);
      });
      
      return records.filter((record) => {
        const categoryType = categoryTypeMap.get(record.categoryId);
        return categoryType === type;
      });
    },

    async create(
      record: Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">
    ): Promise<FinanceRecord> {
      // Validate category exists
      const category = await db.financeCategories.getById(record.categoryId);
      if (!category) {
        throw new Error(`Finance category with ID ${record.categoryId} does not exist`);
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newRecord: FinanceRecord = {
        id,
        ...record,
        createdAt: now,
        updatedAt: now,
      };

      await redis.hset(`financeRecord:${id}`, newRecord as any);
      await redis.sadd("financeRecords", id);

      // Log the action
      await db.logs.create({
        actionType: "create",
        tableName: "financeRecords",
        adminName: "System",
        afterValue: JSON.stringify(newRecord),
      });

      return newRecord;
    },

    async update(
      id: string,
      data: Partial<Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">>
    ): Promise<FinanceRecord | null> {
      const record = await this.getById(id);
      if (!record) return null;

      // If changing category, validate new category exists
      if (data.categoryId && data.categoryId !== record.categoryId) {
        const category = await db.financeCategories.getById(data.categoryId);
        if (!category) {
          throw new Error(`Finance category with ID ${data.categoryId} does not exist`);
        }
      }

      const beforeValue = JSON.stringify(record);

      const updatedRecord: FinanceRecord = {
        ...record,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await redis.hset(`financeRecord:${id}`, updatedRecord as any);

      // Log the action
      await db.logs.create({
        actionType: "update",
        tableName: "financeRecords",
        adminName: "System",
        beforeValue,
        afterValue: JSON.stringify(updatedRecord),
      });

      return updatedRecord;
    },

    async delete(id: string): Promise<boolean> {
      const record = await this.getById(id);
      if (!record) return false;

      await redis.del(`financeRecord:${id}`);
      await redis.srem("financeRecords", id);

      // Log the action
      await db.logs.create({
        actionType: "delete",
        tableName: "financeRecords",
        adminName: "System",
        beforeValue: JSON.stringify(record),
      });

      return true;
    },

    async getByDateRange(
      startDate: string,
      endDate?: string,
      granularity: "day" | "week" | "month" | "year" = "day"
    ): Promise<FinanceRecord[]> {
      const records = await this.getAll();
      let start = new Date(startDate);
      let end: Date;

      if (endDate) {
        end = new Date(endDate);
      } else {
        // Compute range based on granularity
        switch (granularity) {
          case "day": {
            const startOfDay = new Date(start);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(start);
            endOfDay.setHours(23, 59, 59, 999);
            start = startOfDay;
            end = endOfDay;
            break;
          }
          case "week": {
            // Assuming week starts on Sunday.
            const dayOfWeek = start.getDay();
            const startOfWeek = new Date(start);
            startOfWeek.setDate(start.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            start = startOfWeek;
            end = endOfWeek;
            break;
          }
          case "month": {
            const startOfMonth = new Date(
              start.getFullYear(),
              start.getMonth(),
              1
            );
            const endOfMonth = new Date(
              start.getFullYear(),
              start.getMonth() + 1,
              0
            );
            endOfMonth.setHours(23, 59, 59, 999);
            start = startOfMonth;
            end = endOfMonth;
            break;
          }
          case "year": {
            const startOfYear = new Date(start.getFullYear(), 0, 1);
            const endOfYear = new Date(start.getFullYear(), 11, 31);
            endOfYear.setHours(23, 59, 59, 999);
            start = startOfYear;
            end = endOfYear;
            break;
          }
          default:
            throw new Error("Invalid granularity provided.");
        }
      }

      return records.filter((record) => {
        const recordDate = new Date(record.date);
        return recordDate >= start && recordDate <= end;
      });
    },

    async getFinancialSummary(
      startDate: string,
      endDate?: string,
      granularity: "day" | "week" | "month" | "year" = "month"
    ): Promise<{
      totalIncome: number;
      totalExpense: number;
      netBalance: number;
      incomeByCategory: Record<string, number>;
      expenseByCategory: Record<string, number>;
      timeSeriesData: Array<{
        period: string;
        income: number;
        expense: number;
        balance: number;
      }>;
    }> {
      // Get all finance records for the period
      const records = await this.getByDateRange(startDate, endDate, granularity);

      // Get all categories
      const categories = await db.financeCategories.getAll();
      const categoriesMap = new Map<string, FinanceCategory>();
      categories.forEach((category) => {
        categoriesMap.set(category.id, category);
      });

      // Calculate income and expense totals
      let totalIncome = 0;
      let totalExpense = 0;
      const incomeByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};

      // Process all records
      records.forEach((record) => {
        const category = categoriesMap.get(record.categoryId);
        if (!category) return; // Skip if category not found

        if (category.type === "income") {
          totalIncome += record.amount;
          incomeByCategory[category.name] = (incomeByCategory[category.name] || 0) + record.amount;
        } else {
          totalExpense += record.amount;
          expenseByCategory[category.name] = (expenseByCategory[category.name] || 0) + record.amount;
        }
      });

      // Calculate time series data based on granularity
      const timeSeriesData: Array<{
        period: string;
        income: number;
        expense: number;
        balance: number;
      }> = [];

      // Group records by period based on granularity
      const recordsByPeriod = new Map<string, FinanceRecord[]>();

      records.forEach((record) => {
        const date = new Date(record.date);
        let periodKey: string;

        switch (granularity) {
          case "day":
            periodKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
            break;
          case "week": {
            const dayOfWeek = date.getDay();
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - dayOfWeek);
            periodKey = startOfWeek.toISOString().split("T")[0]; // Start of week
            break;
          }
          case "month":
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            break;
          case "year":
            periodKey = String(date.getFullYear());
            break;
          default:
            periodKey = date.toISOString().split("T")[0]; // Default to day
        }

        if (!recordsByPeriod.has(periodKey)) {
          recordsByPeriod.set(periodKey, []);
        }
        recordsByPeriod.get(periodKey)?.push(record);
      });

      // Sort periods chronologically
      const sortedPeriods = Array.from(recordsByPeriod.keys()).sort();

      // Calculate totals for each period
      sortedPeriods.forEach((period) => {
        const periodRecords = recordsByPeriod.get(period) || [];
        
        let periodIncome = 0;
        let periodExpense = 0;

        periodRecords.forEach((record) => {
          const category = categoriesMap.get(record.categoryId);
          if (!category) return;

          if (category.type === "income") {
            periodIncome += record.amount;
          } else {
            periodExpense += record.amount;
          }
        });

        timeSeriesData.push({
          period,
          income: periodIncome,
          expense: periodExpense,
          balance: periodIncome - periodExpense,
        });
      });

      return {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        incomeByCategory,
        expenseByCategory,
        timeSeriesData,
      };
    },
  },
};
