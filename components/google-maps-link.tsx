interface GoogleMapsLinkProps {
  address: string;
  latitude?: number;
  longitude?: number;
  variant?: 'light' | 'dark';
}

export function GoogleMapsLink({ address, latitude, longitude, variant = 'light' }: GoogleMapsLinkProps) {
  const mapsUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  
  const textColorClass = variant === 'dark' 
    ? 'text-white hover:text-gray-200' 
    : 'text-gray-700 hover:text-gray-900';
  
  const hoverBgClass = variant === 'dark'
    ? 'hover:bg-white/10'
    : 'hover:bg-gray-100';
  
  return (
    <a 
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${textColorClass} ${hoverBgClass} flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md transition-all duration-200 hover:shadow-sm group`}
      title="Click to open in Google Maps"
    >
      <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2C6.69 2 4 4.69 4 8c0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span className="group-hover:underline">{address}</span>
    </a>
  );
} 