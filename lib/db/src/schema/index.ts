import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  date,
} from "drizzle-orm/pg-core";

export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dob: text("dob").notNull(),
  gender: text("gender").notNull(),
  bloodType: text("blood_type").notNull(),
  allergies: jsonb("allergies").$type<string[]>().notNull().default([]),
  medicalNotes: text("medical_notes").notNull().default(""),
  emergencyOrganDonor: boolean("emergency_organ_donor").notNull().default(false),
  dnr: boolean("dnr").notNull().default(false),
  height: doublePrecision("height"),
  weight: doublePrecision("weight"),
});

export const vitals = pgTable("vitals", {
  id: serial("id").primaryKey(),
  vitalType: text("vital_type").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  value: doublePrecision("value").notNull(),
  valueSecondary: doublePrecision("value_secondary"),
  unit: text("unit").notNull(),
  status: text("status").notNull().default("normal"),
  deviceName: text("device_name"),
  notes: text("notes"),
});

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  bio: text("bio").notNull(),
  rating: doublePrecision("rating").notNull().default(4.5),
  ratingCount: integer("rating_count").notNull().default(0),
  experienceYears: integer("experience_years").notNull().default(0),
  languages: jsonb("languages").$type<string[]>().notNull().default([]),
  feeInPerson: integer("fee_in_person").notNull().default(0),
  feeTelemedicine: integer("fee_telemedicine").notNull().default(0),
  supportsTelemedicine: boolean("supports_telemedicine").notNull().default(true),
  clinicName: text("clinic_name").notNull(),
  city: text("city").notNull(),
  photoUrl: text("photo_url").notNull(),
  verified: boolean("verified").notNull().default(true),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  visitType: text("visit_type").notNull(),
  status: text("status").notNull().default("confirmed"),
  fee: integer("fee").notNull(),
  reason: text("reason").notNull(),
  symptoms: text("symptoms"),
  videoCallLink: text("video_call_link"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  indication: text("indication").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isOngoing: boolean("is_ongoing").notNull().default(true),
  refillRemaining: integer("refill_remaining").notNull().default(2),
  adherencePercent: integer("adherence_percent").notNull().default(95),
  timeOfDay: text("time_of_day"),
  notes: text("notes"),
});

export const conditions = pgTable("conditions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  severity: text("severity").notNull(),
  diagnosisDate: text("diagnosis_date").notNull(),
  notes: text("notes"),
  icdCode: text("icd_code"),
});

export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  strength: text("strength").notNull(),
  form: text("form").notNull(),
  manufacturer: text("manufacturer").notNull(),
  price: integer("price").notNull(),
  mrp: integer("mrp").notNull(),
  inStock: boolean("in_stock").notNull().default(true),
  requiresPrescription: boolean("requires_prescription").notNull().default(false),
  category: text("category").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
});

export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  distanceKm: doublePrecision("distance_km").notNull(),
  rating: doublePrecision("rating").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  etaMinutes: integer("eta_minutes").notNull(),
  isOpen: boolean("is_open").notNull().default(true),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  pharmacyId: integer("pharmacy_id").notNull(),
  status: text("status").notNull().default("preparing"),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  tax: integer("tax").notNull(),
  totalAmount: integer("total_amount").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  estimatedDeliveryAt: timestamp("estimated_delivery_at", { withTimezone: true }).notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  name: text("name").notNull(),
  strength: text("strength").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
});

export const triageSessions = pgTable("triage_sessions", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  triageLevel: text("triage_level").notNull(),
  primarySymptom: text("primary_symptom").notNull(),
  summary: text("summary").notNull(),
  result: jsonb("result").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emergencyContacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
});

export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  distanceKm: doublePrecision("distance_km").notNull(),
  phone: text("phone").notNull(),
  traumaLevel: text("trauma_level").notNull(),
  erOpen: boolean("er_open").notNull().default(true),
  etaMinutes: integer("eta_minutes").notNull(),
});

export const sosEvents = pgTable("sos_events", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("active"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  notes: text("notes"),
  contactsNotified: integer("contacts_notified").notNull().default(0),
});
