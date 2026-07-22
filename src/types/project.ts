export interface Project {
  id: string;
  name: string;
  client: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  manager: string;
  value: string;
  address?: string;
  opportunityId?: string;
  clientId?: string | null;
  clientGroupId?: string | null;
}

export interface DeviceCategory {
  id: string;
  name: string;
  icon: string | null;
}

export interface Device {
  id: string;
  category_id: string | null;
  name: string;
  model: string | null;
  brand: string | null;
  description: string | null;
  unit_price: number;
  installation_price: number;
  icon: string | null;
  specifications: Record<string, unknown> | null;
  image_url: string | null;
}

export interface FloorPlan {
  id: string;
  project_id: string;
  name: string;
  file_url: string;
  file_type: string;
  width: number | null;
  height: number | null;
}

export interface PlacedDevice {
  id: string;
  floor_plan_id: string;
  device_id: string;
  x_position: number;
  y_position: number;
  rotation: number;
  notes: string | null;
  scale: number;
  device?: Device;
}

export interface Proposal {
  id: string;
  project_id: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  introduction: string | null;
  scope: string | null;
  validity_days: number;
  payment_terms: string | null;
  warranty_terms: string | null;
  notes: string | null;
  discount_percentage: number;
  total_devices: number;
  total_installation: number;
  total_discount: number;
  grand_total: number;
  status: string;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  device_id: string | null;
  service_id: string | null;
  device_name: string;
  quantity: number;
  unit_price: number;
  installation_price: number;
  subtotal: number;
  featured_in_gallery: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
}

export interface PresentationPage {
  id: string;
  title: string;
  image_url: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
