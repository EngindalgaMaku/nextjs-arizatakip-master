import supabase from './supabase-browser';

export interface SiteSettings {
  site_name: string;
  site_description?: string;
  site_logo?: string;
  primary_color?: string;
  accent_color?: string;
  contact_email?: string;
  contact_phone?: string;
  allow_registration?: boolean;
  maintenance_mode?: boolean;
  version?: string;
  [key: string]: any;
}

/**
 * Get all site settings
 * @returns Object with all site settings
 */
export async function getSiteSettings(): Promise<Partial<SiteSettings>> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');
    
    if (error) {
      console.error('Error fetching site settings:', error);
      return {};
    }
    
    if (!data || data.length === 0) {
      return {};
    }
    
    // Convert array of key-value pairs to a single object
    return data.reduce((acc: Record<string, any>, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error in getSiteSettings:', error);
    return {};
  }
}

/**
 * Get a specific site setting value
 * @param key The setting key to retrieve
 * @param defaultValue Optional default value if the setting doesn't exist
 * @returns The setting value or default
 */
export async function getSiteSetting(key: string, defaultValue: any = null): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error || !data) {
      return defaultValue;
    }
    
    return data.value;
  } catch (error) {
    console.error(`Error fetching site setting "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Update a site setting
 * @param key Setting key
 * @param value New value
 * @returns Success status
 */
export async function updateSiteSetting(key: string, value: any): Promise<boolean> {
  try {
    // Check if setting exists
    const { data: existingData } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single();
    
    if (existingData) {
      // Update existing setting
      const { error } = await supabase
        .from('system_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
      
      return !error;
    } else {
      // Create new setting
      const { error } = await supabase
        .from('system_settings')
        .insert({
          key,
          value,
          created_at: new Date().toISOString()
        });
      
      return !error;
    }
  } catch (error) {
    console.error(`Error updating site setting "${key}":`, error);
    return false;
  }
} 