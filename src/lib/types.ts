export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate }
      locations: { Row: Location; Insert: LocationInsert; Update: LocationUpdate }
      hives: { Row: Hive; Insert: HiveInsert; Update: HiveUpdate }
      harvests: { Row: Harvest; Insert: HarvestInsert; Update: HarvestUpdate }
      inspections: { Row: Inspection; Insert: InspectionInsert; Update: InspectionUpdate }
      inspection_photos: { Row: InspectionPhoto; Insert: InspectionPhotoInsert; Update: InspectionPhotoUpdate }
      notifications: { Row: Notification; Insert: NotificationInsert; Update: NotificationUpdate }
    }
  }
}

export type Profile = {
  id: string; display_name: string; avatar_url: string | null; created_at: string
}
export type ProfileInsert = Omit<Profile, 'created_at'>
export type ProfileUpdate = Partial<ProfileInsert>

export type Location = {
  id: string; user_id: string; name: string; description: string | null; created_at: string
}
export type LocationInsert = Pick<Location, 'name'> & { description?: string | null }
export type LocationUpdate = Partial<LocationInsert>

export type HiveStatus = 'active' | 'dead' | 'sold'
export type Hive = {
  id: string; location_id: string; user_id: string; name: string
  is_public: boolean; status: HiveStatus; species: string | null
  installed_at: string | null; created_at: string
}
export type HiveInsert = Pick<Hive, 'location_id' | 'name'> & {
  is_public?: boolean; status?: HiveStatus; species?: string | null; installed_at?: string | null
}
export type HiveUpdate = Partial<Omit<HiveInsert, 'location_id'>>

export type Harvest = {
  id: string; hive_id: string; user_id: string
  harvested_at: string; weight_kg: number; notes: string | null; created_at: string
}
export type HarvestInsert = Pick<Harvest, 'hive_id' | 'weight_kg'> & {
  harvested_at?: string; notes?: string | null
}
export type HarvestUpdate = Partial<Omit<HarvestInsert, 'hive_id'>>

export type BroodPattern = 'good' | 'fair' | 'poor'
export type Population = 'strong' | 'medium' | 'weak'
export type Temperament = 'calm' | 'moderate' | 'aggressive'
export type HoneyStores = 'full' | 'partial' | 'low'

export type Inspection = {
  id: string; hive_id: string; user_id: string; inspected_at: string
  queen_seen: boolean | null; brood_pattern: BroodPattern | null
  population: Population | null; temperament: Temperament | null
  honey_stores: HoneyStores | null; notes: string | null
  next_action: string | null; created_at: string
}
export type InspectionInsert = Pick<Inspection, 'hive_id'> & {
  inspected_at?: string; queen_seen?: boolean | null
  brood_pattern?: BroodPattern | null; population?: Population | null
  temperament?: Temperament | null; honey_stores?: HoneyStores | null
  notes?: string | null; next_action?: string | null
}
export type InspectionUpdate = Partial<Omit<InspectionInsert, 'hive_id'>>

export type InspectionPhoto = {
  id: string; inspection_id: string; user_id: string; storage_path: string; created_at: string
}
export type InspectionWithPhotos = Inspection & { inspection_photos?: InspectionPhoto[] }
export type InspectionPhotoInsert = Pick<InspectionPhoto, 'inspection_id' | 'user_id' | 'storage_path'>
export type InspectionPhotoUpdate = Partial<Pick<InspectionPhoto, 'storage_path'>>

export type Notification = {
  id: string; user_id: string; hive_id: string | null
  type: string; message: string; read: boolean; created_at: string
}
export type NotificationInsert = Pick<Notification, 'user_id' | 'type' | 'message'> & {
  hive_id?: string | null
}
export type NotificationUpdate = { read: boolean }
