export type ArticleStatus = 'draft' | 'ready' | 'scheduled' | 'published' | 'sold';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all-seasons' | 'undefined';

export type Condition = 'new_with_tag' | 'new_without_tag' | 'new_with_tags' | 'new_without_tags' | 'very_good' | 'good' | 'satisfactory';

export interface Article {
  id: string;
  title: string;
  description: string;
  brand: string;
  size: string;
  condition: Condition;
  main_category: string;
  subcategory: string;
  item_category: string;
  price: number;
  purchase_price?: number;
  photos: string[];
  season: Season;
  suggested_period: string;
  status: ArticleStatus;
  color?: string;
  material?: string;
  scheduled_for?: string;
  published_at?: string;
  sold_at?: string;
  sold_price?: number;
  sale_price?: number;
  created_at: string;
  updated_at: string;
}

export interface VintedSettings {
  email: string;
  password: string;
  max_posts_per_day: number;
  min_delay_minutes: number;
}
