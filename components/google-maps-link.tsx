interface GoogleMapsLinkProps {
  address: string;
  variant?: 'light' | 'dark';
  showIcon?: boolean;
}

export function GoogleMapsLink({ address, variant = 'light', showIcon = true }: GoogleMapsLinkProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  
  const textColorClass = variant === 'dark' 
    ? 'text-white hover:text-gray-200' 
    : 'text-gray-700 hover:text-gray-900';
  
  const hoverBgClass = variant === 'dark'
    ? 'hover:bg-white/20'
    : 'hover:bg-gray-100';
  
  const defaultBgClass = variant === 'dark'
    ? 'bg-white/10'
    : 'bg-gray-50';
  
  const defaultBorderClass = variant === 'dark'
    ? 'border-white/20'
    : 'border-gray-200';
  
  return (
    <a 
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${textColorClass} ${defaultBgClass} ${defaultBorderClass} ${hoverBgClass} flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md transition-all duration-200 hover:shadow-sm group border ${hoverBgClass} hover:border-gray-300`}
      title="Click to open in Google Maps"
    >
      {showIcon && (
        <span className="text-base transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12 opacity-80 group-hover:opacity-100">📍</span>
      )}
      <span className="group-hover:underline group-hover:font-medium">{address}</span>
    </a>
  );
} 