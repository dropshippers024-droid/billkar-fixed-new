import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'

// ── Types ────────────────────────────────────────────
type Env = {
  DB: D1Database
  JWT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
  FRONTEND_URL: string
  SUPPORT_EMAIL?: string
  MAIL_FROM_EMAIL?: string
  MAIL_FROM_NAME?: string
  RESET_TOKEN_TTL_MINUTES?: string
}

type Variables = {
  userId: string
  businessId?: string
  teamRole?: string
}

type AppEnv = { Bindings: Env; Variables: Variables }
type AppContext = Context<AppEnv>

type JwtPayload = {
  sub: string
  exp?: number
}

type TeamAccessRow = {
  role: string
}

type UserRow = {
  id: string
  email: string
  password_hash: string
  full_name: string
  phone?: string | null
  avatar_url?: string | null
  plan?: string | null
  plan_expires_at?: string | null
  created_at?: string
}

type BusinessRow = {
  id: string
  user_id: string
  name: string
  gstin?: string | null
}

type InviteRow = {
  id: string
  business_id: string
  email: string
  role: string
  status: string
  user_id?: string | null
}

type CustomerRow = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  gstin?: string | null
  state?: string | null
  billing_address?: string | null
}

type InvoiceRow = {
  id: string
  business_id: string
  customer_id?: string | null
  customer_name: string
  invoice_number: string
  invoice_date?: string | null
  due_date?: string | null
  type?: string | null
  status: string
  subtotal?: number | string | null
  taxable_amount?: number | string | null
  cgst?: number | string | null
  sgst?: number | string | null
  igst?: number | string | null
  total_amount?: number | string | null
  amount_paid?: number | string | null
  balance_due?: number | string | null
  notes?: string | null
  terms?: string | null
  template_id?: string | null
  is_inter_state?: number | boolean | null
  created_at?: string | null
}

type PaymentRow = {
  id: string
  invoice_id: string
  amount?: number | string | null
  payment_date?: string | null
  payment_method?: string | null
  reference_number?: string | null
  notes?: string | null
}

type RecurringInvoiceRow = {
  id: string
  business_id: string
  source_invoice_id?: string | null
  customer_id?: string | null
  customer_name: string
  frequency: string
  start_date: string
  next_date: string
  end_date?: string | null
  auto_send?: number | boolean | null
  active?: number | boolean | null
  invoice_data?: string | null
}

type BusinessSequenceRow = {
  invoice_prefix?: string | null
  next_invoice_number?: number | string | null
}

type TableInfoRow = {
  name?: string
}

type GoogleTokenResponse = {
  access_token?: string
  [key: string]: unknown
}

type GoogleUserProfile = {
  email?: string
  name?: string
  picture?: string
}

type PasswordResetRow = {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  used_at?: string | null
}

type CountRow = {
  count?: number
}

type SumRow = {
  total_paid?: number
}

const app = new Hono<AppEnv>()
const encoder = new TextEncoder()
const PASSWORD_HASH_PREFIX = 'pbkdf2'
const PASSWORD_HASH_ALGO = 'sha-256'
const PASSWORD_HASH_ITERATIONS = 100000
const PASSWORD_HASH_LENGTH = 256
const RESET_TOKEN_BYTES = 32
const DEFAULT_RESET_TOKEN_TTL_MINUTES = 60
const MIN_PASSWORD_LENGTH = 8
const ASSIGNABLE_TEAM_ROLES = new Set(['admin', 'staff', 'viewer'])
let coreSchemaReady: Promise<void> | null = null

app.use('*', cors({ origin: '*' }))

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function getResetTokenTtlMinutes(env: Env): number {
  const parsed = Number(env.RESET_TOKEN_TTL_MINUTES || DEFAULT_RESET_TOKEN_TTL_MINUTES)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RESET_TOKEN_TTL_MINUTES
}

function randomToken(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(RESET_TOKEN_BYTES)))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getOptionalString(value: unknown): string | null {
  const trimmed = getTrimmedString(value)
  return trimmed ? trimmed : null
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBooleanInt(value: unknown): number {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['1', 'true', 'yes'].includes(normalized) ? 1 : 0
  }
  return value ? 1 : 0
}

function getAssignableTeamRole(value: unknown): 'admin' | 'staff' | 'viewer' | null {
  const role = getTrimmedString(value).toLowerCase()
  return ASSIGNABLE_TEAM_ROLES.has(role) ? (role as 'admin' | 'staff' | 'viewer') : null
}

async function createJWT(userId: string, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payload = btoa(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const data = new TextEncoder().encode(`${header}.${payload}`)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, data)
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${header}.${payload}.${signature}`
}

async function verifyJWT(token: string, secret: string): Promise<string | null> {
  try {
    const [header, payload, signature] = token.split('.')
    if (!header || !payload || !signature) return null
    const data = new TextEncoder().encode(`${header}.${payload}`)
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, data)
    if (!valid) return null
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null
    return decoded.sub as string
  } catch { return null }
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: PASSWORD_HASH_ALGO.toUpperCase(), salt, iterations: PASSWORD_HASH_ITERATIONS }, key, PASSWORD_HASH_LENGTH)
  const digest = new Uint8Array(derivedBits)
  return [PASSWORD_HASH_PREFIX, PASSWORD_HASH_ALGO, String(PASSWORD_HASH_ITERATIONS), encodeBase64Url(salt), encodeBase64Url(digest)].join('$')
}

async function verifyPassword(password: string, storedHash: string): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!storedHash) return { valid: false, needsUpgrade: false }
  if (storedHash.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const [, hashAlgo, iterationValue, saltValue, digestValue] = storedHash.split('$')
    const iterations = Number(iterationValue)
    if (!hashAlgo || !saltValue || !digestValue || !Number.isFinite(iterations) || iterations <= 0) return { valid: false, needsUpgrade: false }
    const salt = decodeBase64Url(saltValue)
    const expectedDigest = decodeBase64Url(digestValue)
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
    const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: hashAlgo.toUpperCase(), salt, iterations }, key, expectedDigest.length * 8)
    return { valid: timingSafeEqual(new Uint8Array(derivedBits), expectedDigest), needsUpgrade: false }
  }
  const legacyHash = await sha256Hex(password)
  const valid = storedHash === legacyHash
  return { valid, needsUpgrade: valid }
}

async function ensurePasswordResetTable(db: D1Database): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS password_reset_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT DEFAULT NULL, created_at TEXT DEFAULT (datetime('now')))`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash)').run()
}

async function hasColumn(db: D1Database, tableName: string, columnName: string): Promise<boolean> {
  const pragma = await db.prepare(`PRAGMA table_info(${tableName})`).all<TableInfoRow>()
  return (pragma.results || []).some((column) => String(column.name || '') === columnName)
}

async function ensureColumn(db: D1Database, tableName: string, columnName: string, definition: string): Promise<void> {
  if (await hasColumn(db, tableName, columnName)) return
  const alterDefinition = definition.replace(/\s+DEFAULT\s+\((?:date|datetime)\('now'\)\)/i, '').trim()
  try {
    await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${alterDefinition}`).run()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.toLowerCase().includes('duplicate column')) throw err
  }
}

async function ensureCoreSchema(db: D1Database): Promise<void> {
  if (!coreSchemaReady) {
    coreSchemaReady = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL DEFAULT '', full_name TEXT NOT NULL DEFAULT '', phone TEXT DEFAULT '', avatar_url TEXT DEFAULT '', plan TEXT DEFAULT 'free', plan_expires_at TEXT DEFAULT NULL, created_at TEXT DEFAULT (datetime('now')))`).run()
      await ensureColumn(db, 'users', 'phone', "TEXT DEFAULT ''")
      await ensureColumn(db, 'users', 'avatar_url', "TEXT DEFAULT ''")
      await ensureColumn(db, 'users', 'plan', "TEXT DEFAULT 'free'")
      await ensureColumn(db, 'users', 'plan_expires_at', 'TEXT DEFAULT NULL')
      await ensureColumn(db, 'users', 'created_at', "TEXT DEFAULT (datetime('now'))")
      await db.prepare(`CREATE TABLE IF NOT EXISTS businesses (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', gstin TEXT DEFAULT '', pan TEXT DEFAULT '', email TEXT DEFAULT '', phone TEXT DEFAULT '', address TEXT DEFAULT '', city TEXT DEFAULT '', state TEXT DEFAULT 'Telangana', pincode TEXT DEFAULT '', logo_url TEXT DEFAULT '', signature_url TEXT DEFAULT '', bank_name TEXT DEFAULT '', account_number TEXT DEFAULT '', ifsc TEXT DEFAULT '', upi_id TEXT DEFAULT '', invoice_prefix TEXT DEFAULT 'INV', next_invoice_number INTEGER DEFAULT 1001, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`).run()
      await ensureColumn(db, 'businesses', 'gstin', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'pan', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'email', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'phone', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'address', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'city', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'state', "TEXT DEFAULT 'Telangana'")
      await ensureColumn(db, 'businesses', 'pincode', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'logo_url', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'signature_url', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'bank_name', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'account_number', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'ifsc', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'upi_id', "TEXT DEFAULT ''")
      await ensureColumn(db, 'businesses', 'invoice_prefix', "TEXT DEFAULT 'INV'")
      await ensureColumn(db, 'businesses', 'next_invoice_number', 'INTEGER DEFAULT 1001')
      await ensureColumn(db, 'businesses', 'created_at', "TEXT DEFAULT (datetime('now'))")
      await ensureColumn(db, 'businesses', 'updated_at', "TEXT DEFAULT (datetime('now'))")
      await db.prepare(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL, gstin TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', billing_address TEXT DEFAULT '', shipping_address TEXT DEFAULT '', state TEXT DEFAULT '', balance_due REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`).run()
      await ensureColumn(db, 'customers', 'gstin', "TEXT DEFAULT ''")
      await ensureColumn(db, 'customers', 'phone', "TEXT DEFAULT ''")
      await ensureColumn(db, 'customers', 'email', "TEXT DEFAULT ''")
      await ensureColumn(db, 'customers', 'billing_address', "TEXT DEFAULT ''")
      await ensureColumn(db, 'customers', 'shipping_address', "TEXT DEFAULT ''")
      await ensureColumn(db, 'customers', 'state', "TEXT DEFAULT ''")
      await ensureColumn(db, 'customers', 'balance_due', 'REAL DEFAULT 0')
      await ensureColumn(db, 'customers', 'created_at', "TEXT DEFAULT (datetime('now'))")
      await db.prepare(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL, hsn_sac_code TEXT DEFAULT '', type TEXT DEFAULT 'goods', unit TEXT DEFAULT 'pcs', selling_price REAL DEFAULT 0, purchase_price REAL DEFAULT 0, gst_rate REAL DEFAULT 18, stock_quantity REAL DEFAULT 0, low_stock_threshold REAL DEFAULT 10, created_at TEXT DEFAULT (datetime('now')))`).run()
      await ensureColumn(db, 'products', 'hsn_sac_code', "TEXT DEFAULT ''")
      await ensureColumn(db, 'products', 'type', "TEXT DEFAULT 'goods'")
      await ensureColumn(db, 'products', 'unit', "TEXT DEFAULT 'pcs'")
      await ensureColumn(db, 'products', 'selling_price', 'REAL DEFAULT 0')
      await ensureColumn(db, 'products', 'purchase_price', 'REAL DEFAULT 0')
      await ensureColumn(db, 'products', 'gst_rate', 'REAL DEFAULT 18')
      await ensureColumn(db, 'products', 'stock_quantity', 'REAL DEFAULT 0')
      await ensureColumn(db, 'products', 'low_stock_threshold', 'REAL DEFAULT 10')
      await ensureColumn(db, 'products', 'created_at', "TEXT DEFAULT (datetime('now'))")
      await db.prepare(`CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, customer_id TEXT DEFAULT NULL, customer_name TEXT DEFAULT '', invoice_number TEXT NOT NULL, invoice_date TEXT DEFAULT (date('now')), due_date TEXT DEFAULT NULL, type TEXT DEFAULT 'Tax Invoice', status TEXT DEFAULT 'draft', subtotal REAL DEFAULT 0, discount_amount REAL DEFAULT 0, taxable_amount REAL DEFAULT 0, cgst REAL DEFAULT 0, sgst REAL DEFAULT 0, igst REAL DEFAULT 0, total_amount REAL DEFAULT 0, amount_paid REAL DEFAULT 0, balance_due REAL DEFAULT 0, notes TEXT DEFAULT '', terms TEXT DEFAULT '', template_id TEXT DEFAULT 'modern', is_inter_state INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`).run()
      await ensureColumn(db, 'invoices', 'customer_id', 'TEXT DEFAULT NULL')
      await ensureColumn(db, 'invoices', 'customer_name', "TEXT DEFAULT ''")
      await ensureColumn(db, 'invoices', 'invoice_date', "TEXT DEFAULT (date('now'))")
      await ensureColumn(db, 'invoices', 'due_date', 'TEXT DEFAULT NULL')
      await ensureColumn(db, 'invoices', 'type', "TEXT DEFAULT 'Tax Invoice'")
      await ensureColumn(db, 'invoices', 'status', "TEXT DEFAULT 'draft'")
      await ensureColumn(db, 'invoices', 'subtotal', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'discount_amount', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'taxable_amount', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'cgst', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'sgst', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'igst', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'total_amount', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'amount_paid', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'balance_due', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoices', 'notes', "TEXT DEFAULT ''")
      await ensureColumn(db, 'invoices', 'terms', "TEXT DEFAULT ''")
      await ensureColumn(db, 'invoices', 'template_id', "TEXT DEFAULT 'modern'")
      await ensureColumn(db, 'invoices', 'is_inter_state', 'INTEGER DEFAULT 0')
      await ensureColumn(db, 'invoices', 'created_at', "TEXT DEFAULT (datetime('now'))")
      await ensureColumn(db, 'invoices', 'updated_at', "TEXT DEFAULT (datetime('now'))")
      await db.prepare(`CREATE TABLE IF NOT EXISTS invoice_items (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, product_id TEXT DEFAULT NULL, description TEXT DEFAULT '', hsn TEXT DEFAULT '', quantity REAL DEFAULT 1, unit TEXT DEFAULT 'pcs', rate REAL DEFAULT 0, discount_value REAL DEFAULT 0, discount_type TEXT DEFAULT 'percent', taxable_amount REAL DEFAULT 0, gst_rate REAL DEFAULT 18, cgst REAL DEFAULT 0, sgst REAL DEFAULT 0, igst REAL DEFAULT 0, total REAL DEFAULT 0, sort_order INTEGER DEFAULT 0)`).run()
      await ensureColumn(db, 'invoice_items', 'product_id', 'TEXT DEFAULT NULL')
      await ensureColumn(db, 'invoice_items', 'description', "TEXT DEFAULT ''")
      await ensureColumn(db, 'invoice_items', 'hsn', "TEXT DEFAULT ''")
      await ensureColumn(db, 'invoice_items', 'quantity', 'REAL DEFAULT 1')
      await ensureColumn(db, 'invoice_items', 'unit', "TEXT DEFAULT 'pcs'")
      await ensureColumn(db, 'invoice_items', 'rate', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoice_items', 'discount_value', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoice_items', 'discount_type', "TEXT DEFAULT 'percent'")
      await ensureColumn(db, 'invoice_items', 'taxable_amount', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoice_items', 'gst_rate', 'REAL DEFAULT 18')
      await ensureColumn(db, 'invoice_items', 'cgst', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoice_items', 'sgst', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoice_items', 'igst', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoice_items', 'total', 'REAL DEFAULT 0')
      await ensureColumn(db, 'invoice_items', 'sort_order', 'INTEGER DEFAULT 0')
      await db.prepare(`CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, category TEXT DEFAULT '', description TEXT DEFAULT '', amount REAL DEFAULT 0, gst_amount REAL DEFAULT 0, date TEXT DEFAULT NULL, vendor_name TEXT DEFAULT '', receipt_url TEXT DEFAULT '', payment_method TEXT DEFAULT 'cash', created_at TEXT DEFAULT (datetime('now')))`).run()
      await ensureColumn(db, 'expenses', 'category', "TEXT DEFAULT ''")
      await ensureColumn(db, 'expenses', 'description', "TEXT DEFAULT ''")
      await ensureColumn(db, 'expenses', 'amount', 'REAL DEFAULT 0')
      await ensureColumn(db, 'expenses', 'gst_amount', 'REAL DEFAULT 0')
      await ensureColumn(db, 'expenses', 'date', 'TEXT DEFAULT NULL')
      await ensureColumn(db, 'expenses', 'vendor_name', "TEXT DEFAULT ''")
      await ensureColumn(db, 'expenses', 'receipt_url', "TEXT DEFAULT ''")
      await ensureColumn(db, 'expenses', 'payment_method', "TEXT DEFAULT 'cash'")
      await ensureColumn(db, 'expenses', 'created_at', "TEXT DEFAULT (datetime('now'))")
      await db.prepare(`CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, amount REAL DEFAULT 0, payment_date TEXT DEFAULT NULL, payment_method TEXT DEFAULT 'cash', reference_number TEXT DEFAULT '', notes TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))`).run()
      await ensureColumn(db, 'payments', 'amount', 'REAL DEFAULT 0')
      await ensureColumn(db, 'payments', 'payment_date', 'TEXT DEFAULT NULL')
      await ensureColumn(db, 'payments', 'payment_method', "TEXT DEFAULT 'cash'")
      await ensureColumn(db, 'payments', 'reference_number', "TEXT DEFAULT ''")
      await ensureColumn(db, 'payments', 'notes', "TEXT DEFAULT ''")
      await ensureColumn(db, 'payments', 'created_at', "TEXT DEFAULT (datetime('now'))")
      await db.prepare(`CREATE TABLE IF NOT EXISTS team_members (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, invited_by TEXT DEFAULT NULL, email TEXT NOT NULL, role TEXT DEFAULT 'staff', status TEXT DEFAULT 'pending', user_id TEXT DEFAULT NULL, invited_at TEXT DEFAULT (datetime('now')), joined_at TEXT DEFAULT NULL)`).run()
      await ensureColumn(db, 'team_members', 'invited_by', 'TEXT DEFAULT NULL')
      await ensureColumn(db, 'team_members', 'email', "TEXT NOT NULL DEFAULT ''")
      await ensureColumn(db, 'team_members', 'role', "TEXT DEFAULT 'staff'")
      await ensureColumn(db, 'team_members', 'status', "TEXT DEFAULT 'pending'")
      await ensureColumn(db, 'team_members', 'user_id', 'TEXT DEFAULT NULL')
      await ensureColumn(db, 'team_members', 'invited_at', "TEXT DEFAULT (datetime('now'))")
      await ensureColumn(db, 'team_members', 'joined_at', 'TEXT DEFAULT NULL')
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON expenses(business_id)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_team_members_business_id ON team_members(business_id)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email)').run()
      await ensurePasswordResetTable(db)
      await ensureRecurringInvoicesTable(db)
    })().catch((err) => { coreSchemaReady = null; throw err })
  }
  await coreSchemaReady
}

async function createPasswordResetToken(db: D1Database, userId: string, ttlMinutes: number): Promise<string> {
  await ensurePasswordResetTable(db)
  const token = randomToken()
  const tokenHash = await sha256Hex(token)
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
  await db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(userId).run()
  await db.prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), userId, tokenHash, expiresAt).run()
  return token
}

async function sendEmail(fromEmail: string, fromName: string, toEmail: string, toName: string, subject: string, textBody: string, htmlBody: string, supportEmail: string): Promise<void> {
  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail, name: toName }] }],
      from: { email: fromEmail, name: fromName },
      reply_to: { email: supportEmail, name: fromName },
      subject,
      content: [{ type: 'text/plain', value: textBody }, { type: 'text/html', value: htmlBody }],
    }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Email failed (${response.status}): ${errorText}`)
  }
}

async function sendPasswordResetEmail(c: AppContext, email: string, resetLink: string): Promise<void> {
  const fromEmail = c.env.MAIL_FROM_EMAIL || 'no-reply@billkar.co.in'
  const fromName = c.env.MAIL_FROM_NAME || 'BillKar'
  const supportEmail = c.env.SUPPORT_EMAIL || 'support@billkar.co.in'
  const textBody = `You requested a password reset for your BillKar account.\n\nReset your password: ${resetLink}\n\nThis link will expire in ${getResetTokenTtlMinutes(c.env)} minutes.\nIf you did not request this, you can ignore this email.\n\nNeed help? Reply to ${supportEmail}.`
  const htmlBody = `<p>You requested a password reset for your BillKar account.</p><p><a href="${resetLink}">Reset your password</a></p><p>This link will expire in ${getResetTokenTtlMinutes(c.env)} minutes.</p><p>If you did not request this, you can safely ignore this email.</p><p>Need help? Reply to <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>`
  await sendEmail(fromEmail, fromName, email, '', 'Reset your BillKar password', textBody, htmlBody, supportEmail)
}

async function upsertCustomerFromInvoiceInput(db: D1Database, businessId: string, invoiceInput: Record<string, unknown>): Promise<{ customerId: string | null; customerName: string }> {
  const requestedCustomerId = getOptionalString(invoiceInput.customer_id)
  const requestedCustomerName = getTrimmedString(invoiceInput.customer_name)
  const customerEmail = getOptionalString(invoiceInput.customer_email)
  const customerPhone = getOptionalString(invoiceInput.customer_phone)
  const customerGstin = getOptionalString(invoiceInput.customer_gstin)
  const customerState = getOptionalString(invoiceInput.customer_state)
  const customerAddress = getOptionalString(invoiceInput.customer_address)
  let customer = requestedCustomerId ? await db.prepare('SELECT id, name, email, phone, gstin, state, billing_address FROM customers WHERE id = ? AND business_id = ?').bind(requestedCustomerId, businessId).first<CustomerRow>() : null
  if (!customer && requestedCustomerName) customer = await db.prepare('SELECT id, name, email, phone, gstin, state, billing_address FROM customers WHERE business_id = ? AND LOWER(name) = LOWER(?)').bind(businessId, requestedCustomerName).first<CustomerRow>()
  if (!customer && requestedCustomerName) {
    const id = crypto.randomUUID()
    await db.prepare('INSERT INTO customers (id, business_id, name, gstin, phone, email, billing_address, shipping_address, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, businessId, requestedCustomerName, customerGstin ?? '', customerPhone ?? '', customerEmail ?? '', customerAddress ?? '', '', customerState ?? '').run()
    return { customerId: id, customerName: requestedCustomerName }
  }
  if (customer?.id) {
    await db.prepare(`UPDATE customers SET email = COALESCE(NULLIF(?, ''), email), phone = COALESCE(NULLIF(?, ''), phone), gstin = COALESCE(NULLIF(?, ''), gstin), state = COALESCE(NULLIF(?, ''), state), billing_address = COALESCE(NULLIF(?, ''), billing_address) WHERE id = ? AND business_id = ?`).bind(customerEmail ?? '', customerPhone ?? '', customerGstin ?? '', customerState ?? '', customerAddress ?? '', customer.id, businessId).run()
    return { customerId: customer.id, customerName: requestedCustomerName || customer.name || '' }
  }
  return { customerId: customer?.id || null, customerName: requestedCustomerName || customer?.name || '' }
}

async function replaceInvoiceItems(db: D1Database, invoiceId: string, rawItems: unknown): Promise<void> {
  await db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').bind(invoiceId).run()
  if (!Array.isArray(rawItems)) return
  for (let index = 0; index < rawItems.length; index++) {
    const item = asRecord(rawItems[index])
    if (!Object.keys(item).length) continue
    await db.prepare(`INSERT INTO invoice_items (id, invoice_id, description, hsn, quantity, unit, rate, discount_value, discount_type, taxable_amount, gst_rate, cgst, sgst, igst, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), invoiceId, getTrimmedString(item.description) || getTrimmedString(item.name), getTrimmedString(item.hsn), toFiniteNumber(item.quantity ?? item.qty, 1), getTrimmedString(item.unit) || 'pcs', toFiniteNumber(item.rate, 0), toFiniteNumber(item.discount_value ?? item.discountValue, 0), getTrimmedString(item.discount_type) || 'percent', toFiniteNumber(item.taxable_amount, 0), toFiniteNumber(item.gst_rate ?? item.gst_percent ?? item.gstPercent, 18), toFiniteNumber(item.cgst, 0), toFiniteNumber(item.sgst, 0), toFiniteNumber(item.igst, 0), toFiniteNumber(item.total, 0), toFiniteNumber(item.sort_order, index)).run()
  }
}

async function fetchScopedInvoice(db: D1Database, invoiceId: string, businessId: string): Promise<Record<string, unknown> | null> {
  return db.prepare(`SELECT i.*, c.email as customer_email, c.phone as customer_phone, c.gstin as customer_gstin, c.state as customer_state FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.id = ? AND i.business_id = ?`).bind(invoiceId, businessId).first<Record<string, unknown>>()
}

async function recalculateInvoicePaymentSummary(db: D1Database, invoiceId: string, businessId: string): Promise<Record<string, unknown> | null> {
  const invoice = await db.prepare('SELECT id, business_id, due_date, status, total_amount FROM invoices WHERE id = ? AND business_id = ?').bind(invoiceId, businessId).first<InvoiceRow>()
  if (!invoice) return null
  const paymentTotals = await db.prepare('SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = ?').bind(invoiceId).first<SumRow>()
  const totalAmount = toFiniteNumber(invoice.total_amount, 0)
  const totalPaid = toFiniteNumber(paymentTotals?.total_paid, 0)
  const balanceDue = Math.max(totalAmount - totalPaid, 0)
  let nextStatus = invoice.status || 'draft'
  if (nextStatus !== 'cancelled') {
    if (totalAmount > 0 && balanceDue <= 0) { nextStatus = 'paid' }
    else if (totalPaid > 0) { nextStatus = 'partial' }
    else if (nextStatus !== 'draft') {
      const today = new Date().toISOString().split('T')[0]
      nextStatus = invoice.due_date && invoice.due_date < today ? 'overdue' : 'sent'
    }
  }
  await db.prepare('UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ? WHERE id = ? AND business_id = ?').bind(totalPaid, balanceDue, nextStatus, invoiceId, businessId).run()
  return fetchScopedInvoice(db, invoiceId, businessId)
}

function normalizeRecurringFrequency(value: unknown): 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null {
  const frequency = getTrimmedString(value).toLowerCase()
  if (frequency === 'weekly' || frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') return frequency
  return null
}

function normalizeISODate(value: unknown): string | null {
  const date = getTrimmedString(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function differenceInDays(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 30
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
  return diff > 0 ? diff : 30
}

function getNextRecurringDate(date: string, frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  const next = new Date(`${date}T00:00:00Z`)
  if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7)
  if (frequency === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1)
  if (frequency === 'quarterly') next.setUTCMonth(next.getUTCMonth() + 3)
  if (frequency === 'yearly') next.setUTCFullYear(next.getUTCFullYear() + 1)
  return next.toISOString().slice(0, 10)
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

async function ensureRecurringInvoicesTable(db: D1Database): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS recurring_invoices (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, source_invoice_id TEXT, customer_id TEXT, customer_name TEXT NOT NULL, frequency TEXT NOT NULL, start_date TEXT NOT NULL, next_date TEXT NOT NULL, end_date TEXT DEFAULT NULL, auto_send INTEGER DEFAULT 0, active INTEGER DEFAULT 1, invoice_data TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_recurring_invoices_business_id ON recurring_invoices(business_id)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_date)').run()
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_invoices_source_invoice_id ON recurring_invoices(source_invoice_id)').run()
}

async function generateManagedInvoiceNumber(db: D1Database, businessId: string): Promise<string> {
  const business = await db.prepare('SELECT invoice_prefix, next_invoice_number FROM businesses WHERE id = ?').bind(businessId).first<BusinessSequenceRow>()
  const prefix = getTrimmedString(business?.invoice_prefix) || 'INV'
  const nextNumber = Math.max(1, toFiniteNumber(business?.next_invoice_number, 1001))
  await db.prepare('UPDATE businesses SET next_invoice_number = ? WHERE id = ?').bind(nextNumber + 1, businessId).run()
  return `${prefix}-${nextNumber}`
}

function buildRecurringInvoiceSnapshot(invoiceInput: Record<string, unknown>, customerId: string | null, customerName: string): Record<string, unknown> {
  return { customer_id: customerId, customer_name: customerName, customer_email: getTrimmedString(invoiceInput.customer_email), customer_phone: getTrimmedString(invoiceInput.customer_phone), customer_gstin: getTrimmedString(invoiceInput.customer_gstin), customer_state: getTrimmedString(invoiceInput.customer_state), customer_address: getTrimmedString(invoiceInput.customer_address), subtotal: toFiniteNumber(invoiceInput.subtotal, 0), taxable_amount: toFiniteNumber(invoiceInput.taxable_amount, 0), cgst: toFiniteNumber(invoiceInput.cgst, 0), sgst: toFiniteNumber(invoiceInput.sgst, 0), igst: toFiniteNumber(invoiceInput.igst, 0), total_amount: toFiniteNumber(invoiceInput.total_amount, 0), notes: getTrimmedString(invoiceInput.notes), terms: getTrimmedString(invoiceInput.terms), template_id: getTrimmedString(invoiceInput.template_id) || 'modern', is_inter_state: toBooleanInt(invoiceInput.is_inter_state), items: Array.isArray(invoiceInput.items) ? invoiceInput.items : [], due_days: differenceInDays(normalizeISODate(invoiceInput.invoice_date), normalizeISODate(invoiceInput.due_date)) }
}

async function upsertRecurringInvoice(db: D1Database, businessId: string, sourceInvoiceId: string, customerId: string | null, customerName: string, invoiceInput: Record<string, unknown>): Promise<void> {
  await ensureRecurringInvoicesTable(db)
  const recurring = asRecord(invoiceInput.recurring)
  const enabled = recurring.enabled === undefined ? true : Boolean(recurring.enabled)
  if (!enabled) { await db.prepare('DELETE FROM recurring_invoices WHERE source_invoice_id = ? AND business_id = ?').bind(sourceInvoiceId, businessId).run(); return }
  const frequency = normalizeRecurringFrequency(recurring.frequency)
  const startDate = normalizeISODate(recurring.start_date)
  const endDate = normalizeISODate(recurring.end_date)
  if (!frequency || !startDate) return
  const invoiceData = JSON.stringify(buildRecurringInvoiceSnapshot(invoiceInput, customerId, customerName))
  const autoSend = toBooleanInt(recurring.auto_send)
  const existing = await db.prepare('SELECT id FROM recurring_invoices WHERE source_invoice_id = ? AND business_id = ?').bind(sourceInvoiceId, businessId).first<Pick<RecurringInvoiceRow, 'id'>>()
  if (existing?.id) {
    await db.prepare(`UPDATE recurring_invoices SET customer_id = ?, customer_name = ?, frequency = ?, start_date = ?, next_date = CASE WHEN next_date < ? THEN ? ELSE next_date END, end_date = ?, auto_send = ?, active = 1, invoice_data = ?, updated_at = datetime('now') WHERE id = ? AND business_id = ?`).bind(customerId, customerName, frequency, startDate, startDate, startDate, endDate, autoSend, invoiceData, existing.id, businessId).run()
    return
  }
  await db.prepare(`INSERT INTO recurring_invoices (id, business_id, source_invoice_id, customer_id, customer_name, frequency, start_date, next_date, end_date, auto_send, active, invoice_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`).bind(crypto.randomUUID(), businessId, sourceInvoiceId, customerId, customerName, frequency, startDate, startDate, endDate, autoSend, invoiceData).run()
}

async function generateDueRecurringInvoices(db: D1Database, businessId: string): Promise<{ generatedCount: number }> {
  await ensureRecurringInvoicesTable(db)
  const today = new Date().toISOString().slice(0, 10)
  const { results } = await db.prepare(`SELECT * FROM recurring_invoices WHERE business_id = ? AND active = 1 AND next_date <= ? AND (end_date IS NULL OR next_date <= end_date) ORDER BY next_date ASC, created_at ASC`).bind(businessId, today).all<RecurringInvoiceRow>()
  let generatedCount = 0
  for (const recurring of results || []) {
    const frequency = normalizeRecurringFrequency(recurring.frequency)
    if (!frequency) continue
    const snapshot = safeJsonParse<Record<string, unknown>>(recurring.invoice_data, {})
    if (!Object.keys(snapshot).length) continue
    const invoiceDate = recurring.next_date
    const dueDays = Math.max(1, toFiniteNumber(snapshot.due_days, 30))
    const dueDate = addDays(invoiceDate, dueDays)
    const invoiceId = crypto.randomUUID()
    const invoiceNumber = await generateManagedInvoiceNumber(db, businessId)
    const totalAmount = toFiniteNumber(snapshot.total_amount, 0)
    await db.prepare(`INSERT INTO invoices (id, business_id, customer_id, customer_name, invoice_number, invoice_date, due_date, type, status, subtotal, taxable_amount, cgst, sgst, igst, total_amount, amount_paid, balance_due, notes, terms, template_id, is_inter_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(invoiceId, businessId, getOptionalString(snapshot.customer_id), getTrimmedString(snapshot.customer_name), invoiceNumber, invoiceDate, dueDate, 'Tax Invoice', recurring.auto_send ? 'sent' : 'draft', toFiniteNumber(snapshot.subtotal, 0), toFiniteNumber(snapshot.taxable_amount, 0), toFiniteNumber(snapshot.cgst, 0), toFiniteNumber(snapshot.sgst, 0), toFiniteNumber(snapshot.igst, 0), totalAmount, 0, totalAmount, getTrimmedString(snapshot.notes), getTrimmedString(snapshot.terms), getTrimmedString(snapshot.template_id) || 'modern', toBooleanInt(snapshot.is_inter_state)).run()
    await replaceInvoiceItems(db, invoiceId, snapshot.items)
    const nextDate = getNextRecurringDate(recurring.next_date, frequency)
    const shouldRemainActive = !recurring.end_date || nextDate <= recurring.end_date
    await db.prepare(`UPDATE recurring_invoices SET next_date = ?, active = ?, updated_at = datetime('now') WHERE id = ? AND business_id = ?`).bind(nextDate, shouldRemainActive ? 1 : 0, recurring.id, businessId).run()
    generatedCount += 1
  }
  return { generatedCount }
}

async function authMiddleware(c: AppContext, next: () => Promise<void>) {
  await ensureCoreSchema(c.env.DB)
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.slice(7)
  const userId = await verifyJWT(token, c.env.JWT_SECRET)
  if (!userId) return c.json({ error: 'Invalid or expired token' }, 401)
  c.set('userId', userId)
  const headerBizId = c.req.header('X-Business-Id')
  if (headerBizId) {
    const ownsBiz = await c.env.DB.prepare('SELECT id FROM businesses WHERE id = ? AND user_id = ?').bind(headerBizId, userId).first()
    if (ownsBiz) { c.set('businessId', headerBizId) }
    else {
      const teamAccess = await c.env.DB.prepare("SELECT role FROM team_members WHERE business_id = ? AND user_id = ? AND status = 'active'").bind(headerBizId, userId).first<TeamAccessRow>()
      if (teamAccess) { c.set('businessId', headerBizId); c.set('teamRole', teamAccess.role) }
      else return c.json({ error: 'No access to this business' }, 403)
    }
  } else {
    const biz = await c.env.DB.prepare('SELECT id FROM businesses WHERE user_id = ?').bind(userId).first()
    if (biz) c.set('businessId', biz.id as string)
  }
  await next()
}

// ── Health ───────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', message: 'BillKar API running' }))

// ══════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════

app.post('/api/auth/signup', async (c) => {
  try {
    await ensureCoreSchema(c.env.DB)
    const { email, password, full_name } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400)
    if (password.length < MIN_PASSWORD_LENGTH) return c.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400)
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first()
    if (existing) return c.json({ error: 'Email already registered' }, 409)
    const userId = crypto.randomUUID()
    const businessId = crypto.randomUUID()
    const hash = await hashPassword(password)
    await c.env.DB.prepare('INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)').bind(userId, email.toLowerCase().trim(), hash, full_name || '').run()
    await c.env.DB.prepare('INSERT INTO businesses (id, user_id, name) VALUES (?, ?, ?)').bind(businessId, userId, full_name ? `${full_name}'s Business` : 'My Business').run()
    const token = await createJWT(userId, c.env.JWT_SECRET)
    return c.json({ token, user: { id: userId, email: email.toLowerCase().trim(), full_name: full_name || '', plan: 'free', plan_expires_at: null }, business: { id: businessId, name: full_name ? `${full_name}'s Business` : 'My Business' } })
  } catch (err) { console.error('Signup failed', err); return c.json({ error: 'Internal Server Error' }, 500) }
})

app.post('/api/auth/login', async (c) => {
  await ensureCoreSchema(c.env.DB)
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400)
  const user = await c.env.DB.prepare('SELECT id, email, password_hash, full_name, phone, avatar_url, plan, plan_expires_at FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first<UserRow>()
  if (!user) return c.json({ error: 'Invalid email or password' }, 401)
  const passwordCheck = await verifyPassword(password, user.password_hash)
  if (!passwordCheck.valid) return c.json({ error: 'Invalid email or password' }, 401)
  if (passwordCheck.needsUpgrade) { const upgradedHash = await hashPassword(password); await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(upgradedHash, user.id).run() }
  if (user.plan && user.plan !== 'free' && user.plan_expires_at && new Date(user.plan_expires_at) < new Date()) { user.plan = 'free'; user.plan_expires_at = null; await c.env.DB.prepare('UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?').bind('free', user.id).run() }
  const business = await c.env.DB.prepare('SELECT * FROM businesses WHERE user_id = ?').bind(user.id).first()
  const token = await createJWT(user.id as string, c.env.JWT_SECRET)
  return c.json({ token, user, business })
})

app.post('/api/auth/forgot-password', async (c) => {
  await ensureCoreSchema(c.env.DB)
  const { email } = await c.req.json<{ email?: string }>()
  const normalizedEmail = email?.toLowerCase().trim()
  if (!normalizedEmail) return c.json({ error: 'Email is required' }, 400)
  const user = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(normalizedEmail).first<Pick<UserRow, 'id' | 'email'>>()
  if (user?.id) {
    try {
      const token = await createPasswordResetToken(c.env.DB, user.id, getResetTokenTtlMinutes(c.env))
      const frontendUrl = c.env.FRONTEND_URL || 'https://billkar.co.in'
      const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`
      await sendPasswordResetEmail(c, normalizedEmail, resetLink)
    } catch (err) { console.error('Failed to process password reset request:', err); return c.json({ error: 'Failed to send reset email. Please try again.' }, 500) }
  }
  return c.json({ success: true, message: 'If an account exists for this email, a reset link has been sent.' })
})

app.post('/api/auth/reset-password', async (c) => {
  await ensureCoreSchema(c.env.DB)
  const { token, password } = await c.req.json<{ token?: string; password?: string }>()
  if (!token || !password) return c.json({ error: 'Token and password are required' }, 400)
  if (password.length < MIN_PASSWORD_LENGTH) return c.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400)
  await ensurePasswordResetTable(c.env.DB)
  const tokenHash = await sha256Hex(token)
  const resetRow = await c.env.DB.prepare('SELECT id, user_id, token_hash, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? ORDER BY created_at DESC LIMIT 1').bind(tokenHash).first<PasswordResetRow>()
  if (!resetRow || resetRow.used_at) return c.json({ error: 'Invalid or expired reset link' }, 400)
  if (new Date(resetRow.expires_at) < new Date()) { await c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(resetRow.id).run(); return c.json({ error: 'Invalid or expired reset link' }, 400) }
  const nextHash = await hashPassword(password)
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(nextHash, resetRow.user_id).run()
  await c.env.DB.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").bind(resetRow.id).run()
  await c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? AND id != ?').bind(resetRow.user_id, resetRow.id).run()
  return c.json({ success: true })
})

app.get('/api/auth/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT id, email, full_name, phone, avatar_url, plan, plan_expires_at, created_at FROM users WHERE id = ?').bind(userId).first<UserRow>()
  const business = await c.env.DB.prepare('SELECT * FROM businesses WHERE user_id = ?').bind(userId).first()
  if (user && user.plan && user.plan !== 'free' && user.plan_expires_at) {
    if (new Date(user.plan_expires_at) < new Date()) { user.plan = 'free'; user.plan_expires_at = null; await c.env.DB.prepare('UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?').bind('free', userId).run() }
  }
  const { results: teamMemberships } = await c.env.DB.prepare(`SELECT tm.role, tm.business_id, b.name as business_name FROM team_members tm JOIN businesses b ON tm.business_id = b.id WHERE tm.user_id = ? AND tm.status = 'active'`).bind(userId).all()
  return c.json({ user, business, teamMemberships: teamMemberships || [] })
})

app.put('/api/auth/profile', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { full_name, phone, avatar_url } = await c.req.json()
  await c.env.DB.prepare('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), avatar_url = COALESCE(?, avatar_url) WHERE id = ?').bind(full_name ?? null, phone ?? null, avatar_url ?? null, userId).run()
  const user = await c.env.DB.prepare('SELECT id, email, full_name, phone, avatar_url FROM users WHERE id = ?').bind(userId).first()
  return c.json({ user })
})

app.post('/api/auth/change-password', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { current_password, new_password } = await c.req.json<{ current_password?: string; new_password?: string }>()
  if (!current_password || !new_password) return c.json({ error: 'Current and new password are required' }, 400)
  if (new_password.length < MIN_PASSWORD_LENGTH) return c.json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400)
  const user = await c.env.DB.prepare('SELECT id, password_hash FROM users WHERE id = ?').bind(userId).first<Pick<UserRow, 'id' | 'password_hash'>>()
  if (!user?.id) return c.json({ error: 'User not found' }, 404)
  const passwordCheck = await verifyPassword(current_password, user.password_hash)
  if (!passwordCheck.valid) return c.json({ error: 'Current password is incorrect' }, 400)
  const nextHash = await hashPassword(new_password)
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(nextHash, userId).run()
  await ensurePasswordResetTable(c.env.DB)
  await c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(userId).run()
  return c.json({ success: true })
})

app.get('/api/auth/google', (c) => {
  const params = new URLSearchParams({ client_id: c.env.GOOGLE_CLIENT_ID, redirect_uri: c.env.GOOGLE_REDIRECT_URI, response_type: 'code', scope: 'openid email profile', access_type: 'offline', prompt: 'consent' })
  const inviteId = getOptionalString(c.req.query('invite'))
  if (inviteId) params.set('state', inviteId)
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

app.get('/api/auth/google/callback', async (c) => {
  await ensureCoreSchema(c.env.DB)
  const code = c.req.query('code')
  const inviteId = getOptionalString(c.req.query('state'))
  if (!code) return c.json({ error: 'Missing authorization code' }, 400)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: c.env.GOOGLE_CLIENT_ID, client_secret: c.env.GOOGLE_CLIENT_SECRET, redirect_uri: c.env.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }).toString() })
  const tokenData = await tokenRes.json<GoogleTokenResponse>()
  if (!tokenData.access_token) return c.json({ error: 'Failed to get access token', details: tokenData }, 400)
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } })
  const googleUser = await userRes.json<GoogleUserProfile>()
  if (!googleUser.email) return c.json({ error: 'Failed to get user info from Google' }, 400)
  const email = googleUser.email.toLowerCase().trim()
  const fullName = googleUser.name || ''
  let user = await c.env.DB.prepare('SELECT id, email, full_name, phone, avatar_url, plan, plan_expires_at FROM users WHERE email = ?').bind(email).first<UserRow>()
  if (!user) {
    const userId = crypto.randomUUID()
    const businessId = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO users (id, email, password_hash, full_name, avatar_url) VALUES (?, ?, ?, ?, ?)').bind(userId, email, '', fullName, googleUser.picture || '').run()
    await c.env.DB.prepare('INSERT INTO businesses (id, user_id, name) VALUES (?, ?, ?)').bind(businessId, userId, fullName ? `${fullName}'s Business` : 'My Business').run()
    user = { id: userId, email, password_hash: '', full_name: fullName, phone: '', avatar_url: googleUser.picture || '', plan: 'free', plan_expires_at: null }
  } else {
    if (user.plan && user.plan !== 'free' && user.plan_expires_at && new Date(user.plan_expires_at) < new Date()) { user.plan = 'free'; user.plan_expires_at = null; await c.env.DB.prepare('UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?').bind('free', user.id).run() }
  }
  const token = await createJWT(user.id, c.env.JWT_SECRET)
  const userJson = encodeURIComponent(JSON.stringify(user))
  const inviteQuery = inviteId ? `&invite=${encodeURIComponent(inviteId)}` : ''
  const frontendUrl = c.env.FRONTEND_URL || 'https://billkar.pages.dev'
  return c.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${userJson}${inviteQuery}`)
})

// ══════════════════════════════════════════════════════
//  BUSINESS ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/business', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (businessId) {
    const business = await c.env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(businessId).first()
    if (!business) return c.json({ error: 'No business found' }, 404)
    return c.json({ business })
  }
  const userId = c.get('userId')
  const business = await c.env.DB.prepare('SELECT * FROM businesses WHERE user_id = ?').bind(userId).first()
  if (!business) return c.json({ error: 'No business found' }, 404)
  return c.json({ business })
})

app.put('/api/business', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const teamRole = c.get('teamRole')
  if (teamRole && teamRole !== 'owner' && teamRole !== 'admin') return c.json({ error: 'You do not have permission to edit business settings' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare(`UPDATE businesses SET name = COALESCE(?, name), gstin = COALESCE(?, gstin), pan = COALESCE(?, pan), email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address), city = COALESCE(?, city), state = COALESCE(?, state), pincode = COALESCE(?, pincode), logo_url = COALESCE(?, logo_url), signature_url = COALESCE(?, signature_url), bank_name = COALESCE(?, bank_name), account_number = COALESCE(?, account_number), ifsc = COALESCE(?, ifsc), upi_id = COALESCE(?, upi_id), invoice_prefix = COALESCE(?, invoice_prefix), next_invoice_number = COALESCE(?, next_invoice_number) WHERE id = ?`).bind(b.name ?? null, b.gstin ?? null, b.pan ?? null, b.email ?? null, b.phone ?? null, b.address ?? null, b.city ?? null, b.state ?? null, b.pincode ?? null, b.logo_url ?? null, b.signature_url ?? null, b.bank_name ?? null, b.account_number ?? null, b.ifsc ?? null, b.upi_id ?? null, b.invoice_prefix ?? null, b.next_invoice_number ?? null, businessId).run()
  const business = await c.env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(businessId).first()
  return c.json({ business })
})

// ══════════════════════════════════════════════════════
//  INVOICE ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/invoices', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ invoices: [] })
  const { results } = await c.env.DB.prepare(`SELECT i.*, c.email as customer_email, c.phone as customer_phone, c.gstin as customer_gstin, c.state as customer_state FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.business_id = ? ORDER BY i.created_at DESC`).bind(businessId).all()
  const invoices = (results || []) as Array<Record<string, unknown>>
  if (!invoices.length) return c.json({ invoices })
  const invoiceIds = invoices.map((invoice) => String(invoice.id))
  const placeholders = invoiceIds.map(() => '?').join(', ')
  const { results: paymentResults } = await c.env.DB.prepare(`SELECT * FROM payments WHERE invoice_id IN (${placeholders}) ORDER BY payment_date DESC, created_at DESC`).bind(...invoiceIds).all()
  const paymentsByInvoice = new Map<string, Array<Record<string, unknown>>>()
  for (const payment of (paymentResults || []) as Array<Record<string, unknown>>) {
    const invoiceId = String(payment.invoice_id || '')
    if (!paymentsByInvoice.has(invoiceId)) paymentsByInvoice.set(invoiceId, [])
    paymentsByInvoice.get(invoiceId)?.push(payment)
  }
  return c.json({ invoices: invoices.map((invoice) => ({ ...invoice, payments: paymentsByInvoice.get(String(invoice.id)) || [] })) })
})

app.post('/api/invoices', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot create invoices' }, 403)
  const inv = await c.req.json<Record<string, unknown>>()
  const invoiceId = crypto.randomUUID()
  const { customerId, customerName } = await upsertCustomerFromInvoiceInput(c.env.DB, businessId, inv)
  const subtotal = toFiniteNumber(inv.subtotal, 0)
  const taxableAmount = toFiniteNumber(inv.taxable_amount, subtotal)
  const cgst = toFiniteNumber(inv.cgst, 0)
  const sgst = toFiniteNumber(inv.sgst, 0)
  const igst = toFiniteNumber(inv.igst, 0)
  const totalAmount = toFiniteNumber(inv.total_amount, 0)
  const amountPaid = toFiniteNumber(inv.amount_paid, 0)
  const balanceDue = inv.balance_due !== undefined ? toFiniteNumber(inv.balance_due, Math.max(totalAmount - amountPaid, 0)) : Math.max(totalAmount - amountPaid, 0)
  await c.env.DB.prepare(`INSERT INTO invoices (id, business_id, customer_id, customer_name, invoice_number, invoice_date, due_date, type, status, subtotal, taxable_amount, cgst, sgst, igst, total_amount, amount_paid, balance_due, notes, terms, template_id, is_inter_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(invoiceId, businessId, customerId, customerName, getTrimmedString(inv.invoice_number), getOptionalString(inv.invoice_date), getOptionalString(inv.due_date), getTrimmedString(inv.type) || 'invoice', getTrimmedString(inv.status) || 'draft', subtotal, taxableAmount, cgst, sgst, igst, totalAmount, amountPaid, balanceDue, getTrimmedString(inv.notes), getTrimmedString(inv.terms), getTrimmedString(inv.template_id) || 'modern', toBooleanInt(inv.is_inter_state)).run()
  await replaceInvoiceItems(c.env.DB, invoiceId, inv.items)
  if (inv.recurring !== undefined) await upsertRecurringInvoice(c.env.DB, businessId, invoiceId, customerId, customerName, inv)
  const invoice = await fetchScopedInvoice(c.env.DB, invoiceId, businessId)
  return c.json({ invoice }, 201)
})

app.put('/api/invoices/:id', authMiddleware, async (c) => {
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot update invoices' }, 403)
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const id = getTrimmedString(c.req.param('id'))
  if (!id) return c.json({ error: 'Invoice not found' }, 404)
  const existingInvoice = await c.env.DB.prepare('SELECT id FROM invoices WHERE id = ? AND business_id = ?').bind(id, businessId).first<Pick<InvoiceRow, 'id'>>()
  if (!existingInvoice?.id) return c.json({ error: 'Invoice not found' }, 404)
  const updates = await c.req.json<Record<string, unknown>>()
  const { customerId, customerName } = await upsertCustomerFromInvoiceInput(c.env.DB, businessId, updates)
  const sets: string[] = []
  const vals: unknown[] = []
  const scalarFields: Array<[string, unknown, (value: unknown) => unknown]> = [
    ['invoice_number', updates.invoice_number, getTrimmedString], ['invoice_date', updates.invoice_date, getOptionalString], ['due_date', updates.due_date, getOptionalString], ['type', updates.type, (value) => getTrimmedString(value) || 'invoice'], ['status', updates.status, (value) => getTrimmedString(value) || 'draft'], ['subtotal', updates.subtotal, (value) => toFiniteNumber(value, 0)], ['taxable_amount', updates.taxable_amount, (value) => toFiniteNumber(value, 0)], ['cgst', updates.cgst, (value) => toFiniteNumber(value, 0)], ['sgst', updates.sgst, (value) => toFiniteNumber(value, 0)], ['igst', updates.igst, (value) => toFiniteNumber(value, 0)], ['total_amount', updates.total_amount, (value) => toFiniteNumber(value, 0)], ['amount_paid', updates.amount_paid, (value) => toFiniteNumber(value, 0)], ['balance_due', updates.balance_due, (value) => toFiniteNumber(value, 0)], ['notes', updates.notes, getTrimmedString], ['terms', updates.terms, getTrimmedString], ['template_id', updates.template_id, (value) => getTrimmedString(value) || 'modern'], ['is_inter_state', updates.is_inter_state, toBooleanInt],
  ]
  for (const [field, value, normalize] of scalarFields) { if (value !== undefined) { sets.push(`${field} = ?`); vals.push(normalize(value)) } }
  if (updates.customer_id !== undefined || updates.customer_name !== undefined || customerId) { sets.push('customer_id = ?'); vals.push(customerId); sets.push('customer_name = ?'); vals.push(customerName) }
  if (sets.length > 0) { vals.push(id, businessId); await c.env.DB.prepare(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ? AND business_id = ?`).bind(...vals).run() }
  if (updates.items !== undefined) await replaceInvoiceItems(c.env.DB, id, updates.items)
  if (updates.recurring !== undefined) await upsertRecurringInvoice(c.env.DB, businessId, id, customerId, customerName, updates)
  if (sets.length === 0 && updates.items === undefined && updates.recurring === undefined) return c.json({ error: 'No fields to update' }, 400)
  const invoice = await fetchScopedInvoice(c.env.DB, id, businessId)
  return c.json({ invoice })
})

app.get('/api/invoices/:id/items', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  const id = c.req.param('id')
  const invoice = await c.env.DB.prepare('SELECT id FROM invoices WHERE id = ? AND business_id = ?').bind(id, businessId).first()
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404)
  const { results } = await c.env.DB.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order').bind(id).all()
  return c.json({ items: results })
})

// ══════════════════════════════════════════════════════
//  INVOICE EMAIL + SHAREABLE LINK
// ══════════════════════════════════════════════════════

app.post('/api/invoices/:id/send-email', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  const id = c.req.param('id')
  try {
    const invoice = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').bind(id, businessId).first<any>()
    if (!invoice) return c.json({ error: 'Invoice not found' }, 404)
    const business = await c.env.DB.prepare('SELECT name, email FROM businesses WHERE id = ?').bind(businessId).first<any>()
    const body = await c.req.json().catch(() => ({}))
    const to_email = (body as any).to_email || invoice.customer_email
    const to_name = (body as any).to_name || invoice.customer_name
    if (!to_email) return c.json({ error: 'No email address for this customer. Add email in Bill To section.' }, 400)
    const fromEmail = c.env.MAIL_FROM_EMAIL || 'no-reply@billkar.co.in'
    const fromName = business?.name || c.env.MAIL_FROM_NAME || 'BillKar'
    const supportEmail = c.env.SUPPORT_EMAIL || 'support@billkar.co.in'
    const shareLink = `https://billkar.co.in/invoice/${id}`
    const amountFormatted = `INR ${Number(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    const htmlBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#4f46e5;padding:20px;border-radius:8px 8px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:24px">${fromName}</h1></div><div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb"><p style="margin:0 0 16px">Dear ${to_name || 'Customer'},</p><p>Please find your invoice <strong>${invoice.invoice_number}</strong> attached.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;background:#fff;border:1px solid #e5e7eb;font-weight:500">Invoice Number</td><td style="padding:8px;background:#fff;border:1px solid #e5e7eb">${invoice.invoice_number}</td></tr><tr><td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:500">Amount</td><td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb;color:#4f46e5;font-weight:bold">${amountFormatted}</td></tr><tr><td style="padding:8px;background:#fff;border:1px solid #e5e7eb;font-weight:500">Due Date</td><td style="padding:8px;background:#fff;border:1px solid #e5e7eb">${invoice.due_date || 'N/A'}</td></tr></table><div style="text-align:center;margin:24px 0"><a href="${shareLink}" style="background:#4f46e5;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:500;display:inline-block">View Invoice Online</a></div><p style="color:#6b7280;font-size:13px">If the button doesn't work, copy this link: ${shareLink}</p></div><div style="background:#f3f4f6;padding:16px;border-radius:0 0 8px 8px;text-align:center"><p style="color:#9ca3af;font-size:12px;margin:0">Powered by BillKar | <a href="https://billkar.co.in" style="color:#6b7280">billkar.co.in</a></p></div></div>`
    const textBody = `Invoice ${invoice.invoice_number} from ${fromName}\nAmount: ${amountFormatted}\nDue: ${invoice.due_date || 'N/A'}\nView online: ${shareLink}\n\nPowered by BillKar`
    await sendEmail(fromEmail, fromName, to_email, to_name || '', `Invoice ${invoice.invoice_number} from ${fromName}`, textBody, htmlBody, supportEmail)
    await c.env.DB.prepare("UPDATE invoices SET status = 'sent' WHERE id = ? AND status = 'draft'").bind(id).run()
    return c.json({ success: true, message: 'Email sent successfully' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    return c.json({ error: message }, 500)
  }
})

app.get('/api/invoices/:id/share', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  const id = c.req.param('id')
  const invoice = await c.env.DB.prepare('SELECT id, invoice_number, total_amount, due_date, customer_name FROM invoices WHERE id = ? AND business_id = ?').bind(id, businessId).first<any>()
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404)
  return c.json({ share_url: `https://billkar.co.in/invoice/${id}`, invoice_number: invoice.invoice_number, amount: invoice.total_amount, due_date: invoice.due_date, customer_name: invoice.customer_name })
})

app.get('/api/public/invoice/:id', async (c) => {
  const id = c.req.param('id')
  const invoice = await c.env.DB.prepare('SELECT i.*, b.name as business_name, b.gstin as business_gstin, b.address as business_address, b.phone as business_phone, b.email as business_email, b.bank_name, b.account_number, b.ifsc, b.upi_id FROM invoices i JOIN businesses b ON i.business_id = b.id WHERE i.id = ?').bind(id).first<any>()
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404)
  const { results: items } = await c.env.DB.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order').bind(id).all()
  return c.json({ invoice, items })
})

// ══════════════════════════════════════════════════════
//  RECURRING INVOICE ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/recurring-invoices', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ recurring_invoices: [], due_count: 0 })
  await ensureRecurringInvoicesTable(c.env.DB)
  const today = new Date().toISOString().slice(0, 10)
  const { results } = await c.env.DB.prepare('SELECT * FROM recurring_invoices WHERE business_id = ? ORDER BY created_at DESC').bind(businessId).all<RecurringInvoiceRow>()
  const recurringInvoices = (results || []).map((row) => ({ ...row, auto_send: Boolean(row.auto_send), active: Boolean(row.active), invoice_data: safeJsonParse<Record<string, unknown>>(row.invoice_data, {}) }))
  const dueCount = recurringInvoices.filter((row) => row.active && typeof row.next_date === 'string' && row.next_date <= today && (!row.end_date || row.next_date <= row.end_date)).length
  return c.json({ recurring_invoices: recurringInvoices, due_count: dueCount })
})

app.post('/api/recurring-invoices/generate-due', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot generate recurring invoices' }, 403)
  const result = await generateDueRecurringInvoices(c.env.DB, businessId)
  return c.json(result)
})

app.put('/api/recurring-invoices/:id', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot update recurring invoices' }, 403)
  await ensureRecurringInvoicesTable(c.env.DB)
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT * FROM recurring_invoices WHERE id = ? AND business_id = ?').bind(id, businessId).first<RecurringInvoiceRow>()
  if (!existing?.id) return c.json({ error: 'Recurring invoice not found' }, 404)
  const updates = await c.req.json<Record<string, unknown>>()
  const sets: string[] = []
  const values: unknown[] = []
  if (updates.active !== undefined) { sets.push('active = ?'); values.push(toBooleanInt(updates.active)) }
  const frequency = updates.frequency !== undefined ? normalizeRecurringFrequency(updates.frequency) : null
  if (updates.frequency !== undefined && !frequency) return c.json({ error: 'Invalid frequency' }, 400)
  if (frequency) { sets.push('frequency = ?'); values.push(frequency) }
  const endDate = updates.end_date !== undefined ? normalizeISODate(updates.end_date) : undefined
  if (updates.end_date !== undefined) { sets.push('end_date = ?'); values.push(endDate) }
  if (updates.auto_send !== undefined) { sets.push('auto_send = ?'); values.push(toBooleanInt(updates.auto_send)) }
  if (!sets.length) return c.json({ error: 'No fields to update' }, 400)
  values.push(id, businessId)
  await c.env.DB.prepare(`UPDATE recurring_invoices SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ? AND business_id = ?`).bind(...values).run()
  const recurringInvoice = await c.env.DB.prepare('SELECT * FROM recurring_invoices WHERE id = ? AND business_id = ?').bind(id, businessId).first<RecurringInvoiceRow>()
  return c.json({ recurring_invoice: recurringInvoice ? { ...recurringInvoice, auto_send: Boolean(recurringInvoice.auto_send), active: Boolean(recurringInvoice.active), invoice_data: safeJsonParse<Record<string, unknown>>(recurringInvoice.invoice_data, {}) } : null })
})

app.delete('/api/recurring-invoices/:id', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot delete recurring invoices' }, 403)
  await ensureRecurringInvoicesTable(c.env.DB)
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM recurring_invoices WHERE id = ? AND business_id = ?').bind(id, businessId).run()
  return c.json({ deleted: true })
})

// ══════════════════════════════════════════════════════
//  CUSTOMER ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/customers', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ customers: [] })
  const { results } = await c.env.DB.prepare('SELECT * FROM customers WHERE business_id = ? ORDER BY name').bind(businessId).all()
  return c.json({ customers: results })
})

app.post('/api/customers', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot create customers' }, 403)
  const cust = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO customers (id, business_id, name, gstin, phone, email, billing_address, shipping_address, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, businessId, cust.name ?? '', cust.gstin ?? '', cust.phone ?? '', cust.email ?? '', cust.billing_address ?? '', cust.shipping_address ?? '', cust.state ?? '').run()
  const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').bind(id, businessId).first()
  return c.json({ customer }, 201)
})

app.put('/api/customers/:id', authMiddleware, async (c) => {
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot update customers' }, 403)
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const id = c.req.param('id')
  const cust = await c.req.json()
  await c.env.DB.prepare(`UPDATE customers SET name = COALESCE(?, name), gstin = COALESCE(?, gstin), phone = COALESCE(?, phone), email = COALESCE(?, email), billing_address = COALESCE(?, billing_address), shipping_address = COALESCE(?, shipping_address), state = COALESCE(?, state) WHERE id = ? AND business_id = ?`).bind(cust.name ?? null, cust.gstin ?? null, cust.phone ?? null, cust.email ?? null, cust.billing_address ?? null, cust.shipping_address ?? null, cust.state ?? null, id, businessId).run()
  const updated = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').bind(id, businessId).first()
  return c.json({ customer: updated })
})

app.delete('/api/customers/:id', authMiddleware, async (c) => {
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot delete customers' }, 403)
  const businessId = c.get('businessId')
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM customers WHERE id = ? AND business_id = ?').bind(id, businessId).run()
  return c.json({ deleted: true })
})

// ══════════════════════════════════════════════════════
//  PRODUCT ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/products', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ products: [] })
  const { results } = await c.env.DB.prepare('SELECT * FROM products WHERE business_id = ? ORDER BY name').bind(businessId).all()
  return c.json({ products: results })
})

app.post('/api/products', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot create products' }, 403)
  const prod = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`INSERT INTO products (id, business_id, name, hsn_sac_code, type, unit, selling_price, purchase_price, gst_rate, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, businessId, prod.name ?? '', prod.hsn_sac_code ?? '', prod.type ?? 'goods', prod.unit ?? 'pcs', prod.selling_price ?? 0, prod.purchase_price ?? 0, prod.gst_rate ?? 18, prod.stock_quantity ?? 0, prod.low_stock_threshold ?? 10).run()
  const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').bind(id, businessId).first()
  return c.json({ product }, 201)
})

app.put('/api/products/:id', authMiddleware, async (c) => {
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot update products' }, 403)
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const id = c.req.param('id')
  const prod = await c.req.json()
  await c.env.DB.prepare(`UPDATE products SET name = COALESCE(?, name), hsn_sac_code = COALESCE(?, hsn_sac_code), type = COALESCE(?, type), unit = COALESCE(?, unit), selling_price = COALESCE(?, selling_price), purchase_price = COALESCE(?, purchase_price), gst_rate = COALESCE(?, gst_rate), stock_quantity = COALESCE(?, stock_quantity), low_stock_threshold = COALESCE(?, low_stock_threshold) WHERE id = ? AND business_id = ?`).bind(prod.name ?? null, prod.hsn_sac_code ?? null, prod.type ?? null, prod.unit ?? null, prod.selling_price ?? null, prod.purchase_price ?? null, prod.gst_rate ?? null, prod.stock_quantity ?? null, prod.low_stock_threshold ?? null, id, businessId).run()
  const updated = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').bind(id, businessId).first()
  return c.json({ product: updated })
})

app.delete('/api/products/:id', authMiddleware, async (c) => {
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot delete products' }, 403)
  const businessId = c.get('businessId')
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM products WHERE id = ? AND business_id = ?').bind(id, businessId).run()
  return c.json({ deleted: true })
})

// ══════════════════════════════════════════════════════
//  EXPENSE ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/expenses', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ expenses: [] })
  const { results } = await c.env.DB.prepare('SELECT * FROM expenses WHERE business_id = ? ORDER BY date DESC').bind(businessId).all()
  return c.json({ expenses: results })
})

app.post('/api/expenses', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot create expenses' }, 403)
  const exp = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`INSERT INTO expenses (id, business_id, category, description, amount, gst_amount, date, vendor_name, receipt_url, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, businessId, exp.category ?? '', exp.description ?? '', exp.amount ?? 0, exp.gst_amount ?? 0, exp.date ?? null, exp.vendor_name ?? '', exp.receipt_url ?? '', exp.payment_method ?? 'cash').run()
  const expense = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ? AND business_id = ?').bind(id, businessId).first()
  return c.json({ expense }, 201)
})

app.put('/api/expenses/:id', authMiddleware, async (c) => {
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot update expenses' }, 403)
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const id = c.req.param('id')
  const exp = await c.req.json()
  await c.env.DB.prepare(`UPDATE expenses SET category = COALESCE(?, category), description = COALESCE(?, description), amount = COALESCE(?, amount), gst_amount = COALESCE(?, gst_amount), date = COALESCE(?, date), vendor_name = COALESCE(?, vendor_name), receipt_url = COALESCE(?, receipt_url), payment_method = COALESCE(?, payment_method) WHERE id = ? AND business_id = ?`).bind(exp.category ?? null, exp.description ?? null, exp.amount ?? null, exp.gst_amount ?? null, exp.date ?? null, exp.vendor_name ?? null, exp.receipt_url ?? null, exp.payment_method ?? null, id, businessId).run()
  const expense = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ? AND business_id = ?').bind(id, businessId).first()
  return c.json({ expense })
})

app.delete('/api/expenses/:id', authMiddleware, async (c) => {
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot delete expenses' }, 403)
  const businessId = c.get('businessId')
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM expenses WHERE id = ? AND business_id = ?').bind(id, businessId).run()
  return c.json({ deleted: true })
})

// ══════════════════════════════════════════════════════
//  PAYMENT ROUTES
// ══════════════════════════════════════════════════════

app.post('/api/payments', authMiddleware, async (c) => {
  if (c.get('teamRole') === 'viewer') return c.json({ error: 'Viewers cannot record payments' }, 403)
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const pay = await c.req.json<Record<string, unknown>>()
  const invoiceId = getOptionalString(pay.invoice_id)
  const amount = toFiniteNumber(pay.amount, 0)
  if (!invoiceId) return c.json({ error: 'Invoice is required' }, 400)
  if (amount <= 0) return c.json({ error: 'Payment amount must be greater than zero' }, 400)
  const invoice = await c.env.DB.prepare('SELECT id FROM invoices WHERE id = ? AND business_id = ?').bind(invoiceId, businessId).first<Pick<InvoiceRow, 'id'>>()
  if (!invoice?.id) return c.json({ error: 'Invoice not found' }, 404)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`INSERT INTO payments (id, invoice_id, amount, payment_date, payment_method, reference_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, invoiceId, amount, getOptionalString(pay.payment_date), getTrimmedString(pay.payment_method) || 'cash', getTrimmedString(pay.reference_number), getTrimmedString(pay.notes)).run()
  const payment = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first<PaymentRow>()
  const updatedInvoice = await recalculateInvoicePaymentSummary(c.env.DB, invoiceId, businessId)
  return c.json({ payment, invoice: updatedInvoice }, 201)
})

// ══════════════════════════════════════════════════════
//  REPORT ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/reports/gst', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const month = c.req.query('month')
  if (!month) return c.json({ error: 'month query param required (e.g. 2026-03)' }, 400)
  const startDate = `${month}-01`
  const endDate = `${month}-31`
  const row = await c.env.DB.prepare(`SELECT COALESCE(SUM(taxable_amount), 0) as total_taxable, COALESCE(SUM(cgst), 0) as total_cgst, COALESCE(SUM(sgst), 0) as total_sgst, COALESCE(SUM(igst), 0) as total_igst, COALESCE(SUM(total_amount), 0) as total_amount, COUNT(*) as invoice_count FROM invoices WHERE business_id = ? AND invoice_date BETWEEN ? AND ? AND status != 'draft'`).bind(businessId, startDate, endDate).first()
  return c.json({ gst: row })
})

app.get('/api/reports/sales', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const invoices = await c.env.DB.prepare("SELECT * FROM invoices WHERE business_id = ? AND status NOT IN ('draft', 'cancelled') ORDER BY invoice_date DESC").bind(businessId).all()
  const expenses = await c.env.DB.prepare('SELECT * FROM expenses WHERE business_id = ? ORDER BY date DESC').bind(businessId).all()
  const invoiceRows = invoices.results as Array<{ total_amount?: number | null }>
  const expenseRows = expenses.results as Array<{ amount?: number | null }>
  const totalRevenue = invoiceRows.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
  const totalExpenses = expenseRows.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  return c.json({ invoices: invoices.results, expenses: expenses.results, summary: { total_revenue: totalRevenue, total_expenses: totalExpenses, net_profit: totalRevenue - totalExpenses, invoice_count: invoices.results.length, expense_count: expenses.results.length } })
})

// ══════════════════════════════════════════════════════
//  TEAM ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/team', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  if (!businessId) return c.json([])
  const { results } = await c.env.DB.prepare(`SELECT tm.*, u.full_name, u.avatar_url FROM team_members tm LEFT JOIN users u ON tm.user_id = u.id WHERE tm.business_id = ? ORDER BY tm.invited_at DESC`).bind(businessId).all()
  return c.json(results)
})

app.get('/api/team/invite/:id', async (c) => {
  await ensureCoreSchema(c.env.DB)
  const inviteId = c.req.param('id')
  const invite = await c.env.DB.prepare(`SELECT tm.email, tm.role, b.name as business_name FROM team_members tm JOIN businesses b ON tm.business_id = b.id WHERE tm.id = ? AND tm.status = 'pending'`).bind(inviteId).first()
  if (!invite) return c.json({ error: 'Invite not found or already used' }, 404)
  return c.json({ business_name: invite.business_name, email: invite.email, role: invite.role })
})

app.post('/api/team/accept/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const inviteId = c.req.param('id')
  const invite = await c.env.DB.prepare("SELECT * FROM team_members WHERE id = ? AND status = 'pending'").bind(inviteId).first<InviteRow>()
  if (!invite) return c.json({ error: 'Invite not found or already accepted' }, 404)
  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<Pick<UserRow, 'email'>>()
  if (user?.email !== invite.email) return c.json({ error: 'This invite is for a different email address' }, 400)
  await c.env.DB.prepare("UPDATE team_members SET status = 'active', user_id = ?, joined_at = datetime('now') WHERE id = ?").bind(userId, inviteId).run()
  return c.json({ success: true, business_id: invite.business_id })
})

app.post('/api/team/invite', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const businessId = c.get('businessId')
  if (!businessId) return c.json({ error: 'No business found' }, 404)
  const teamRole = c.get('teamRole')
  if (teamRole && teamRole !== 'owner' && teamRole !== 'admin') return c.json({ error: 'Only owners and admins can invite team members' }, 403)
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?').bind(userId).first<Pick<UserRow, 'plan'>>()
  const plan = user?.plan || 'free'
  if (plan === 'free' || !plan) return c.json({ error: 'Upgrade to Pro to invite team members' }, 400)
  const teamCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM team_members WHERE business_id = ?').bind(businessId).first<CountRow>()
  const currentCount = (teamCount?.count || 0) + 1
  const limit = plan === 'business' ? 10 : (plan === 'pro' || plan === 'trial') ? 3 : 1
  if (currentCount >= limit) return c.json({ error: `Team limit reached (${limit} members on your plan). Upgrade to add more.` }, 400)
  const { email, role } = await c.req.json()
  if (!email) return c.json({ error: 'Email required' }, 400)
  const normalizedRole = getAssignableTeamRole(role) || 'staff'
  const normalizedEmail = email.toLowerCase().trim()
  const selfUser = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<Pick<UserRow, 'email'>>()
  if (selfUser?.email === normalizedEmail) return c.json({ error: 'You cannot invite yourself' }, 400)
  const existing = await c.env.DB.prepare('SELECT id FROM team_members WHERE business_id = ? AND email = ?').bind(businessId, normalizedEmail).first()
  if (existing) return c.json({ error: 'This email has already been invited' }, 400)
  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first<Pick<UserRow, 'id'>>()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO team_members (id, business_id, invited_by, email, role, status, user_id) VALUES (?,?,?,?,?,?,?)').bind(id, businessId, userId, normalizedEmail, normalizedRole, 'pending', existingUser?.id || null).run()
  const frontendUrl = c.env.FRONTEND_URL || 'https://billkar.co.in'
  const inviteLink = `${frontendUrl}/invite/${id}`
  return c.json({ id, success: true, status: 'pending', inviteLink, message: 'Invite created. Share the invite link with them.' }, 201)
})

app.put('/api/team/:id', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  const id = c.req.param('id')
  const teamRole = c.get('teamRole')
  if (teamRole && teamRole !== 'owner' && teamRole !== 'admin') return c.json({ error: 'Only owners and admins can change roles' }, 403)
  const { role } = await c.req.json()
  const normalizedRole = getAssignableTeamRole(role)
  if (!normalizedRole) return c.json({ error: 'Invalid team role' }, 400)
  await c.env.DB.prepare('UPDATE team_members SET role = ? WHERE id = ? AND business_id = ?').bind(normalizedRole, id, businessId).run()
  return c.json({ success: true })
})

app.delete('/api/team/:id', authMiddleware, async (c) => {
  const businessId = c.get('businessId')
  const id = c.req.param('id')
  const teamRole = c.get('teamRole')
  if (teamRole && teamRole !== 'owner' && teamRole !== 'admin') return c.json({ error: 'Only owners and admins can remove members' }, 403)
  await c.env.DB.prepare('DELETE FROM team_members WHERE id = ? AND business_id = ?').bind(id, businessId).run()
  return c.json({ success: true })
})

// ══════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════

const ADMIN_EMAILS = ['dropshippers024@gmail.com']

async function adminGuard(c: AppContext): Promise<boolean> {
  await ensureCoreSchema(c.env.DB)
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const userId = await verifyJWT(authHeader.slice(7), c.env.JWT_SECRET)
  if (!userId) return false
  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<Pick<UserRow, 'email'>>()
  return !!user?.email && ADMIN_EMAILS.includes(user.email)
}

app.get('/api/admin/stats', async (c) => {
  if (!(await adminGuard(c))) return c.json({ error: 'Not admin' }, 403)
  try {
    const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first()
    const proUsers = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").first()
    const businessUsers = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'business'").first()
    const totalInvoices = await c.env.DB.prepare('SELECT COUNT(*) as count FROM invoices').first()
    const todaySignups = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now')").first()
    const thisWeekSignups = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', '-7 days')").first()
    return c.json({ totalUsers: totalUsers?.count || 0, proUsers: proUsers?.count || 0, businessUsers: businessUsers?.count || 0, freeUsers: (totalUsers?.count as number || 0) - (proUsers?.count as number || 0) - (businessUsers?.count as number || 0), totalInvoices: totalInvoices?.count || 0, todaySignups: todaySignups?.count || 0, thisWeekSignups: thisWeekSignups?.count || 0 })
  } catch (err) { return c.json({ error: err instanceof Error ? err.message : 'Failed to fetch stats' }, 500) }
})

app.get('/api/admin/users', async (c) => {
  if (!(await adminGuard(c))) return c.json({ error: 'Not admin' }, 403)
  try {
    const { results } = await c.env.DB.prepare(`SELECT u.id, u.email, u.full_name, u.phone, u.plan, u.plan_expires_at, u.created_at, b.name as business_name, b.gstin, (SELECT COUNT(*) FROM invoices WHERE business_id = b.id) as invoice_count FROM users u LEFT JOIN businesses b ON b.user_id = u.id ORDER BY u.created_at DESC`).all()
    return c.json(results)
  } catch (err) { return c.json({ error: err instanceof Error ? err.message : 'Failed to fetch users' }, 500) }
})

app.post('/api/admin/update-plan', async (c) => {
  if (!(await adminGuard(c))) return c.json({ error: 'Not admin' }, 403)
  try {
    const { user_id, plan, days } = await c.req.json()
    if (!user_id || !plan) return c.json({ error: 'user_id and plan are required' }, 400)
    if (plan === 'free') { await c.env.DB.prepare('UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?').bind('free', user_id).run() }
    else { const expiresAt = new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000).toISOString(); await c.env.DB.prepare('UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?').bind(plan, expiresAt, user_id).run() }
    const updated = await c.env.DB.prepare('SELECT id, email, full_name, plan, plan_expires_at FROM users WHERE id = ?').bind(user_id).first()
    return c.json({ success: true, user: updated })
  } catch (err) { return c.json({ error: err instanceof Error ? err.message : 'Failed to update plan' }, 500) }
})

app.delete('/api/admin/users/:id', async (c) => {
  if (!(await adminGuard(c))) return c.json({ error: 'Not admin' }, 403)
  try {
    const targetId = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?))').bind(targetId).run()
    await c.env.DB.prepare('DELETE FROM invoices WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)').bind(targetId).run()
    await c.env.DB.prepare('DELETE FROM customers WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)').bind(targetId).run()
    await c.env.DB.prepare('DELETE FROM products WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)').bind(targetId).run()
    await c.env.DB.prepare('DELETE FROM expenses WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)').bind(targetId).run()
    await c.env.DB.prepare('DELETE FROM team_members WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ?)').bind(targetId).run()
    await c.env.DB.prepare('DELETE FROM team_members WHERE user_id = ?').bind(targetId).run()
    await c.env.DB.prepare('DELETE FROM businesses WHERE user_id = ?').bind(targetId).run()
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run()
    return c.json({ success: true })
  } catch (err) { return c.json({ error: err instanceof Error ? err.message : 'Failed to delete user' }, 500) }
})

// ── File upload ────────────────────────────────────────
app.post('/api/upload', authMiddleware, async (c) => {
  return c.json({ error: 'File upload requires R2 storage configuration' }, 501)
})

export default app