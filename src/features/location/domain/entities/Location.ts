export interface Location {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
}

export interface UserLocationData {
  coords: Location;
  timestamp: number;
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'SERVICES_DISABLED';
  message: string;
} 