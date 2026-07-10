declare module "@payhere/payhere-mobilesdk-reactnative" {
  export type PayHerePaymentObject = {
    sandbox: boolean;
    merchant_id: string;
    notify_url: string;
    order_id: string;
    items: string;
    amount: string;
    currency: "LKR" | "USD";
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    delivery_address?: string;
    delivery_city?: string;
    delivery_country?: string;
    custom_1?: string;
    custom_2?: string;
    [key: string]: string | number | boolean | undefined;
  };

  export type PayHereModule = {
    startPayment(
      paymentObject: PayHerePaymentObject,
      onCompleted: (paymentId: string) => void,
      onError: (error: string) => void,
      onDismissed: () => void
    ): void;
  };

  const PayHere: PayHereModule;

  export default PayHere;
}
