// Currency exchange rate utilities

interface ExchangeRateResponse {
  base: string;
  date: string;
  time_last_updated: number;
  rates: Record<string, number>;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

// Common currency symbols and info
const CURRENCY_INFO: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  MXN: { code: "MXN", symbol: "$", name: "Mexican Peso" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht" },
  VND: { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  KRW: { code: "KRW", symbol: "₩", name: "South Korean Won" },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira" },
};

// Map country names to their primary currency codes
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  "United States": "USD",
  "USA": "USD",
  "United Kingdom": "GBP",
  "UK": "GBP",
  "England": "GBP",
  "Scotland": "GBP",
  "Wales": "GBP",
  "Ireland": "EUR",
  "France": "EUR",
  "Germany": "EUR",
  "Italy": "EUR",
  "Spain": "EUR",
  "Portugal": "EUR",
  "Netherlands": "EUR",
  "Belgium": "EUR",
  "Austria": "EUR",
  "Greece": "EUR",
  "Japan": "JPY",
  "Australia": "AUD",
  "Canada": "CAD",
  "Switzerland": "CHF",
  "China": "CNY",
  "India": "INR",
  "Mexico": "MXN",
  "Brazil": "BRL",
  "South Africa": "ZAR",
  "Singapore": "SGD",
  "Hong Kong": "HKD",
  "New Zealand": "NZD",
  "Thailand": "THB",
  "Vietnam": "VND",
  "South Korea": "KRW",
  "UAE": "AED",
  "Turkey": "TRY",
};

// Cache for exchange rates (1 hour TTL)
let cachedRates: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get currency code for a country
 */
export function getCurrencyForCountry(country: string | null): string {
  if (!country) return "USD";

  // Try exact match first
  if (COUNTRY_TO_CURRENCY[country]) {
    return COUNTRY_TO_CURRENCY[country];
  }

  // Try partial match
  const countryLower = country.toLowerCase();
  for (const [key, currency] of Object.entries(COUNTRY_TO_CURRENCY)) {
    if (countryLower.includes(key.toLowerCase())) {
      return currency;
    }
  }

  return "USD"; // Default fallback
}

/**
 * Fetch latest exchange rates from USD base
 * Uses exchangerate-api.com free tier (1500 requests/month)
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  // Check cache first
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_TTL && cachedRates.rates) {
    return cachedRates.rates;
  }

  try {
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json() as ExchangeRateResponse;

    // Ensure rates exists and is valid
    if (!data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid exchange rate response structure');
    }

    cachedRates = {
      rates: data.rates,
      timestamp: Date.now(),
    };

    return data.rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error);

    // Return hardcoded fallback rates if API fails
    return {
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.50,
      AUD: 1.52,
      CAD: 1.36,
      CHF: 0.88,
      CNY: 7.24,
      INR: 83.12,
      MXN: 17.05,
      BRL: 4.98,
      ZAR: 18.76,
      SGD: 1.34,
      HKD: 7.83,
      NZD: 1.67,
      THB: 35.65,
      VND: 24485,
      KRW: 1340,
      AED: 3.67,
      TRY: 32.15,
    };
  }
}

/**
 * Convert USD amount to local currency
 */
export async function convertUSDToLocal(
  usdAmount: number,
  localCurrency: string
): Promise<number> {
  const rates = await getExchangeRates();
  if (!rates) {
    console.warn(`Exchange rates unavailable, using rate of 1 for ${localCurrency}`);
    return usdAmount;
  }
  const rate = rates[localCurrency] || 1;
  return usdAmount * rate;
}

/**
 * Convert local currency amount to USD
 */
export async function convertLocalToUSD(
  localAmount: number,
  localCurrency: string
): Promise<number> {
  const rates = await getExchangeRates();
  if (!rates) {
    console.warn(`Exchange rates unavailable, using rate of 1 for ${localCurrency}`);
    return localAmount;
  }
  const rate = rates[localCurrency] || 1;
  return localAmount / rate;
}

/**
 * Format price with local currency and USD equivalent
 * Example: "R150 (~$8)" or "€25 (~$27)"
 */
export async function formatPriceWithUSD(
  localAmount: number,
  localCurrency: string
): Promise<string> {
  const currencyInfo = CURRENCY_INFO[localCurrency] || { symbol: localCurrency, code: localCurrency };
  const usdAmount = await convertLocalToUSD(localAmount, localCurrency);

  // Format local amount
  const localFormatted = `${currencyInfo.symbol}${Math.round(localAmount)}`;

  // Format USD amount
  const usdFormatted = `$${Math.round(usdAmount)}`;

  // Skip USD conversion if already in USD
  if (localCurrency === "USD") {
    return localFormatted;
  }

  return `${localFormatted} (~${usdFormatted})`;
}

/**
 * Get currency info (symbol, name) for a currency code
 */
export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  return CURRENCY_INFO[currencyCode] || {
    code: currencyCode,
    symbol: currencyCode,
    name: currencyCode,
  };
}
