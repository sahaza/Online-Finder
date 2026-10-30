export interface Business {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  mapsUrl?: string;
  status?: 'checking' | 'no-website' | 'unreachable' | 'reachable' | 'offline';
  checkError?: string;
  hasSocialMedia?: boolean;
  socialMediaPlatforms?: string[];
  isUnclaimed?: boolean;
}

export interface RecentSearch {
  query: string;
  location: string;
  radius: string;
  results: Business[];
  timestamp: number;
}

export interface SearchState {
  query: string;
  location: string;
  radius: string;
  isSearching: boolean;
  results: Business[];
  error: string | null;
  recentSearches: RecentSearch[];
}
