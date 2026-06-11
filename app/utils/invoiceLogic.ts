import { Invoice } from "../types";
import { store } from "../store/store";

import {
  increaseCashbox,
  decreaseCashbox,
  increaseAccountBalance,
  decreaseAccountBalance,
  increaseStock,
  decreaseStock,
} from "./accounting";

export function saveInvoice(
  invoice: Invoice
) {
  store.invoices.push(invoice);

  switch (invoice.type) {
    case "کڕین":
      handlePurchase(invoice);
      break;

    case "فرۆشتن":
      handleSale(invoice);
      break;

    case "پارەی هاتوو":
      handleIncome(invoice);
      break;

    case "پارەی ڕۆشتوو":
      handleExpense(invoice);
      break;

    case "خەرجی":
      handleExpenseInvoice(invoice);
      break;

    case "گەڕاندنەوەی فرۆش":
      handleReturnSale(invoice);
      break;

    case "گەڕاندنەوەی کڕین":
      handleReturnPurchase(invoice);
      break;

    case "دانانی پارە":
      handleCapital(invoice);
      break;

    case "کشانەوەی پارە":
      handleWithdraw(invoice);
      break;
  }
}

function handlePurchase(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    decreaseCashbox(
      invoice.cashboxId,
      invoice.paid
    );
  }

  if (
    invoice.accountId &&
    invoice.remaining > 0
  ) {
    increaseAccountBalance(
      invoice.accountId,
      invoice.remaining
    );
  }

  invoice.items.forEach((item) => {
    increaseStock(
      item.productId,
      item.quantity
    );
  });
}

function handleSale(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    increaseCashbox(
      invoice.cashboxId,
      invoice.paid
    );
  }

  if (
    invoice.accountId &&
    invoice.remaining > 0
  ) {
    increaseAccountBalance(
      invoice.accountId,
      invoice.remaining
    );
  }

  invoice.items.forEach((item) => {
    decreaseStock(
      item.productId,
      item.quantity
    );
  });
}

function handleIncome(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    increaseCashbox(
      invoice.cashboxId,
      invoice.paid
    );
  }

  if (invoice.accountId) {
    decreaseAccountBalance(
      invoice.accountId,
      invoice.paid
    );
  }
}

function handleExpense(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    decreaseCashbox(
      invoice.cashboxId,
      invoice.paid
    );
  }

  if (invoice.accountId) {
    decreaseAccountBalance(
      invoice.accountId,
      invoice.paid
    );
  }
}

function handleExpenseInvoice(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    decreaseCashbox(
      invoice.cashboxId,
      invoice.total
    );
  }
}

function handleReturnSale(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    decreaseCashbox(
      invoice.cashboxId,
      invoice.paid
    );
  }

  if (invoice.accountId) {
    decreaseAccountBalance(
      invoice.accountId,
      invoice.total
    );
  }

  invoice.items.forEach((item) => {
    increaseStock(
      item.productId,
      item.quantity
    );
  });
}

function handleReturnPurchase(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    increaseCashbox(
      invoice.cashboxId,
      invoice.paid
    );
  }

  if (invoice.accountId) {
    decreaseAccountBalance(
      invoice.accountId,
      invoice.total
    );
  }

  invoice.items.forEach((item) => {
    decreaseStock(
      item.productId,
      item.quantity
    );
  });
}

function handleCapital(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    increaseCashbox(
      invoice.cashboxId,
      invoice.total
    );
  }
}

function handleWithdraw(
  invoice: Invoice
) {
  if (invoice.cashboxId) {
    decreaseCashbox(
      invoice.cashboxId,
      invoice.total
    );
  }
}