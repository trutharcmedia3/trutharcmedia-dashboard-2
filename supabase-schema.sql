-- Supabase Schema for Agency Vault

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'member'
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'Active',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  clientId TEXT REFERENCES clients(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Planning',
  priority TEXT DEFAULT 'Medium',
  budget NUMERIC DEFAULT 0,
  startDate TEXT,
  endDate TEXT,
  progress NUMERIC DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT REFERENCES projects(id),
  assignedToId TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'To Do',
  priority TEXT DEFAULT 'Medium',
  dueDate TEXT,
  estimatedHours NUMERIC DEFAULT 0,
  actualHours NUMERIC DEFAULT 0,
  progress NUMERIC DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  projectId TEXT REFERENCES projects(id),
  clientId TEXT REFERENCES clients(id),
  invoiceNumber TEXT,
  invoiceDate TEXT,
  dueDate TEXT,
  totalAmount NUMERIC DEFAULT 0,
  amountPaid NUMERIC DEFAULT 0,
  paymentMethod TEXT,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenditures Table
CREATE TABLE IF NOT EXISTS expenditures (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  paymentMethod TEXT,
  status TEXT DEFAULT 'Paid',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  projectId TEXT REFERENCES projects(id),
  taskId TEXT REFERENCES tasks(id),
  userId TEXT REFERENCES users(id),
  text TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  userId TEXT,
  action TEXT NOT NULL,
  entityType TEXT,
  entityId TEXT,
  details TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Day Plans Table
CREATE TABLE IF NOT EXISTS day_plans (
  id TEXT PRIMARY KEY,
  userId TEXT,
  date TEXT NOT NULL,
  tasks JSONB DEFAULT '[]',
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'Active',
  utilization NUMERIC DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
