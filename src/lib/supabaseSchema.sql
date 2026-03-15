-- ============================================================
-- BillKar — Supabase Database Schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- BUSINESSES
-- One row per business; linked to auth.users via user_id.
-- The on_auth_user_created trigger auto-inserts a row on signup.
-- ────────────────────────────────────────────────────────────
CREATE TABLE businesses (
  id                   UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id              UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                 TEXT         NOT NULL DEFAULT '',
  gstin                TEXT         DEFAULT '',
  pan                  TEXT         DEFAULT '',
  address              TEXT         DEFAULT '',
  city                 TEXT         DEFAULT '',
  state                TEXT         DEFAULT 'Telangana',
  pincode              TEXT         DEFAULT '',
  phone                TEXT         DEFAULT '',
  email                TEXT         DEFAULT '',
  logo_url             TEXT         DEFAULT '',
  signature_url        TEXT         DEFAULT '',
  bank_name            TEXT         DEFAULT '',
  account_number       TEXT         DEFAULT '',
  ifsc                 TEXT         DEFAULT '',
  upi_id               TEXT         DEFAULT '',
  invoice_prefix       TEXT         DEFAULT 'INV',
  next_invoice_number  INTEGER      DEFAULT 1001,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id                UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id       UUID         REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name              TEXT         NOT NULL,
  gstin             TEXT         DEFAULT '',
  phone             TEXT         DEFAULT '',
  email             TEXT         DEFAULT '',
  billing_address   TEXT         DEFAULT '',
  shipping_address  TEXT         DEFAULT '',
  state             TEXT         DEFAULT '',
  balance_due       DECIMAL(12,2) DEFAULT 0,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- PRODUCTS / SERVICES
-- ────────────────────────────────────────────────────────────
CREATE TABLE products (
  id                   UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id          UUID          REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name                 TEXT          NOT NULL,
  hsn_sac_code         TEXT          DEFAULT '',
  type                 TEXT          DEFAULT 'goods',   -- 'goods' | 'service'
  unit                 TEXT          DEFAULT 'pcs',
  selling_price        DECIMAL(12,2) DEFAULT 0,
  purchase_price       DECIMAL(12,2) DEFAULT 0,
  gst_rate             DECIMAL(5,2)  DEFAULT 18,
  stock_quantity       INTEGER       DEFAULT 0,
  low_stock_threshold  INTEGER       DEFAULT 10,
  created_at           TIMESTAMPTZ   DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INVOICES
-- ────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id               UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id      UUID          REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  customer_id      UUID          REFERENCES customers(id),
  customer_name    TEXT          DEFAULT '',
  invoice_number   TEXT          NOT NULL,
  invoice_date     DATE          DEFAULT CURRENT_DATE,
  due_date         DATE,
  type             TEXT          DEFAULT 'Tax Invoice',
  status           TEXT          DEFAULT 'draft',       -- 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  subtotal         DECIMAL(12,2) DEFAULT 0,
  discount_amount  DECIMAL(12,2) DEFAULT 0,
  taxable_amount   DECIMAL(12,2) DEFAULT 0,
  cgst             DECIMAL(12,2) DEFAULT 0,
  sgst             DECIMAL(12,2) DEFAULT 0,
  igst             DECIMAL(12,2) DEFAULT 0,
  total_amount     DECIMAL(12,2) DEFAULT 0,
  amount_paid      DECIMAL(12,2) DEFAULT 0,
  balance_due      DECIMAL(12,2) DEFAULT 0,
  notes            TEXT          DEFAULT '',
  terms            TEXT          DEFAULT '',
  template_id      TEXT          DEFAULT 'modern',
  is_inter_state   BOOLEAN       DEFAULT FALSE,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INVOICE ITEMS
-- ────────────────────────────────────────────────────────────
CREATE TABLE invoice_items (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id      UUID          REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  product_id      UUID          REFERENCES products(id),
  description     TEXT          DEFAULT '',
  hsn             TEXT          DEFAULT '',
  quantity        DECIMAL(10,2) DEFAULT 1,
  unit            TEXT          DEFAULT 'pcs',
  rate            DECIMAL(12,2) DEFAULT 0,
  discount_value  DECIMAL(12,2) DEFAULT 0,
  discount_type   TEXT          DEFAULT 'percent',      -- 'percent' | 'amount'
  taxable_amount  DECIMAL(12,2) DEFAULT 0,
  gst_rate        DECIMAL(5,2)  DEFAULT 18,
  cgst            DECIMAL(12,2) DEFAULT 0,
  sgst            DECIMAL(12,2) DEFAULT 0,
  igst            DECIMAL(12,2) DEFAULT 0,
  total           DECIMAL(12,2) DEFAULT 0,
  sort_order      INTEGER       DEFAULT 0
);

-- ────────────────────────────────────────────────────────────
-- PAYMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id                UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id        UUID          REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  payment_date      DATE          DEFAULT CURRENT_DATE,
  payment_method    TEXT          DEFAULT 'cash',       -- 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card'
  reference_number  TEXT          DEFAULT '',
  notes             TEXT          DEFAULT '',
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- EXPENSES
-- ────────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id           UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id  UUID          REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  category     TEXT          NOT NULL,
  description  TEXT          DEFAULT '',
  amount       DECIMAL(12,2) NOT NULL,
  gst_amount   DECIMAL(12,2) DEFAULT 0,
  date         DATE          DEFAULT CURRENT_DATE,
  vendor_name  TEXT          DEFAULT '',
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
ALTER TABLE businesses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses      ENABLE ROW LEVEL SECURITY;

-- Businesses: owner only
CREATE POLICY "Users manage own businesses"
  ON businesses FOR ALL
  USING (auth.uid() = user_id);

-- Customers: scoped to user's businesses
CREATE POLICY "Users manage own customers"
  ON customers FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Products: scoped to user's businesses
CREATE POLICY "Users manage own products"
  ON products FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Invoices: scoped to user's businesses
CREATE POLICY "Users manage own invoices"
  ON invoices FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Invoice items: scoped through invoices → businesses
CREATE POLICY "Users manage own invoice_items"
  ON invoice_items FOR ALL
  USING (invoice_id IN (
    SELECT id FROM invoices
    WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  ));

-- Payments: scoped through invoices → businesses
CREATE POLICY "Users manage own payments"
  ON payments FOR ALL
  USING (invoice_id IN (
    SELECT id FROM invoices
    WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  ));

-- Expenses: scoped to user's businesses
CREATE POLICY "Users manage own expenses"
  ON expenses FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- TRIGGER: auto-create business row on new user signup
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO businesses (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
