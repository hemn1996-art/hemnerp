"use client";

import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { store, useStore } from "../store/store";
import { currencies as mockCurrencies } from "../data/mockData";
import { Product } from "../types";
import AlertModal from "./AlertModal";
import { convertDigits } from "../utils/digits";

type ItemKind = "inventory" | "service" | "expense";

export default function ItemsPage() {
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div style={{ direction: "rtl", minWidth: 0 }}>
      {mode === "list" ? (
        <ItemsList
          onAdd={() => {
            setSelectedProduct(null);
            setMode("add");
          }}
          onEdit={(product: any) => {
            setSelectedProduct(product);
            setMode("edit");
          }}
        />
      ) : (
        <AddItemForm
          productToEdit={selectedProduct}
          onBack={() => setMode("list")}
        />
      )}
    </div>
  );
}

function ItemsList({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (product: Product) => void;
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");

  const products = useStore((state) => state.products) || [];
  const fetchProducts = useStore((state) => state.fetchProducts);
  const deleteProduct = useStore((state) => state.deleteProduct);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "error" | "warning" | "success" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "warning", title: "", message: "" });

  const showAlert = (
    type: "error" | "warning" | "success" | "confirm",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => setAlertConfig({ isOpen: true, type, title, message, onConfirm });

  const closeAlert = () => setAlertConfig((a: any) => ({ ...a, isOpen: false }));

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const s = searchParams?.get("search");
    if (s) {
      setSearch(decodeURIComponent(s));
    }
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return products;

    return products.filter((item: Product) => {
      const typeName = getItemType(item);

      return (
        item.name.toLowerCase().includes(q) ||
        (item.code || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.brand || "").toLowerCase().includes(q) ||
        typeName.toLowerCase().includes(q)
      );
    });
  }, [search, products]);

  async function handleDelete(item: Product) {
    showAlert(
      "confirm",
      "Ø¯ÚµÙ†ÛŒØ§ÛŒ Ù„Û• Ø³Ú•ÛŒÙ†Û•ÙˆÛ•ØŸ",
      `Ø¯ÚµÙ†ÛŒØ§ÛŒ Ù„Û• Ø³Ú•ÛŒÙ†Û•ÙˆÛ•ÛŒ Ú©Û•Ø±Û•Ø³ØªÛ•ÛŒ "${item.name}"ØŸ`,
      async () => {
        closeAlert();
        const success = await deleteProduct(item.id);
        if (success) {
          showAlert("success", "Ø³Û•Ø±Ú©Û•ÙˆØªÙˆÙˆ", "Ú©Û•Ø±Û•Ø³ØªÛ• Ø¨Û• Ø³Û•Ø±Ú©Û•ÙˆØªÙˆÙˆÛŒÛŒ Ø³Ú•Ø§ÛŒÛ•ÙˆÛ• âœ…");
        } else {
          showAlert("error", "Ù‡Û•ÚµÛ•", "Ú©Û•Ø±Û•Ø³ØªÛ• Ø³Ú•ÛŒÙ†Û•ÙˆÛ• Ø³Û•Ø±Ú©Û•ÙˆØªÙˆÙˆ Ù†Û•Ø¨ÙˆÙˆ. ØªÚ©Ø§ÛŒÛ• Ø¯ÙˆÙˆØ¨Ø§Ø±Û• Ù‡Û•ÙˆÚµ Ø¨Ø¯Û•.");
        }
      }
    );
  }

  return (
    <div style={pageBox}>
      <div style={topBar}>
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
          className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
          title="Ú¯Û•ÙˆØ±Û•Ú©Ø±Ø¯Ù†ÛŒ Ø³Ø§ÛŒØ¯Ø¨Ø§Ø±"
        >
          â˜°
        </button>
        <button style={primaryBtn} onClick={onAdd}>
          + Ø²ÛŒØ§Ø¯Ú©Ø±Ø¯Ù†
        </button>

        <button style={outlineBtn} onClick={() => fetchProducts()}>Ú•ÛŽÚ©Ø®Ø³ØªÙ†Û•ÙˆÛ•</button>
        <button style={printBtn} onClick={() => window.print()}>ðŸ–¨</button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ú¯Û•Ú•Ø§Ù† Ø¨Û• Ù†Ø§ÙˆØŒ Ú©Û†Ø¯ØŒ Ø¨Ø±Ø§Ù†Ø¯ØŒ Ú©Ø§ØªÛŽÚ¯Û†Ø±ÛŒ..."
          style={searchInput}
        />
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Ù†Ø§Ùˆ</th>
              <th style={th}>Ú©Û†Ø¯</th>
              <th style={th}>Ø¬Û†Ø±</th>
              <th style={th}>Ú©Ø§ØªÛŒÚ¯Û†Ø±ÛŒ</th>
              <th style={th}>Ø¨Ø±Ø§Ù†Ø¯</th>
              <th style={th}>Ù†Ø±Ø®ÛŒ ÙØ±Û†Ø´ØªÙ†</th>
              <th style={th}>ÙØ±Û• ÙˆÛ•Ø¬Ø¨Û•</th>
              <th style={th}>Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ Ú©Û†Ú¯Ø§</th>
              <th style={th}>Ø¨Û•Ø³Û•Ø±Ú†ÙˆÙˆÙ†</th>
              <th style={th}>Ø­Ø§ÚµÛ•Øª</th>
              <th style={th}>Ú†Ø§Ù„Ø§Ú©ÛŒ</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} style={emptyCell}>
                  Ù‡ÛŒÚ† Ú©Û•Ø±Û•Ø³ØªÛ•ÛŒÛ•Ú© Ù†Û•Ø¯Û†Ø²Ø±Ø§ÛŒÛ•ÙˆÛ•
                </td>
              </tr>
            ) : (
              filteredProducts.map((item: Product) => (
                <tr key={item.id}>
                  <td style={td}>{item.name}</td>
                  <td style={td}>{item.code || "-"}</td>

                  <td style={td}>
                    <span style={blueBadge}>{getItemType(item)}</span>
                  </td>

                  <td style={td}>{item.category || "-"}</td>
                  <td style={td}>{item.brand || "-"}</td>

                  <td style={{ ...td, direction: "ltr", fontWeight: "bold" }}>
                    {formatSalePrices(item)}
                  </td>

                  <td style={td}>{item.isMultiBatch ? "Ø¨Û•ÚµÛŽ" : "Ù†Û•Ø®ÛŽØ±"}</td>

                  <td style={td}>
                    {!item.isExpense && !item.isService
                      ? item.lowStockAlert || "-"
                      : "-"}
                  </td>

                  <td style={td}>
                    {item.hasExpiry
                      ? `${item.expiryAlertDays || 10} Ú•Û†Ú˜ Ù¾ÛŽØ´ØªØ±`
                      : "Ù†ÛŒÛŒÛ•"}
                  </td>

                  <td style={td}>
                    <span
                      style={{
                        background:
                          item.isActive === false ? "#fee2e2" : "#dcfce7",
                        color:
                          item.isActive === false ? "#991b1b" : "#166534",
                        padding: "5px 10px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: "bold",
                      }}
                    >
                      {item.isActive === false ? "Ù†Ø§Ú†Ø§Ù„Ø§Ú©" : "Ú†Ø§Ù„Ø§Ú©"}
                    </span>
                  </td>

                  <td style={td}>
                    <button style={smallBtn} onClick={() => onEdit(item)}>
                      Ø¯Û•Ø³ØªÚ©Ø§Ø±ÛŒ
                    </button>
                    {item.isDeletable && (
                      <button
                        style={{ ...smallBtn, color: "#dc2626", borderColor: "#fecaca" }}
                        onClick={() => handleDelete(item)}
                        title="Ø³Ú•ÛŒÙ†Û•ÙˆÛ•"
                      >
                        ðŸ—‘ï¸
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <AlertModal {...alertConfig} onClose={closeAlert} />
    </div>
  );
}

function AddItemForm({
  productToEdit,
  onBack,
}: {
  productToEdit?: Product | null;
  onBack: () => void;
}) {
  const [name, setName] = useState(productToEdit?.name || "");
  const storeCurrencies = useStore((s: any) => s.currencies) || [];
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "error" | "warning" | "success" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "warning", title: "", message: "" });

  const showAlert = (
    type: "error" | "warning" | "success" | "confirm",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => setAlertConfig({ isOpen: true, type, title, message, onConfirm });

  const closeAlert = () => setAlertConfig((a: any) => ({ ...a, isOpen: false }));
  const [nameArabic, setNameArabic] = useState("");
  const [nameEnglish, setNameEnglish] = useState("");
  const [code, setCode] = useState(productToEdit?.code || "");
  const [barcode, setBarcode] = useState("");

  const [brand, setBrand] = useState("Ø¨ÛŽ Ø¨Ø±Ø§Ù†Ø¯");
  const [category, setCategory] = useState("Ú¯Ø´ØªÛŒ");

  const [itemKind, setItemKind] = useState<ItemKind>(
    productToEdit?.isExpense
      ? "expense"
      : productToEdit?.isService
      ? "service"
      : "inventory"
  );

  const [salePrices, setSalePrices] = useState([
    {
      currencyId: "1",
      priceType: "ØªØ§Ú©",
      amount: "",
    },
  ]);

  const [packages, setPackages] = useState([
    {
      name: "Ø¯Ø§Ù†Û•",
      quantity: "1",
    },
  ]);

  const [lowStockAlert, setLowStockAlert] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryAlertDays, setExpiryAlertDays] = useState("10");
  const [isMultiBatch, setIsMultiBatch] = useState(productToEdit?.isMultiBatch || false);

  const [isActive, setIsActive] = useState(productToEdit?.isActive ?? true);

  const [categories, setCategories] = useState<{ id: number; name: string; isActive: boolean }[]>(
    [{ id: 1, name: "Ú¯Ø´ØªÛŒ", isActive: true }]
  );
  const [brands, setBrands] = useState<{ id: number; name: string; isActive: boolean }[]>(
    [{ id: 1, name: "Ø¨ÛŽ Ø¨Ø±Ø§Ù†Ø¯", isActive: true }]
  );
  const [packagings, setPackagings] = useState<{ id: number; name: string; isActive: boolean }[]>(
    [{ id: 1, name: "Ø¯Ø§Ù†Û•", isActive: true }, { id: 2, name: "Ú©Ø§Ø±ØªÛ†Ù†", isActive: true }]
  );
  const [priceTypes, setPriceTypes] = useState<{ id: number; name: string; isActive: boolean }[]>(
    [{ id: 1, name: "ØªØ§Ú©", isActive: true }, { id: 2, name: "Ú©Û†", isActive: true }]
  );

  useEffect(() => {
    // Load categories
    try {
      const rawCat = localStorage.getItem("__erp_categories");
      const listCat = rawCat ? JSON.parse(rawCat) : [{ id: 1, name: "Ú¯Ø´ØªÛŒ", isActive: true }];
      const active = listCat.filter((x: any) => x.isActive !== false);
      setCategories(active);
      if (active.length > 0) setCategory(active[0].name);
    } catch { }

    // Load brands
    try {
      const rawBrand = localStorage.getItem("__erp_brands");
      const listBrand = rawBrand ? JSON.parse(rawBrand) : [{ id: 1, name: "Ø¨ÛŽ Ø¨Ø±Ø§Ù†Ø¯", isActive: true }];
      const active = listBrand.filter((x: any) => x.isActive !== false);
      setBrands(active);
      if (active.length > 0) setBrand(active[0].name);
    } catch { }

    // Load packaging
    try {
      const rawPkg = localStorage.getItem("__erp_packaging");
      const listPkg = rawPkg ? JSON.parse(rawPkg) : [{ id: 1, name: "Ø¯Ø§Ù†Û•", isActive: true }, { id: 2, name: "Ú©Ø§Ø±ØªÛ†Ù†", isActive: true }];
      const active = listPkg.filter((x: any) => x.isActive !== false);
      setPackagings(active);
      if (active.length > 0) setPackages([{ name: active[0].name, quantity: "1" }]);
    } catch { }

    // Load priceTypes
    try {
      const rawPriceTypes = localStorage.getItem("__erp_price_types");
      const listPriceTypes = rawPriceTypes ? JSON.parse(rawPriceTypes) : [{ id: 1, name: "ØªØ§Ú©", isActive: true }, { id: 2, name: "Ú©Û†", isActive: true }];
      const active = listPriceTypes.filter((x: any) => x.isActive !== false);
      setPriceTypes(active);
      if (active.length > 0) setSalePrices([{ currencyId: "1", priceType: active[0].name, amount: "" }]);
    } catch { }
  }, []);

  function onlyNumbers(value: string) {
    const englishVal = convertDigits(value);
    return englishVal.replace(/[^\d]/g, "");
  }

  function onlyDecimal(value: string) {
    const englishVal = convertDigits(value);
    return englishVal.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  }

  function updateSalePrice(
    index: number,
    field: "currencyId" | "priceType" | "amount",
    value: string
  ) {
    setSalePrices((prev) => {
      const next = [...prev];

      next[index] = {
        ...next[index],
        [field]: field === "amount" ? onlyDecimal(value) : value,
      };

      return next;
    });
  }

  function addSalePriceRow() {
    setSalePrices((prev) => [
      ...prev,
      {
        currencyId: "",
        priceType: priceTypes[0]?.name || "ØªØ§Ú©",
        amount: "",
      },
    ]);
  }

  function removeSalePriceRow(index: number) {
    setSalePrices((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function updatePackage(
    index: number,
    field: "name" | "quantity",
    value: string
  ) {
    setPackages((prev) => {
      const next = [...prev];

      next[index] = {
        ...next[index],
        [field]: field === "quantity" ? onlyNumbers(value) : value,
      };

      return next;
    });
  }

  function addPackageRow() {
    setPackages((prev) => [
      ...prev,
      {
        name: packagings[0]?.name || "Ø¯Ø§Ù†Û•",
        quantity: "",
      },
    ]);
  }

  function removePackageRow(index: number) {
    setPackages((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function save() {
    if (!name.trim()) {
      showAlert("warning", "Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ", "Ù†Ø§ÙˆÛŒ Ú©ÙˆØ±Ø¯ÛŒ Ù¾Ú• Ø¨Ú©Û•Ø±Û•ÙˆÛ•");
      return;
    }

    const isExpense = itemKind === "expense";
    const isService = itemKind === "service";
    const isInventory = itemKind === "inventory";

    const productData = {
      id: productToEdit?.id,
      name: name.trim(),
      code: code.trim() || undefined,
      isMultiBatch: isInventory ? isMultiBatch : false,
      isExpense,
      isService,
      isActive,
    };

    const result = productToEdit
      ? await store.updateProduct(productData)
      : await store.addProduct(productData);

    if (result) {
      showAlert("success", "Ø³Û•Ø±Ú©Û•ÙˆØªÙˆÙˆ", productToEdit ? "Ú©Û•Ø±Û•Ø³ØªÛ• Ø¨Û• Ø³Û•Ø±Ú©Û•ÙˆØªÙˆÙˆÛŒÛŒ Ø¯Û•Ø³ØªÚ©Ø§Ø±ÛŒ Ú©Ø±Ø§ âœ…" : "Ú©Û•Ø±Û•Ø³ØªÛ• Ø¨Û• Ø³Û•Ø±Ú©Û•ÙˆØªÙˆÙˆÛŒÛŒ Ø®Û•Ø²Ù† Ú©Ø±Ø§ âœ…", () => {
        closeAlert();
        onBack();
      });
    } else {
      showAlert("error", "Ù‡Û•ÚµÛ•", "Ú©Û•Ø±Û•Ø³ØªÛ• Ø®Û•Ø²Ù† Ù†Û•Ú©Ø±Ø§. ØªÚ©Ø§ÛŒÛ• Ø¯ÙˆÙˆØ¨Ø§Ø±Û• Ù‡Û•ÙˆÚµ Ø¨Ø¯Û•.");
    }
  }

  return (
    <div>
      <div style={notice}>Ø¦Û•Ùˆ ÙÛŒÙ„Ø¯Ø§Ù†Û•ÛŒ Ú©Û• Ø¨Û• * Ù†ÛŒØ´Ø§Ù†Û• Ú©Ø±Ø§ÙˆÙ† Ø¯Ø§ÙˆØ§Ú©Ø±Ø§ÙˆÙ†.</div>

      <div style={titleBox}>
        <h2 style={{ margin: 0 }}>
          {productToEdit ? "Ø¯Û•Ø³ØªÚ©Ø§Ø±ÛŒÚ©Ø±Ø¯Ù†ÛŒ Ú©Û•Ø±Û•Ø³ØªÛ•" : "Ø¯Ø±ÙˆØ³ØªÚ©Ø±Ø¯Ù†ÛŒ Ú©Û•Ø±Û•Ø³ØªÛ•"}
        </h2>
        <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
          {productToEdit
            ? "Ø¯Û•Ø³ØªÚ©Ø§Ø±ÛŒÚ©Ø±Ø¯Ù†ÛŒ Ø²Ø§Ù†ÛŒØ§Ø±ÛŒ Ùˆ Ú•ÛŽÚ©Ø®Ø³ØªÙ†Û•Ú©Ø§Ù†ÛŒ Ú©Û•Ø±Û•Ø³ØªÛ•"
            : "Ø²Ø§Ù†ÛŒØ§Ø±ÛŒ Ú©Û•Ø±Û•Ø³ØªÛ•ØŒ Ù†Ø±Ø®ÛŒ ÙØ±Û†Ø´ØªÙ†ØŒ Ù¾ÛŽÚ†Ø§Ù†Û•ÙˆÛ• Ùˆ Ú•ÛŽÚ©Ø®Ø³ØªÙ†Û•Ú©Ø§Ù†"}
        </p>
      </div>

      <Section title="Ø²Ø§Ù†ÛŒØ§Ø±ÛŒ Ø¨Ù†Û•Ú•Û•ØªÛŒ" icon="â“˜">
        <div style={grid3}>
          <Field label="* Ù†Ø§Ùˆ - Ú©ÙˆØ±Ø¯ÛŒ">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={input}
            />
          </Field>

          <Field label="Ù†Ø§Ùˆ - Ø¹Û•Ø±Û•Ø¨ÛŒ">
            <input
              value={nameArabic}
              onChange={(e) => setNameArabic(e.target.value)}
              style={input}
            />
          </Field>

          <Field label="Ù†Ø§Ùˆ - Ø¦ÛŒÙ†Ú¯Ù„ÛŒØ²ÛŒ">
            <input
              value={nameEnglish}
              onChange={(e) => setNameEnglish(e.target.value)}
              style={{ ...input, direction: "ltr", textAlign: "left" }}
            />
          </Field>
        </div>

        <div style={grid3}>
          <Field label="Ú©Û†Ø¯">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ ...input, direction: "ltr", textAlign: "left" }}
              placeholder="18"
            />
          </Field>

          <Field label="Ø¨Ø§Ø±Ú©Û†Ø¯">
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              style={{ ...input, direction: "ltr", textAlign: "left" }}
              placeholder="Barcode"
            />
          </Field>

          <Field label="Ø¨Ø±Ø§Ù†Ø¯">
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              style={input}
            >
              {brands.map((b: any) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={grid3}>
          <Field label="Ú©Ø§ØªÛŒÚ¯Û†Ø±ÛŒ">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={input}
            >
              {categories.map((c: any) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Ú•ÛŽÚ©Ø®Ø³ØªÙ†Û•Ú©Ø§Ù†ÛŒ Ú©Û•Ø±Û•Ø³ØªÛ•" icon="âš™">
        <div style={checksGrid}>
          <label style={checkLabel}>
            <input
              type="radio"
              checked={itemKind === "inventory"}
              onChange={() => setItemKind("inventory")}
            />
            Ø¦Û•Ù… Ú©Û•Ø±Û•Ø³ØªÛ• Ø¯Û•Ú†ÛŽØªÛ• Ú©Û†Ú¯Ø§ØŸ
          </label>

          <label style={checkLabel}>
            <input
              type="radio"
              checked={itemKind === "service"}
              onChange={() => setItemKind("service")}
            />
            Ø¦Û•Ù… Ú©Û•Ø±Û•Ø³ØªÛ• Ø¨Û† Ø®Ø²Ù…Û•ØªÚ¯ÙˆØ²Ø§Ø±ÛŒÛ•ØŸ
          </label>

          <label style={checkLabel}>
            <input
              type="radio"
              checked={itemKind === "expense"}
              onChange={() => setItemKind("expense")}
            />
            Ø¦Û•Ù… Ú©Û•Ø±Û•Ø³ØªÛ• Ø®Û•Ø±Ø¬ÛŒÛ•ØŸ
          </label>

          {itemKind === "inventory" && (
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={isMultiBatch}
                onChange={(e) => setIsMultiBatch(e.target.checked)}
              />
              Ø¦Û•Ù… Ú©Û•Ø±Û•Ø³ØªÛ• ÙØ±Û• ÙˆÛ•Ø¬Ø¨Û•ÛŒÛ•ØŸ
            </label>
          )}

          <label style={checkLabel}>
            <input type="checkbox" />
            Ø³Ø±ÛŒØ§ÚµÛŒ Ù‡Û•ÛŒÛ•ØŸ
          </label>
        </div>
      </Section>

      <Section title="Ù†Ø±Ø®ÛŒ ÙØ±Û†Ø´ØªÙ†" icon="$">
        {salePrices.map((row, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr auto",
              gap: 12,
              alignItems: "end",
              marginBottom: 12,
            }}
          >
            <Field label="Ø¯Ø±Ø§Ùˆ">
              <select
                value={row.currencyId}
                onChange={(e) =>
                  updateSalePrice(index, "currencyId", e.target.value)
                }
                style={input}
              >
                <option value="">Ø¯Ø±Ø§Ùˆ</option>
                {currencies
                  .filter((x: any) => x.isActive !== false)
                  .map((currency: any) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.name} - {currency.symbol}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Ø¬Û†Ø±ÛŒ Ù†Ø±Ø®">
              <select
                value={row.priceType}
                onChange={(e) =>
                  updateSalePrice(index, "priceType", e.target.value)
                }
                style={input}
              >
                {priceTypes.map((pt) => (
                  <option key={pt.id} value={pt.name}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ù†Ø±Ø®">
              <input
                type="text"
                inputMode="decimal"
                lang="en"
                dir="ltr"
                value={row.amount}
                onChange={(e) =>
                  updateSalePrice(index, "amount", e.target.value)
                }
                style={numericInput}
                placeholder="170"
              />
            </Field>

            <button
              onClick={() => removeSalePriceRow(index)}
              style={{ ...backBtn, color: "#b91c1c", height: 45 }}
              disabled={salePrices.length === 1}
            >
              Ù„Ø§Ø¨Ø±Ø¯Ù†
            </button>
          </div>
        ))}

        <button onClick={addSalePriceRow} style={outlineBtn}>
          + Ø²ÛŒØ§Ø¯Ú©Ø±Ø¯Ù†ÛŒ Ù†Ø±Ø®ÛŒ ØªØ±
        </button>
      </Section>

      <Section title="Ù¾ÛŽÚ†Ø§Ù†Û•ÙˆÛ•" icon="ðŸ“¦">
        {packages.map((row, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 12,
              alignItems: "end",
              marginBottom: 12,
            }}
          >
            <Field label="Ù¾ÛŽÚ†Ø§Ù†Û•ÙˆÛ•">
              <select
                value={row.name}
                onChange={(e) => updatePackage(index, "name", e.target.value)}
                style={input}
              >
                {packagings.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ú˜Ù…Ø§Ø±Û•ÛŒ Ù†Ø§Ùˆ Ù¾ÛŽÚ†Ø§Ù†Û•ÙˆÛ•">
              <input
                type="text"
                inputMode="numeric"
                lang="en"
                dir="ltr"
                value={row.quantity}
                onChange={(e) =>
                  updatePackage(index, "quantity", e.target.value)
                }
                style={numericInput}
                placeholder="1"
              />
            </Field>

            <button
              onClick={() => removePackageRow(index)}
              style={{ ...backBtn, color: "#b91c1c", height: 45 }}
              disabled={packages.length === 1}
            >
              Ù„Ø§Ø¨Ø±Ø¯Ù†
            </button>
          </div>
        ))}

        <button onClick={addPackageRow} style={outlineBtn}>
          + Ø²ÛŒØ§Ø¯Ú©Ø±Ø¯Ù†ÛŒ Ù¾ÛŽÚ†Ø§Ù†Û•ÙˆÛ•ÛŒ ØªØ±
        </button>
      </Section>

      {itemKind === "inventory" && (
        <Section title="Ú•ÛŽÚ©Ø®Ø³ØªÙ†Û•Ú©Ø§Ù†ÛŒ Ú©Û†Ú¯Ø§ Ùˆ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ" icon="â–¥">
          <div style={grid3}>
            <Field label="Ú©Û•Ù…ØªØ±ÛŒÙ† Ø¦Ø§Ø³ØªÛŒ Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ">
              <input
                type="text"
                inputMode="numeric"
                lang="en"
                dir="ltr"
                value={lowStockAlert}
                onChange={(e) => setLowStockAlert(onlyNumbers(e.target.value))}
                style={numericInput}
                placeholder="5"
              />
            </Field>

            <Field label="Ø¨Û•Ø³Û•Ø±Ú†ÙˆÙˆÙ† Ù‡Û•ÛŒÛ•ØŸ">
              <select
                value={hasExpiry ? "yes" : "no"}
                onChange={(e) => setHasExpiry(e.target.value === "yes")}
                style={input}
              >
                <option value="no">Ù†ÛŒÛŒÛ•</option>
                <option value="yes">Ù‡Û•ÛŒÛ•</option>
              </select>
            </Field>

            <Field label="Ø¦Ø§Ú¯Ø§Ø¯Ø§Ø±ÛŒ Ù¾ÛŽØ´ Ø¨Û•Ø³Û•Ø±Ú†ÙˆÙˆÙ† / Ú•Û†Ú˜">
              <input
                type="text"
                inputMode="numeric"
                lang="en"
                dir="ltr"
                value={expiryAlertDays}
                disabled={!hasExpiry}
                onChange={(e) => setExpiryAlertDays(onlyNumbers(e.target.value))}
                style={{
                  ...numericInput,
                  background: hasExpiry ? "white" : "#f3f4f6",
                }}
                placeholder="10"
              />
            </Field>
          </div>
        </Section>
      )}

      <Section title="Ø­Ø§ÚµÛ•Øª" icon="ðŸ‘">
        <select
          value={isActive ? "Ú†Ø§Ù„Ø§Ú©" : "Ù†Ø§Ú†Ø§Ù„Ø§Ú©"}
          onChange={(e) => setIsActive(e.target.value === "Ú†Ø§Ù„Ø§Ú©")}
          style={input}
        >
          <option>Ú†Ø§Ù„Ø§Ú©</option>
          <option>Ù†Ø§Ú†Ø§Ù„Ø§Ú©</option>
        </select>
      </Section>

      <div style={footerActions}>
        <button onClick={save} style={saveBtn}>
          ðŸ’¾ Ø®Û•Ø²Ù†Ú©Ø±Ø¯Ù†
        </button>
        <button onClick={onBack} style={backBtn}>
          Ù¾Ø§Ø´Ú¯Û•Ø²Ø¨ÙˆÙˆÙ†Û•ÙˆÛ•
        </button>
      </div>
      <AlertModal {...alertConfig} onClose={closeAlert} />
    </div>
  );
}

function getItemType(item: Product) {
  if (item.isExpense) return "Ø®Û•Ø±Ø¬ÛŒ";
  if (item.isService) return "Ø®Ø²Ù…Û•ØªÚ¯ÙˆØ²Ø§Ø±ÛŒ";
  return "Ú©Û†Ú¯Ø§ÛŒÛŒ";
}

function formatSalePrices(item: Product) {
  if (!item.salePrices || item.salePrices.length === 0) {
    return item.salePrice ? `${item.salePrice} $` : "-";
  }

  return item.salePrices
    .map((price) => {
      const currency = mockCurrencies.find((x: any) => x.id === price.currencyId);
      const symbol = currency ? currency.symbol : "";
      return `${price.amount} ${symbol}`;
    })
    .join(" | ");
}

function Section({ title, icon, children }: any) {
  return (
    <div style={section}>
      <div style={sectionHeader}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <strong>{title}</strong>
      </div>
      <div style={sectionBody}>{children}</div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

const pageBox: CSSProperties = {
  background: "white",
  padding: 20,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
};

const topBar: CSSProperties = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  alignItems: "center",
  flexWrap: "wrap",
};

const primaryBtn: CSSProperties = {
  background: "#061f5f",
  color: "white",
  padding: "12px 25px",
  border: 0,
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const outlineBtn: CSSProperties = {
  background: "white",
  padding: "12px 25px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  cursor: "pointer",
};

const printBtn: CSSProperties = {
  background: "white",
  padding: "12px 18px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  cursor: "pointer",
};

const searchInput: CSSProperties = {
  marginRight: "auto",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  width: 350,
  direction: "rtl",
};

const tableWrap: CSSProperties = { overflowX: "auto" };

const table: CSSProperties = {
  width: "100%",
  minWidth: 800,
  borderCollapse: "collapse",
  textAlign: "center",
};

const th: CSSProperties = {
  background: "#061f5f",
  color: "white",
  padding: 14,
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: 14,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const emptyCell: CSSProperties = {
  padding: 30,
  textAlign: "center",
  color: "#9ca3af",
};

const blueBadge: CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: "bold",
};

const smallBtn: CSSProperties = {
  marginLeft: 8,
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "white",
  cursor: "pointer",
};

const notice: CSSProperties = {
  background: "#dbeafe",
  padding: 14,
  borderRadius: 8,
  marginBottom: 15,
  color: "#1e40af",
};

const titleBox: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 22,
  marginBottom: 15,
};

const section: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  marginBottom: 14,
  overflow: "hidden",
};

const sectionHeader: CSSProperties = {
  background: "#f8fafc",
  padding: 15,
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const sectionBody: CSSProperties = { padding: 18 };

const grid3: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-3-cols, repeat(3, minmax(180px, 1fr)))",
  gap: 16,
  marginBottom: 16,
};

const input: CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 15,
  boxSizing: "border-box",
  direction: "rtl",
};

const numericInput: CSSProperties = {
  ...input,
  direction: "ltr",
  textAlign: "left",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: "#374151",
  fontWeight: "bold",
};

const checksGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-3-cols, repeat(3, 1fr))",
  gap: 16,
};

const checkLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 10,
};

const footerActions: CSSProperties = {
  background: "white",
  padding: 18,
  borderRadius: 14,
  display: "flex",
  gap: 15,
};

const saveBtn: CSSProperties = {
  background: "#061f5f",
  color: "white",
  padding: "12px 25px",
  border: 0,
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const backBtn: CSSProperties = {
  background: "white",
  padding: "12px 25px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  cursor: "pointer",
};
