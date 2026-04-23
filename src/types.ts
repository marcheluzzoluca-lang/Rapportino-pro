import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Machine {
  id?: number;
  client_id?: number;
  brand: string;
  type: string;
  serial_number: string;
  year: string;
}

export interface Client {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  km: number;
  machines?: Machine[];
}

export interface Technician {
  id: number;
  uuid?: string;
  name: string;
  specialization: string;
  phone: string;
  email: string;
  notes: string;
  code?: string;
}

export interface Article {
  id: number;
  uuid?: string;
  code: string;
  description: string;
  price?: number;
  stock?: number;
}

export interface ReportItem {
  id?: number;
  report_id?: number;
  article_id: number;
  quantity: number;
  code?: string;
  description?: string;
}

export interface ReportDay {
  id?: number;
  report_id?: number;
  date: string;
  travel_hours: number;
  work_hours: number;
  meals: number;
  overnight: boolean;
}

export interface Company {
  id: number;
  uuid?: string;
  name: string;
  address: string;
  phone: string;
  vat: string;
  email: string;
  logo: string;
}

export interface Report {
  id: number;
  client_id: number;
  technician_id: number;
  machine_id?: number;
  company_id?: number;
  description: string;
  signature_client: string;
  signature_tech: string;
  client_km: number;
  extra_km: number;
  client_name?: string;
  client_address?: string;
  client_email?: string;
  technician_name?: string;
  machine_brand?: string;
  machine_type?: string;
  machine_serial?: string;
  machine_year?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_vat?: string;
  company_email?: string;
  company_logo?: string;
  date?: string; // Summary date (min date of days)
  days?: ReportDay[];
  items?: ReportItem[];
}

export interface Appointment {
  id: number;
  date: string;
  time: string;
  description: string;
  alert: boolean;
}

export interface DashboardData {
  reportsCount: number;
  clientsCount: number;
  techniciansCount: number;
  articlesCount: number;
}

export interface TechnicianLocation {
  id: number;
  technician_id: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface TechnicianEvent {
  id: number;
  technician_id: number;
  date: string;
  type: 'ferie' | 'trasferta' | 'officina' | 'malattia' | 'appuntamento';
  description: string;
}
