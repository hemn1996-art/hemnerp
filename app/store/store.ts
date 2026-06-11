import { create } from "zustand";
import { currencies as mockCurrencies } from "../data/mockData";

interface StoreState {
  accounts: any[];
  accountTypes: any[];
  cashboxes: any[];
  products: any[];
  invoices: any[]; // Maps to DB Vouchers
  currencies: any[];
  warehouses: any[];
  
  // Actions to set state directly
  setAccounts: (accounts: any[]) => void;
  setAccountTypes: (accountTypes: any[]) => void;
  setCashboxes: (cashboxes: any[]) => void;
  setProducts: (products: any[]) => void;
  setInvoices: (invoices: any[]) => void;
  setCurrencies: (currencies: any[]) => void;
  setWarehouses: (warehouses: any[]) => void;
  
  // Async Fetchers
  fetchProducts: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchCurrencies: () => Promise<void>;
  fetchAccountTypes: () => Promise<void>;
  fetchCashboxes: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchWarehouses: () => Promise<void>;
  
  // Mutations
  addProduct: (productData: any) => Promise<any>;
  updateProduct: (productData: any) => Promise<any>;
  deleteProduct: (id: number) => Promise<boolean>;
  addAccount: (accountData: any) => Promise<any>;
  addAccountType: (accountTypeData: any) => Promise<any>;
  updateAccountType: (accountTypeData: any) => Promise<any>;
  deleteAccountType: (id: number) => Promise<boolean>;
  addCashbox: (cashboxData: { name: string; type: string; isActive?: boolean }) => Promise<any>;
  updateCashbox: (cashboxData: { id: number; name: string; type: string; isActive?: boolean }) => Promise<any>;
  deleteCashbox: (id: number) => Promise<boolean>;
  addWarehouse: (warehouseData: { name: string; color?: string; isMain?: boolean; isActive?: boolean }) => Promise<any>;
  updateWarehouse: (warehouseData: { id: number; name: string; color?: string; isMain?: boolean; isActive?: boolean }) => Promise<any>;
  deleteWarehouse: (id: number) => Promise<boolean>;
  addVoucher: (voucherData: any) => Promise<any>;
  updateVoucher: (id: number, voucherData: any) => Promise<any>;
}

export const useStore = create<StoreState>((set, get) => ({
  accounts: [],
  accountTypes: [],
  cashboxes: [],
  products: [],
  invoices: [],
  currencies: [],
  warehouses: [],

  setAccounts: (accounts) => set({ accounts }),
  setAccountTypes: (accountTypes) => set({ accountTypes }),
  setCashboxes: (cashboxes) => set({ cashboxes }),
  setProducts: (products) => set({ products }),
  setInvoices: (invoices) => set({ invoices }),
  setCurrencies: (currencies) => set({ currencies }),
  setWarehouses: (warehouses) => set({ warehouses }),

  fetchProducts: async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        set({ products: data });
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  },

  fetchAccounts: async () => {
    try {
      const res = await fetch(`/api/accounts?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        set({ accounts: data });
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    }
  },

  fetchCurrencies: async () => {
    try {
      const res = await fetch("/api/currencies");
      if (res.ok) {
        const data = await res.json();
        set({ currencies: data });
        
        // Sync mockData currencies in-place so components importing it get correct database IDs
        if (mockCurrencies) {
          mockCurrencies.length = 0;
          mockCurrencies.push(...data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch currencies", err);
    }
  },

  fetchAccountTypes: async () => {
    try {
      const res = await fetch("/api/account-types");
      if (res.ok) {
        const data = await res.json();
        set({ accountTypes: data });
      }
    } catch (err) {
      console.error("Failed to fetch account types", err);
    }
  },

  fetchCashboxes: async () => {
    try {
      const res = await fetch("/api/cashboxes");
      if (res.ok) {
        const data = await res.json();
        set({ cashboxes: data });
      }
    } catch (err) {
      console.error("Failed to fetch cashboxes", err);
    }
  },

  fetchWarehouses: async () => {
    try {
      const res = await fetch("/api/warehouses");
      if (res.ok) {
        const data = await res.json();
        set({ warehouses: data });
      }
    } catch (err) {
      console.error("Failed to fetch warehouses", err);
    }
  },

  fetchInvoices: async () => {
    try {
      const res = await fetch("/api/vouchers");
      if (res.ok) {
        const data = await res.json();
        
        // Map database vouchers to frontend invoice format
        const mappedInvoices = data.map((v: any) => {
          // Map types from DB English to UI Kurdish
          let uiType = v.type;
          if (v.type === "sales") uiType = "فرۆشتن";
          else if (v.type === "purchase") uiType = "کڕین";
          else if (v.type === "money_in") uiType = "پارەی هاتوو";
          else if (v.type === "money_out") uiType = "پارەی ڕۆشتوو";
          else if (v.type === "expense") uiType = "خەرجی";
          else if (v.type === "sales_return") uiType = "گەڕانەوەی فرۆشتن";
          else if (v.type === "purchase_return") uiType = "گەڕانەوەی کڕین";
          return {
            id: v.id,
            accountId: v.accountId,
            type: uiType,
            total: v.netAmount,
            paid: v.paidAmounts?.reduce((sum: number, pa: any) => sum + pa.amount, 0) || 0,
            date: v.date,
            referenceNo: v.referenceNo,
            accountName: v.account?.name || "",
            cashboxName: v.cashbox?.name || "",
            currencyCode: v.currency?.code || "USD",
            internalNote: v.internalNote,
            printNote: v.printNote,
            cashboxId: v.cashboxId,
            currencyId: v.currencyId,
            rawType: v.type,
            fromCashboxId: v.fromCashboxId,
            toCashboxId: v.toCashboxId,
            fromCashbox: v.fromCashbox,
            toCashbox: v.toCashbox,
            cashbox: v.cashbox,
            paidAmounts: v.paidAmounts,
            exchangeRate: v.exchangeRate,
            employeeName: v.employeeName,
            versions: v.versions || [],
          };
        });


        set({ invoices: mappedInvoices });
      }
    } catch (err) {
      console.error("Failed to fetch invoices/vouchers", err);
    }
  },

  addProduct: async (productData) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        const newProduct = await res.json();
        await get().fetchProducts();
        return newProduct;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Add product failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to create product", err);
    }
    return null;
  },

  updateProduct: async (productData) => {
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        const updatedProduct = await res.json();
        await get().fetchProducts();
        return updatedProduct;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Update product failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to update product", err);
    }
    return null;
  },

  deleteProduct: async (id) => {
    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await get().fetchProducts();
        return true;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Delete product failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to delete product", err);
    }
    return false;
  },

  addAccount: async (accountData) => {
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData),
      });
      if (res.ok) {
        const newAccount = await res.json();
        await get().fetchAccounts();
        return newAccount;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Add account failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to create account", err);
    }
    return null;
  },

  addAccountType: async (accountTypeData) => {
    try {
      const res = await fetch("/api/account-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountTypeData),
      });
      if (res.ok) {
        const newType = await res.json();
        await get().fetchAccountTypes();
        return newType;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Add account type failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to create account type", err);
    }
    return null;
  },

  updateAccountType: async (accountTypeData) => {
    try {
      const res = await fetch("/api/account-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountTypeData),
      });
      if (res.ok) {
        const updatedType = await res.json();
        await get().fetchAccountTypes();
        return updatedType;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Update account type failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to update account type", err);
    }
    return null;
  },

  deleteAccountType: async (id) => {
    try {
      const res = await fetch(`/api/account-types?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await get().fetchAccountTypes();
        return true;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Delete account type failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to delete account type", err);
    }
    return false;
  },

  addCashbox: async (cashboxData) => {
    try {
      const res = await fetch("/api/cashboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cashboxData),
      });
      if (res.ok) {
        const newCashbox = await res.json();
        const current = get().cashboxes;
        set({ cashboxes: [...current, newCashbox] });
        return newCashbox;
      }
    } catch (err) {
      console.error("Failed to create cashbox", err);
    }
    return null;
  },

  updateCashbox: async (cashboxData) => {
    try {
      const res = await fetch("/api/cashboxes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cashboxData),
      });
      if (res.ok) {
        const updated = await res.json();
        const current = get().cashboxes;
        set({
          cashboxes: current.map((c) => (c.id === updated.id ? updated : c)),
        });
        return updated;
      }
    } catch (err) {
      console.error("Failed to update cashbox", err);
    }
    return null;
  },

  deleteCashbox: async (id) => {
    try {
      const res = await fetch(`/api/cashboxes?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const current = get().cashboxes;
        set({ cashboxes: current.filter((c) => c.id !== id) });
        return true;
      }
    } catch (err) {
      console.error("Failed to delete cashbox", err);
    }
    return false;
  },

  addWarehouse: async (warehouseData) => {
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseData),
      });
      if (res.ok) {
        const newWarehouse = await res.json();
        // Fetch all warehouses to ensure inMain status transitions are correct
        await get().fetchWarehouses();
        return newWarehouse;
      }
    } catch (err) {
      console.error("Failed to create warehouse", err);
    }
    return null;
  },

  updateWarehouse: async (warehouseData) => {
    try {
      const res = await fetch("/api/warehouses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseData),
      });
      if (res.ok) {
        const updated = await res.json();
        await get().fetchWarehouses();
        return updated;
      }
    } catch (err) {
      console.error("Failed to update warehouse", err);
    }
    return null;
  },

  deleteWarehouse: async (id) => {
    try {
      const res = await fetch(`/api/warehouses?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const current = get().warehouses;
        set({ warehouses: current.filter((w) => w.id !== id) });
        return true;
      }
    } catch (err) {
      console.error("Failed to delete warehouse", err);
    }
    return false;
  },

  addVoucher: async (voucherData) => {
    try {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voucherData),
      });
      if (res.ok) {
        const createdVoucher = await res.json();
        
        // Refresh all data in the background without blocking the user
        Promise.all([
          get().fetchInvoices(),
          get().fetchCashboxes(),
          get().fetchAccounts(),
        ]).catch((err) => console.error("Failed to refresh data after addVoucher:", err));
        
        return createdVoucher;
      }
    } catch (err) {
      console.error("Failed to add voucher", err);
    }
    return null;
  },

  updateVoucher: async (id, voucherData) => {
    try {
      const res = await fetch(`/api/vouchers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voucherData),
      });
      if (res.ok) {
        const updatedVoucher = await res.json();
        
        // Refresh all data in the background without blocking the user
        Promise.all([
          get().fetchInvoices(),
          get().fetchCashboxes(),
          get().fetchAccounts(),
        ]).catch((err) => console.error("Failed to refresh data after updateVoucher:", err));
        
        return updatedVoucher;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Update voucher failed:", res.status, errBody);
        return null;
      }
    } catch (err) {
      console.error("Failed to update voucher", err);
    }
    return null;
  },
}));

// Legacy wrapper to avoid breaking other components until they are migrated
export const store = new Proxy({} as any, {
  get: (target, prop) => {
    return (useStore.getState() as any)[prop];
  },
  set: (target, prop, value) => {
    useStore.setState({ [prop]: value });
    return true;
  }
});