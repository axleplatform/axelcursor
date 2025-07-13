// Test if Places API (New) is enabled
export async function testPlacesAPINew(): Promise<boolean> {
  try {
    // Get API key from the same source as other functions
    const configResponse = await fetch('/api/maps-config');
    const configData = await configResponse.json();
    const apiKey = configData.apiKey || '';
    
    if (!apiKey) {
      console.error('❌ No API key available');
      return false;
    }
    
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: "test",
      })
    });
    
    console.log('🔍 Places API (New) test response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Places API (New) is available');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Places API (New) test failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Places API (New) not available:', error);
    return false;
  }
}

// Test function that can be called from browser console
export function testPlacesAPIFromBrowser() {
  testPlacesAPINew().then(available => {
    console.log('Places API (New) available:', available);
  });
}
