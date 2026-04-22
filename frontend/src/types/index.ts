export enum CompanyType {
  SHIPOWNER = "shipowner",
  CHARTERER = "charterer",
  BROKER = "broker",
  OPERATOR = "operator",
}

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  BROKER = "broker",
  OPERATOR = "operator",
  VIEWER = "viewer",
}

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  domain: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  companyId: string;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}
