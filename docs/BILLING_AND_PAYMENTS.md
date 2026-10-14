# Financial Integrity, Taxes & Payment Integrity

## 1. Authoritative Sources of Truth

- **Shopify**: Authoritative for payment collection, gross order total, discounts, customer contact, and delivery address.
- **Petpooja POS**: Authoritative for kitchen preparation, table allocation, POS cashier billing, and status execution.

---

## 2. Decimal Precision & Financial Integrity

All currency math in the middleware utilizes **arbitrary-precision decimal arithmetic (`decimal.js`)** to prevent IEEE 754 floating point rounding bugs.

### Calculation Sequence:
```
Subtotal = Σ (Line Item Price * Line Item Quantity)
Effective Discount = max(Order-Level Discount, Σ Line Item Discounts)
Total Shipping = Shipping Price
Total Tax = Shopify Reported Total Tax (GST CGST/SGST/IGST)
Calculated Sum = Subtotal - Effective Discount + Total Shipping + Total Tax
Difference = | Calculated Sum - Shopify Reported Total |
```

If `Difference > 0.05` currency units, the order is flagged as `NEEDS_REVIEW` and not pushed to the POS until verified by an operator.

---

## 3. Payment Method Classification

The middleware automatically translates Shopify gateways to Petpooja's expected `payment_type`:
- **COD (Cash On Delivery)**: Set when `financial_status === "pending"` or payment gateway matches `/cash|cod|manual/i`.
- **Prepaid / ONLINE**: Set for Razorpay, Stripe, Paytm, UPI, Card, or Net Banking where `financial_status === "paid"` or `"authorized"`.
