declare module "amadeus" {
  export interface AmadeusOptions {
    clientId: string;
    clientSecret: string;
    hostname?: string;
    log?: boolean;
  }

  export interface AmadeusResponse<T> {
    data: T;
    result: {
      status: number;
      statusText: string;
    };
  }

  export interface ActivitySearchParams {
    latitude: number;
    longitude: number;
    radius?: number;
  }

  export interface AmadeusActivityData {
    id: string;
    type: string;
    self: {
      href: string;
      methods: string[];
    };
    name: string;
    shortDescription: string;
    description?: string;
    geoCode: {
      latitude: number;
      longitude: number;
    };
    rating?: string;
    reviewCount?: number;
    price: {
      currencyCode: string;
      amount: string;
    };
    pictures?: string[];
    bookingLink: string;
    minimumDuration?: string;
    duration?: string;
    categories?: string[];
  }

  export interface ShoppingActivities {
    get(params: ActivitySearchParams): Promise<AmadeusResponse<AmadeusActivityData[]>>;
  }

  export interface Shopping {
    activities: ShoppingActivities;
  }

  class Amadeus {
    constructor(options: AmadeusOptions);
    shopping: Shopping;
  }

  export default Amadeus;
}
