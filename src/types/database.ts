/**
 * Tipos de la base de datos de gruafy.
 *
 * Escrito a mano para reflejar `supabase/migrations`. Se usan `type` (no
 * `interface`) porque el cliente de Supabase exige que las filas sean asignables
 * a `Record<string, unknown>`, cosa que las interfaces no garantizan. En un
 * entorno con credenciales se puede regenerar con:
 *   supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type UserRole = 'client' | 'provider_owner' | 'provider_driver' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'deleted';
export type ProviderStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'expired';
export type OrderStateDb =
  | 'draft'
  | 'quoted'
  | 'searching_provider'
  | 'provider_reserved'
  | 'awaiting_payment'
  | 'payment_pending'
  | 'paid'
  | 'provider_en_route'
  | 'provider_arrived'
  | 'vehicle_loaded'
  | 'in_transit'
  | 'completion_pending'
  | 'completed'
  | 'no_provider'
  | 'payment_expired'
  | 'cancelled_by_client'
  | 'cancelled_by_provider'
  | 'cancelled_by_admin'
  | 'refund_pending'
  | 'refunded'
  | 'disputed';

/** Tipo canónico para columnas JSON/JSONB (igual al que genera `supabase gen types`). */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: AccountStatus;
};

export type ClientProfileRow = Timestamps & {
  id: string;
  dni: string | null;
  contact_phone: string | null;
  identity_verified: boolean;
};

export type VehicleRow = Timestamps & {
  id: string;
  client_id: string;
  brand: string;
  model: string;
  year: number | null;
  patente: string;
  gearbox: 'manual' | 'automatic' | 'unknown';
  gearbox_locked: boolean | null;
  has_keys: boolean | null;
  registration_doc_url: string | null;
  deleted_at: string | null;
};

export type ProviderAccountRow = Timestamps & {
  id: string;
  owner_id: string;
  legal_name: string;
  cuit: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: ProviderStatus;
  rejection_reason: string | null;
  is_available: boolean;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
  rating_avg: number;
  rating_count: number;
  deleted_at: string | null;
};

export type ProviderMemberRow = Timestamps & {
  id: string;
  provider_id: string;
  user_id: string | null;
  role: 'owner' | 'driver';
  full_name: string;
  dni: string | null;
  phone: string | null;
  status: AccountStatus;
};

export type TowTruckRow = Timestamps & {
  id: string;
  provider_id: string;
  patente: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  capacity: string | null;
  notes: string | null;
  status: AccountStatus;
};

export type ProviderDocumentRow = Timestamps & {
  id: string;
  provider_id: string;
  owner_kind: 'provider' | 'truck' | 'driver';
  truck_id: string | null;
  member_id: string | null;
  doc_type: string;
  doc_number: string | null;
  storage_path: string;
  expires_at: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
};

export type ServiceOrderRow = Timestamps & {
  id: string;
  client_id: string;
  vehicle_id: string | null;
  origin_address: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_address: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
  dollys: number;
  wheels_blocked: number;
  conditions: Json;
  distance_meters: number | null;
  duration_seconds: number | null;
  pricing: Json | null;
  amount_upfront: number | null;
  provider_id: string | null;
  driver_id: string | null;
  truck_id: string | null;
  state: OrderStateDb;
  offer_deadline: string | null;
  payment_deadline: string | null;
  searching_at: string | null;
  reserved_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  cancellation_reason: string | null;
};

export type ProviderOfferRow = {
  id: string;
  order_id: string;
  provider_id: string;
  rank: number;
  expires_at: string;
  status: OfferStatus;
  created_at: string;
};

export type PaymentRow = Timestamps & {
  id: string;
  order_id: string;
  type: 'gruafy_upfront';
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  external_reference: string;
  amount: number;
  status: PaymentStatus;
  live_mode: boolean;
  idempotency_key: string | null;
  normalized: Json | null;
};

export type RefundRow = Timestamps & {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processed' | 'failed';
  external_id: string | null;
};

export type TrackingLocationRow = {
  id: number;
  order_id: string;
  provider_id: string | null;
  driver_id: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  created_at: string;
};

export type ServiceExtraRow = Timestamps & {
  id: string;
  order_id: string;
  category: string;
  reason: string;
  amount: number;
  evidence_url: string | null;
  status: 'auto_approved' | 'needs_review' | 'approved' | 'rejected';
};

export type ReviewRow = {
  id: string;
  order_id: string;
  author_id: string;
  target_provider_id: string | null;
  target_client_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type SupportArticleRow = Timestamps & {
  id: string;
  target_role: string;
  category: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
};

export type PlatformSettingsRow = {
  id: number;
  version: number;
  values: Json;
  updated_by: string | null;
  updated_at: string;
};

export type OrderEventRow = {
  id: number;
  order_id: string;
  from_state: OrderStateDb | null;
  to_state: OrderStateDb | null;
  actor_role: UserRole | null;
  actor_id: string | null;
  event: string;
  meta: Json | null;
  created_at: string;
};

export type AdminAuditLogRow = {
  id: number;
  admin_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  before: Json | null;
  after: Json | null;
  created_at: string;
};

type Tbl<Row> = {
  Row: Row;
  Insert: Partial<Row> & { [key: string]: unknown };
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Tbl<ProfileRow>;
      client_profiles: Tbl<ClientProfileRow>;
      vehicles: Tbl<VehicleRow>;
      provider_accounts: Tbl<ProviderAccountRow>;
      provider_members: Tbl<ProviderMemberRow>;
      tow_trucks: Tbl<TowTruckRow>;
      provider_documents: Tbl<ProviderDocumentRow>;
      service_orders: Tbl<ServiceOrderRow>;
      provider_offers: Tbl<ProviderOfferRow>;
      payments: Tbl<PaymentRow>;
      refunds: Tbl<RefundRow>;
      tracking_locations: Tbl<TrackingLocationRow>;
      service_extras: Tbl<ServiceExtraRow>;
      reviews: Tbl<ReviewRow>;
      notifications: Tbl<NotificationRow>;
      support_articles: Tbl<SupportArticleRow>;
      platform_settings: Tbl<PlatformSettingsRow>;
      order_events: Tbl<OrderEventRow>;
      admin_audit_logs: Tbl<AdminAuditLogRow>;
    };
    Views: Record<string, never>;
    Functions: {
      accept_offer: {
        Args: { p_order_id: string; p_provider_id: string; p_pay_seconds?: number };
        Returns: boolean;
      };
      is_admin: { Args: { uid?: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      order_state: OrderStateDb;
    };
    CompositeTypes: Record<string, never>;
  };
};
