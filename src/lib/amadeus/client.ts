import Amadeus from "amadeus";

// Initialize Amadeus client
// Sign up at https://developers.amadeus.com for API credentials
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY || "",
  clientSecret: process.env.AMADEUS_API_SECRET || "",
});

export default amadeus;

// Check if Amadeus is configured
export function isAmadeusConfigured(): boolean {
  return !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
}
