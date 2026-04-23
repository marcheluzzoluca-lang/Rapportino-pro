
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateTotalDistance(locations: { latitude: number; longitude: number }[]): number {
  let total = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    total += calculateDistance(
      locations[i].latitude,
      locations[i].longitude,
      locations[i+1].latitude,
      locations[i+1].longitude
    );
  }
  return total;
}

export async function downloadFile(url: string, filename: string) {
  try {
    // Try fetch first to handle errors and potentially bypass some iframe restrictions
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback: direct navigation
    try {
      window.location.href = url;
    } catch (e) {
      try {
        window.open(url, '_blank');
      } catch (e2) {
        throw new Error('Download failed and fallback failed.');
      }
    }
  }
}
