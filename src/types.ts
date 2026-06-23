export interface Channel {
  id: string;
  name: string;
  logoUrl: string;
  streamUrl: string;
  categoryId: string;
  isFeatured: boolean;
  views: number;
  status: 'online' | 'offline';
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string; // sports, movies, news, entertainment, etc.
  icon?: string; // lucide icon identifier
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  subscriptionStatus: 'active' | 'expired' | 'none';
  subscriptionExpiry: string; // ISO string
  planType: 'Basic' | 'Premium' | 'VIP' | 'Trial';
  avatarUrl?: string;
  isBlocked?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
}

export interface Analytics {
  totalChannels: number;
  totalCategories: number;
  activeUsers: number;
  activeViewersCount: number;
  revenueThisMonth: number;
  liveStatusCount: { online: number; offline: number };
  categoryDistribution: { name: string; count: number }[];
  visitorHistory: { date: string; viewers: number; streams: number }[];
}
