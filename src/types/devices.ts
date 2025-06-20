// admin/src/types/devices.ts
import { z } from 'zod';
import { Location } from './locations'; // Keep Location import if needed for joins

// Issue record for devices
export interface Issue {
  reported_by: string;
  description: string;
  date: string; // ISO date string
  evaluation: string; // Assessment or evaluation of the issue
}

// Zod schema for Issue
export const IssueSchema = z.object({
  reported_by: z.string().min(1, 'Bildirilen kişi/yer boş olamaz.'),
  description: z.string().min(1, 'Açıklama boş olamaz.'),
  date: z.string().refine(val => !!Date.parse(val), 'Geçerli bir tarih girilmelidir.'),
  evaluation: z.string().optional().default(''),
});

// --- Device Property Types ---
// Schema for a single key-value property for a device
export const DevicePropertySchema = z.object({
  key: z.string().min(1, 'Özellik adı zorunludur.'),
  value: z.string().min(1, 'Özellik değeri zorunludur.'),
});

// Type for a single device property
export type DeviceProperty = z.infer<typeof DevicePropertySchema>;

// Define the structure for a Device
export interface Device {
  id: string; // uuid
  name: string;
  type: string | null; // e.g., 'akilli_tahta', 'bilgisayar'
  serial_number: string | null;
  location_id: string | null; // Foreign key to locations table
  barcode_value: string | null; // Added barcode value field
  department: string | null; // Added department field to Device interface
  properties: DeviceProperty[] | null; // Use the new DeviceProperty type
  purchase_date: string | null; // ISO date string (YYYY-MM-DD from form)
  warranty_expiry_date: string | null; // ISO date string (YYYY-MM-DD from form)
  status: string | null; // e.g., 'aktif', 'arizali', 'bakimda'
  notes: string | null;
  issues?: Issue[] | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  location?: Location | null; // Optional relation data if joined
}

// Zod schema for creating/updating a device
export const DeviceSchema = z.object({
  name: z.string().min(3, 'Cihaz adı en az 3 karakter olmalıdır.'),
  type: z.string().min(1, 'Cihaz tipi seçilmelidir.').nullable(), // Type is required now in form
  serial_number: z.string().nullable().optional(),
  location_id: z.string().uuid('Geçerli bir konum seçilmelidir.'),
  department: z.string().min(1, 'Departman seçilmelidir.'),
  issues: z.array(IssueSchema).nullable().optional().default([]),
  properties: z.array(DevicePropertySchema).nullable().optional().default([]), // Use the new DevicePropertySchema
  purchase_date: z.string().nullable().optional(),
  warranty_expiry_date: z.string().nullable().optional(),
  status: z.string().min(1, 'Durum seçilmelidir.'),
  notes: z.string().nullable().optional(),
  // barcode_value is generated, not part of the form
});

// Type inferred from the schema for form validation
export type DeviceFormData = z.infer<typeof DeviceSchema>;

// Define allowed device types (can be moved to constants later)
export const deviceTypes = [
    { value: 'desktop', label: 'Masaüstü Bilgisayar' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'printer', label: 'Yazıcı' },
    { value: 'smartboard', label: 'Akıllı Tahta' },
    { value: 'other', label: 'Diğer' }
];

// Helper function to get device type label
export function getDeviceTypeLabel(value: string | null | undefined): string {
    if (!value) return 'Bilinmiyor';
    return deviceTypes.find(dt => dt.value === value)?.label || value;
}

// Define allowed device statuses
export const deviceStatuses = [
    { value: 'active', label: 'Aktif' },
    { value: 'faulty', label: 'Arızalı' },
    { value: 'maintenance', label: 'Bakımda' },
    { value: 'inactive', label: 'Pasif' },
    // Add other statuses as needed
];

// Helper function to get device status label
export function getDeviceStatusLabel(value: string | null | undefined): string {
    if (!value) return 'Bilinmiyor';
    return deviceStatuses.find(ds => ds.value === value)?.label || value;
} 