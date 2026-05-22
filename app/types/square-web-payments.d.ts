/** Minimal types for Square Web Payments SDK (loaded via script tag). */
declare namespace SquareWebPayments {
  interface TokenResult {
    status: "OK" | "INVALID" | "ERROR";
    token?: string;
    errors?: Array<{ message: string }>;
  }

  interface Card {
    attach(selector: string): Promise<void>;
    destroy(): Promise<void>;
    tokenize(): Promise<TokenResult>;
  }

  interface Payments {
    card(): Promise<Card>;
  }
}

interface Window {
  Square?: {
    payments(applicationId: string, locationId: string): SquareWebPayments.Payments;
  };
}
