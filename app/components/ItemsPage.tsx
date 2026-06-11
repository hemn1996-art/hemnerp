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
      "دڵنیای لە سڕینەوە؟",
      `دڵنیای لە سڕینەوەی کەرەستەی "${item.name}"؟`,
      async () => {
        closeAlert();
        const success = await deleteProduct(item.id);
        if (success) {
          showAlert("success", "سەرکەوتوو", "کەرەستە بە سەرکەوتوویی سڕایەوە ✅");
        } else {
          showAlert("error", "هەڵە", "کەرەستە سڕینەوە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدە.");
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
          title="گەورەکردنی سایدبار"
        >
          ☰
        </button>
        <button style={primaryBtn} onClick={onAdd}>
          + زیادکردن
        </button>

        <button style={outlineBtn} onClick={() => fetchProducts()}>ڕێکخستنەوە</button>
        <button style={printBtn} onClick={() => window.print()}>🖨</button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="گەڕان بە ناو، کۆد، براند، کاتێگۆری..."
          style={searchInput}
        />
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>ناو</th>
              <th style={th}>کۆد</th>
              <th style={th}>جۆر</th>
              <th style={th}>کاتێگۆری</th>
              <th style={th}>براند</th>
              <th style={th}>نرخی فرۆشتن</th>
              <th style={th}>فرە وەجبە</th>
              <th style={th}>ئاگاداری کۆگا</th>
              <th style={th}>بەسەرچوون</th>
              <th style={th}>حاڵەت</th>
              <th style={th}>چالاکی</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} style={emptyCell}>
                  هیچ کەرەستەیەک نەدۆزرایەوە
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

                  <td style={td}>{item.isMultiBatch ? "بەڵێ" : "نەخێر"}</td>

                  <td style={td}>
                    {!item.isExpense && !item.isService
                      ? item.lowStockAlert || "-"
                      : "-"}
                  </td>

                  <td style={td}>
                    {item.hasExpiry
                      ? `${item.expiryAlertDays || 10} ڕۆژ پێشتر`
                      : "نییە"}
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
                      {item.isActive === false ? "ناچالاک" : "چالاک"}
                    </span>
                  </td>

                  <td style={td}>
                    <button style={smallBtn} onClick={() => onEdit(item)}>
                      دەستکاری
                    </button>
                    {item.isDeletable && (
                      <button
                        style={{ ...smallBtn, color: "#dc2626", borderColor: "#fecaca" }}
                        onClick={() => handleDelete(item)}
                        title="سڕینەوە"
                      >
                        🗑️
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

  const [brand, setBrand] = useState("بێ براند");
  const [category, setCategory] = useState("گشتی");

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
      priceType: "تاک",
      amount: "",
    },
  ]);

  const [packages, setPackages] = useState([
    {
      name: "دانە",
      quantity: "1",
    },
  ]);

  const [lowStockAlert, setLowStockAlert] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryAlertDays, setExpiryAlertDays] = useState("10");
  const [isMultiBatch, setIsMultiBatch] = useState(productToEdit?.isMultiBatch || false);

  const [isActive, setIsActive] = useState(productToEdit?.isActive ?? true);

  const [categories, setCategories] = useState<{ id: number; name: string; isActive: boolean }[]>(
    [{ id: 1, name: "گشتی", isActive: true }]
  );
  const [brands, setBrands] = useState<{ id: number; name: string; isActive: boolean }[]>(
    [{ id: 1, name: "بێ براند", isActive: true }]
  );
  const [packagings, setPackagings] = useState<{ id: number; name: string; isActive: boolean }[]>(
    [{ id: 1, name: "دانە", isActive: true }, { id: 2, name: "کارتۆن", isActive: true }]
  );
  const [priceTypes, setPriceTypes] = useState<{ id: number; name: string; isActive: boolean }[]>(
    [{ id: 1, name: "تاک", isActive: true }, { id: 2, name: "کۆ", isActive: true }]
  );

  useEffect(() => {
    async function loadAttributes() {
      // Load categories
      try {
        const res = await fetch("/api/attributes?type=category");
        if (res.ok) {
          const listCat = await res.json();
          const active = listCat.filter((x: any) => x.isActive !== false);
          setCategories(active);
          if (productToEdit?.category) {
            setCategory(productToEdit.category);
          } else if (active.length > 0) {
            setCategory(active[0].name);
          }
        }
      } catch (err) { console.error(err); }

      // Load brands
      try {
        const res = await fetch("/api/attributes?type=brand");
        if (res.ok) {
          const listBrand = await res.json();
          const active = listBrand.filter((x: any) => x.isActive !== false);
          setBrands(active);
          if (productToEdit?.brand) {
            setBrand(productToEdit.brand);
          } else if (active.length > 0) {
            setBrand(active[0].name);
          }
        }
      } catch (err) { console.error(err); }

      // Load packaging
      try {
        const res = await fetch("/api/attributes?type=packaging");
        if (res.ok) {
          const listPkg = await res.json();
          const active = listPkg.filter((x: any) => x.isActive !== false);
          setPackagings(active);
          if (productToEdit?.packaging) {
            setPackages([{ name: productToEdit.packaging, quantity: "1" }]);
          } else if (active.length > 0) {
            setPackages([{ name: active[0].name, quantity: "1" }]);
          }
        }
      } catch (err) { console.error(err); }

      // Load priceTypes
      try {
        const res = await fetch("/api/attributes?type=priceType");
        if (res.ok) {
          const listPriceTypes = await res.json();
          const active = listPriceTypes.filter((x: any) => x.isActive !== false);
          setPriceTypes(active);
          if (active.length > 0) {
            setSalePrices([{ currencyId: "1", priceType: active[0].name, amount: "" }]);
          }
        }
      } catch (err) { console.error(err); }
    }

    loadAttributes();
  }, [productToEdit]);

  function onlyNumbers(value: string) {
    const englishVal = convertDigits(value);
    return englishVal.replace(/[^\d]/g, "");
  }

  // Decimal cleanup
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
        priceType: priceTypes[0]?.name || "تاک",
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
        name: packagings[0]?.name || "دانە",
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
      showAlert("warning", "ئاگاداری", "ناوی کوردی پڕ بکەرەوە");
      return;
    }

    const isExpense = itemKind === "expense";
    const isService = itemKind === "service";
    const isInventory = itemKind === "inventory";

    const productData = {
      id: productToEdit?.id,
      name: name.trim(),
      code: code.trim() || undefined,
      category,
      brand,
      packaging: packages[0]?.name || "دانە",
      isMultiBatch: isInventory ? isMultiBatch : false,
      isExpense,
      isService,
      isActive,
    };

    const result = productToEdit
      ? await store.updateProduct(productData)
      : await store.addProduct(productData);

    if (result) {
      showAlert("success", "سەرکەوتوو", productToEdit ? "کەرەستە بە سەرکەوتوویی دەستکاری کرا ✅" : "کەرەستە بە سەرکەوتوویی خەزن کرا ✅", () => {
        closeAlert();
        onBack();
      });
    } else {
      showAlert("error", "هەڵە", "کەرەستە خەزن نەکرا. تکایە دووبارە هەوڵ بدە.");
    }
  }

  return (
    <div>
      <div style={notice}>ئەو فیڵدانەی کە بە * نیشانە کراون داواکراون.</div>

      <div style={titleBox}>
        <h2 style={{ margin: 0 }}>
          {productToEdit ? "دەستکاریکردنی کەرەستە" : "دروستکردنی کەرەستە"}
        </h2>
        <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
          {productToEdit
            ? "دەستکاریکردنی زانیاری و ڕێکخستنەکانی کەرەستە"
            : "زانیاری کەرەستە، نرخی فرۆشتن، پێچانەوە و ڕێکخستنەکان"}
        </p>
      </div>

      <Section title="زانیاری بنەڕەتی" icon="ℹ">
        <div style={grid3}>
          <Field label="* ناو - کوردی">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={input}
            />
          </Field>

          <Field label="ناو - عەرەبی">
            <input
              value={nameArabic}
              onChange={(e) => setNameArabic(e.target.value)}
              style={input}
            />
          </Field>

          <Field label="ناو - ئینگلیزی">
            <input
              value={nameEnglish}
              onChange={(e) => setNameEnglish(e.target.value)}
              style={{ ...input, direction: "ltr", textAlign: "left" }}
            />
          </Field>
        </div>

        <div style={grid3}>
          <Field label="کۆد">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ ...input, direction: "ltr", textAlign: "left" }}
              placeholder="18"
            />
          </Field>

          <Field label="بارکۆد">
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              style={{ ...input, direction: "ltr", textAlign: "left" }}
              placeholder="Barcode"
            />
          </Field>

          <Field label="براند">
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
          <Field label="کاتێگۆری">
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

      <Section title="ڕێکخستنەکانی کەرەستە" icon="⚙">
        <div style={checksGrid}>
          <label style={checkLabel}>
            <input
              type="radio"
              checked={itemKind === "inventory"}
              onChange={() => setItemKind("inventory")}
            />
            ئەم کەرەستەیە دەچێتە کۆگا؟
          </label>

          <label style={checkLabel}>
            <input
              type="radio"
              checked={itemKind === "service"}
              onChange={() => setItemKind("service")}
            />
            ئەم کەرەستەیە بۆ خزمەتگوزارییە؟
          </label>

          <label style={checkLabel}>
            <input
              type="radio"
              checked={itemKind === "expense"}
              onChange={() => setItemKind("expense")}
            />
            ئەم کەرەستەیە خەرجییە؟
          </label>

          {itemKind === "inventory" && (
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={isMultiBatch}
                onChange={(e) => setIsMultiBatch(e.target.checked)}
              />
              ئەم کەرەستەیە فرە وەجبەیە؟
            </label>
          )}

          <label style={checkLabel}>
            <input type="checkbox" />
            سریاڵی هەیە؟
          </label>
        </div>
      </Section>

      <Section title="نرخی فرۆشتن" icon="$">
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
            <Field label="دراو">
              <select
                value={row.currencyId}
                onChange={(e) =>
                  updateSalePrice(index, "currencyId", e.target.value)
                }
                style={input}
              >
                <option value="">دراو</option>
                {currencies
                  .filter((x: any) => x.isActive !== false)
                  .map((currency: any) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.name} - {currency.symbol}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="جۆری نرخ">
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

            <Field label="نرخ">
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
              لابردن
            </button>
          </div>
        ))}

        <button onClick={addSalePriceRow} style={outlineBtn}>
          + زیادکردنی نرخی تر
        </button>
      </Section>

      <Section title="پێچانەوە" icon="📦">
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
            <Field label="پێچانەوە">
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

            <Field label="ژمارەی ناو پێچانەوە">
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
              لابردن
            </button>
          </div>
        ))}

        <button onClick={addPackageRow} style={outlineBtn}>
          + زیادکردنی پێچانەوەی تر
        </button>
      </Section>

      {itemKind === "inventory" && (
        <Section title="ڕێکخستنەکانی کۆگا و ئاگاداری" icon="▥">
          <div style={grid3}>
            <Field label="کەمترین ئاستی ئاگاداری">
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

            <Field label="بەسەرچوون هەیە؟">
              <select
                value={hasExpiry ? "yes" : "no"}
                onChange={(e) => setHasExpiry(e.target.value === "yes")}
                style={input}
              >
                <option value="no">نییە</option>
                <option value="yes">هەیە</option>
              </select>
            </Field>

            <Field label="ئاگاداری پێش بەسەرچوون / ڕۆژ">
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

      <Section title="حاڵەت" icon="👍">
        <select
          value={isActive ? "چالاک" : "ناچالاک"}
          onChange={(e) => setIsActive(e.target.value === "چالاک")}
          style={input}
        >
          <option>چالاک</option>
          <option>ناچالاک</option>
        </select>
      </Section>

      <div style={footerActions}>
        <button onClick={save} style={saveBtn}>
          💾 خەزنکردن
        </button>
        <button onClick={onBack} style={backBtn}>
          پاشگەزبوونەوە
        </button>
      </div>
      <AlertModal {...alertConfig} onClose={closeAlert} />
    </div>
  );
}

function getItemType(item: Product) {
  if (item.isExpense) return "خەرجی";
  if (item.isService) return "خزمەتگوزاری";
  return "کۆگایی";
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
