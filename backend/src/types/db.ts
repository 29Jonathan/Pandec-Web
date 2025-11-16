export type UserRole = 'Admin' | 'Shipper' | 'Receiver' | 'ForwardingAgent';

export type OrderStatus = 'Pending' | 'Offered' | 'Accepted' | 'Shipped' | 'Delivered';

export type OfferStatus = 'Pending' | 'Accepted' | 'Rejected';

export type ShipmentStatus = 
  | 'InPlanning'
  | 'SpaceBooked'
  | 'SpaceCanceled'
  | 'Loaded'
  | 'ArrivedAtDeparturePort'
  | 'InTransit'
  | 'ArrivedAtDestinationPort'
  | 'PreparingForOnCarriage'
  | 'InCustomsClearanceAndDelivery'
  | 'Completed'
  | 'ContainerBeingReturned'
  | 'ReturnCompleted';

export type CargoUnit = 'Container' | 'Pallet' | 'Box' | 'Piece' | 'Roll' | 'Package';

export type DeliveryType = 'Air' | 'Sea' | 'Land';

export type Incoterm = 'EXW' | 'FOB' | 'CIF' | 'CFR' | 'DAP';

export type CurrencyType = 'EUR' | 'CNY' | 'USD' | 'GBP' | 'JPY';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  company_name: string;
  phone: string;
  address1: string;
  address2: string;
  country: string;
  vat_number: string;
  eori_number: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRelation {
  id: string;
  user_id: string;
  related_user_id: string;
  created_at: Date;
}

export interface Order {
  id: string;
  order_code: string;
  sender_id?: string;
  receiver_id?: string;
  from_port: string;
  to_port: string;
  goods_description?: string;
  delivery_type: DeliveryType;
  incoterm: Incoterm;
  cargo_unit: CargoUnit;
  cargo_quantity: number;
  load_date?: Date;
  status: OrderStatus;
  created_at: Date;
  updated_at: Date;
}

export interface OrderCargo {
  id: string;
  order_id: string;
  cargo_unit: CargoUnit;
  cargo_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface Offer {
  id: string;
  order_id?: string;
  carrier_company?: string;
  freight_cost?: number;
  port_surcharge?: number;
  trucking_fee?: number;
  custom_clearance?: number;
  currency: CurrencyType;
  status: OfferStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Shipment {
  id: string;
  order_id?: string;
  offer_id?: string;
  shipment_number?: string;
  tracking_link?: string;
  departure_date?: Date;
  arrival_date?: Date;
  status: ShipmentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Container {
  id: string;
  container_number: string;
  container_type?: string;
  tare_weight?: number;
  gross_weight?: number;
  created_at: Date;
  updated_at: Date;
}

export interface ShipmentContainer {
  id: string;
  shipment_id?: string;
  container_id?: string;
  created_at: Date;
}

export interface ContainerItem {
  id: string;
  container_id?: string;
  shipment_id?: string;
  description: string;
  quantity: number;
  unit: CargoUnit;
  cn_code?: string;
  eu_code?: string;
  created_at: Date;
  updated_at: Date;
}
