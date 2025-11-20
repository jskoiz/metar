import { PaymentHeaders } from "@metar/shared-types";

declare global {
  namespace Express {
    interface Request {
      payment?: PaymentHeaders;
    }
  }
}

export {};
