import { create } from "zustand";
import { currencies as mockCurrencies } from "../data/mockData";

interface UserPermission {
  id: number;
  userId: number;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface CurrentUser {
  id: number;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  phone?: string | null;
  canSeeOthersData?: boolean;
  allowedWarehouses?: string | null;
  allowedCashboxes?: string | null;
  permissions: UserPermission[];
}

interface StoreState {
  accounts: any[];
  accountTypes: any[];
  cashboxes: any[];
  products: any[];
  invoices: any[]; // Maps to DB Vouchers
  currencies: any[];
  warehouses: any[];
  
  // User & Auth
  currentUser: CurrentUser | null;
  userLoaded: boolean;
  
  // Actions to set state directly
  setAccounts: (accounts: any[]) => void;
  setAccountTypes: (accountTypes: any[]) => void;
  setCashboxes: (cashboxes: any[]) => void;
  setProducts: (products: any[]) => void;
  setInvoices: (invoices: any[]) => void;
  setCurrencies: (currencies: any[]) => void;
  setWarehouses: (warehouses: any[]) => void;
  
  // User actions
  fetchCurrentUser: () => Promise<void>;
  isAdmin: () => boolean;
  hasPermission: (module: string, action: "canView" | "canCreate" | "canUpdate" | "canDelete") => boolean;
  
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
  updateAccount: (accountData: any) => Promise<any>;
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

// Fallback: read user data from the user_session cookie (set at login)
// Used when /api/users/me fails due to server errors (not auth errors)
function _readUserFromCookie(): CurrentUser | null {
  try {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith("user_session="));
    if (!sessionCookie) return null;
    const raw = sessionCookie.split("=").slice(1).join("=");
    const decoded = raw.includes("%") ? decodeURIComponent(raw) : raw;
    const parsed = JSON.parse(decoded);
    if (!parsed.id) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      name: parsed.name,
      role: parsed.role,
      isActive: true,
      permissions: [],
    };
  } catch {
    return null;
  }
}

export const useStore = create<StoreState>((set, get) => ({
  accounts: [],
  accountTypes: [],
  cashboxes: [],
  products: [],
  invoices: [],
  currencies: [],
  warehouses: [],
  
  // User & Auth
  currentUser: null,
  userLoaded: false,

  setAccounts: (accounts) => set({ accounts }),
  setAccountTypes: (accountTypes) => set({ accountTypes }),
  setCashboxes: (cashboxes) => set({ cashboxes }),
  setProducts: (products) => set({ products }),
  setInvoices: (invoices) => set({ invoices }),
  setCurrencies: (currencies) => set({ currencies }),
  setWarehouses: (warehouses) => set({ warehouses }),

  fetchCurrentUser: async () => {
    try {
      const res = await fetch(`/api/users/me?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        set({ currentUser: data, userLoaded: true });
      } else if (res.status === 401 || res.status === 403) {
        // Clear session cookies client-side on auth failure
        document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
        document.cookie = "user_session=; path=/; max-age=0; SameSite=Lax";
        set({ currentUser: null, userLoaded: true });
      } else {
        // Server error (500) or DB timeout — don't logout!
        // If we don't have a user yet, try reading from the cookie as fallback
        const existing = get().currentUser;
        if (!existing) {
          const fallback = _readUserFromCookie();
          if (fallback) {
            set({ currentUser: fallback, userLoaded: true });
            return;
          }
        }
        set({ userLoaded: true });
      }
    } catch (err) {
      console.error("Failed to fetch current user", err);
      // Network error — try cookie fallback if no user loaded yet
      const existing = get().currentUser;
      if (!existing) {
        const fallback = _readUserFromCookie();
        if (fallback) {
          set({ currentUser: fallback, userLoaded: true });
          return;
        }
      }
      set({ userLoaded: true });
    }
  },

  isAdmin: () => {
    const user = get().currentUser;
    return user?.role === "admin";
  },

  hasPermission: (module, action) => {
    const user = get().currentUser;
    if (!user) return false;
    if (user.role === "admin") return true;
    const perm = user.permissions?.find((p) => p.module === module);
    return perm?.[action] ?? false;
  },

  fetchProducts: async () => {
    try {
      const res = await fetch(`/api/products?_t=${Date.now()}`);
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
      const res = await fetch(`/api/currencies?_t=${Date.now()}`);
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
      const res = await fetch(`/api/account-types?_t=${Date.now()}`);
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
      const res = await fetch(`/api/cashboxes?_t=${Date.now()}`);
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
      const res = await fetch(`/api/warehouses?_t=${Date.now()}`);
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
      const res = await fetch(`/api/vouchers?_t=${Date.now()}`);
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
          else if (v.type === "quotation") uiType = "نرخاندن";
          else if (v.type === "sales_return") uiType = "گەڕانەوەی فرۆشتن";
          else if (v.type === "purchase_return") uiType = "گەڕانەوەی کڕین";
          else if (v.type === "material_issue" || v.type === "سەرفی مواد") uiType = "سەرفی مەواد";
          else if (v.type === "warehouse_damage" || v.type === "خەسارەی کۆگا") uiType = "زیانی کۆگا";
          else if (v.type === "warehouse_stock" || v.type === "جەردی کۆگا") uiType = "جەردی کۆگا";
          else if (v.type === "product_transfer" || v.type === "گواستنەوەی کاڵا") uiType = "گواستنەوەی کەرەستە";
          return {
            id: v.id,
            accountId: v.accountId,
            type: uiType,
            total: v.netAmount,
            paid: v.paidAmounts?.reduce((sum: number, pa: any) => sum + pa.amount, 0) || 0,
            totalDiscount: v.totalDiscount || 0,
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
            lines: v.lines || [],
            items: v.lines || [],
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

  updateAccount: async (accountData) => {
    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData),
      });
      if (res.ok) {
        const updated = await res.json();
        await get().fetchAccounts();
        return updated;
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Update account failed:", res.status, errBody);
      }
    } catch (err) {
      console.error("Failed to update account", err);
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