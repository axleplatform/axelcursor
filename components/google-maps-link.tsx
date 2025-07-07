interface GoogleMapsLinkProps {
  address: string;
  latitude?: number;
  longitude?: number;
  variant?: 'light' | 'dark';
  className?: string;
}

export function GoogleMapsLink({ 
  address, 
  latitude, 
  longitude,
  variant = 'light',
  className = ''
}: GoogleMapsLinkProps) {
  // Only use coordinates if BOTH are provided
  const mapsUrl = (latitude !== undefined && longitude !== undefined)
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  
  return (
    <a 
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      📍 {address}
    </a>
  );
} 