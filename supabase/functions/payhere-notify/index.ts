import { createClient } from "npm:@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js@4.2.0";

const requireEnvironmentVariable = (name: string): string => {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const md5Upper = (value: string): string =>
  CryptoJS.MD5(value).toString().toUpperCase();

const constantTimeEquals = (
  left: string,
  right: string
): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    difference |=
      left.charCodeAt(index) ^
      right.charCodeAt(index);
  }

  return difference === 0;
};

const textResponse = (
  message: string,
  status = 200
): Response =>
  new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

Deno.serve(async (request: Request): Promise<Response> => {
  try {
    /*
     * PayHere opens return_url or cancel_url using a browser/WebView.
     * Supabase Edge Functions do not render HTML responses for GET requests,
     * so we intentionally return a clean plain-text message here.
     */
    if (request.method === "GET") {
      const requestUrl = new URL(request.url);

      const result = requestUrl.searchParams.get("result");

      if (result === "cancel") {
        return textResponse(
          "Payment Cancelled\n\nReturn to FixMate to try again or choose another payment method."
        );
      }

      return textResponse(
        "Payment Submitted\n\nReturn to FixMate while the payment result is securely verified."
      );
    }

    /*
     * PayHere sends the authoritative payment notification as
     * application/x-www-form-urlencoded using POST.
     */
    if (request.method !== "POST") {
      return textResponse("Method not allowed.", 405);
    }

    const supabaseUrl = requireEnvironmentVariable(
      "SUPABASE_URL"
    );

    const supabaseServiceRoleKey = requireEnvironmentVariable(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    const expectedMerchantId = requireEnvironmentVariable(
      "PAYHERE_MERCHANT_ID"
    );

    const payHereMerchantSecret = requireEnvironmentVariable(
      "PAYHERE_MERCHANT_SECRET"
    );

    const formData = await request.formData();

    const getFormValue = (name: string): string =>
      String(formData.get(name) || "").trim();

    const merchantId = getFormValue("merchant_id");
    const orderId = getFormValue("order_id");
    const paymentId = getFormValue("payment_id");
    const payHereAmount = getFormValue("payhere_amount");
    const payHereCurrency = getFormValue("payhere_currency");
    const statusCode = getFormValue("status_code");
    const receivedSignature = getFormValue("md5sig").toUpperCase();
    const statusMessage = getFormValue("status_message");
    const paymentMethod = getFormValue("method");
    const customBookingId = getFormValue("custom_1");
    const customPaymentId = getFormValue("custom_2");

    if (
      !merchantId ||
      !orderId ||
      !payHereAmount ||
      !payHereCurrency ||
      !statusCode ||
      !receivedSignature
    ) {
      return textResponse(
        "Missing required payment notification fields.",
        400
      );
    }

    if (merchantId !== expectedMerchantId) {
      return textResponse("Merchant ID mismatch.", 400);
    }

    const locallyGeneratedSignature = md5Upper(
      merchantId +
        orderId +
        payHereAmount +
        payHereCurrency +
        statusCode +
        md5Upper(payHereMerchantSecret)
    );

    if (
      !constantTimeEquals(
        locallyGeneratedSignature,
        receivedSignature
      )
    ) {
      console.error(
        "Rejected PayHere notification with invalid signature:",
        orderId
      );

      return textResponse("Invalid signature.", 400);
    }

    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: payment,
      error: paymentLookupError,
    } = await adminClient
      .from("payments")
      .select(
        "id, booking_id, amount, currency, payment_status, paid_at"
      )
      .eq("gateway_order_id", orderId)
      .eq("payment_method", "payhere")
      .single();

    if (paymentLookupError || !payment) {
      console.error(
        "PayHere payment record not found:",
        {
          orderId,
          paymentLookupError,
        }
      );

      return textResponse("Payment record not found.", 404);
    }

    if (
      customBookingId &&
      customBookingId !== payment.booking_id
    ) {
      return textResponse(
        "Booking reference mismatch.",
        400
      );
    }

    if (
      customPaymentId &&
      customPaymentId !== payment.id
    ) {
      return textResponse(
        "Payment reference mismatch.",
        400
      );
    }

    const storedAmount = Number(payment.amount);
    const notifiedAmount = Number(payHereAmount);

    if (
      !Number.isFinite(storedAmount) ||
      !Number.isFinite(notifiedAmount) ||
      storedAmount.toFixed(2) !== notifiedAmount.toFixed(2)
    ) {
      return textResponse("Payment amount mismatch.", 400);
    }

    if (
      String(payment.currency).toUpperCase() !==
      payHereCurrency.toUpperCase()
    ) {
      return textResponse("Payment currency mismatch.", 400);
    }

    const statusMap: Record<
      string,
      "paid" | "processing" | "cancelled" | "failed" | "chargedback"
    > = {
      "2": "paid",
      "0": "processing",
      "-1": "cancelled",
      "-2": "failed",
      "-3": "chargedback",
    };

    const nextPaymentStatus = statusMap[statusCode];

    if (!nextPaymentStatus) {
      return textResponse(
        "Unsupported payment status.",
        400
      );
    }

    const gatewayMessage = [
      statusMessage,
      paymentMethod
        ? `Method: ${paymentMethod}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const paidAt =
      nextPaymentStatus === "paid"
        ? payment.paid_at || new Date().toISOString()
        : null;

    const {
      error: updateError,
    } = await adminClient
      .from("payments")
      .update({
        payment_status: nextPaymentStatus,
        gateway_payment_id: paymentId || null,
        gateway_status_code: statusCode,
        gateway_message: gatewayMessage || null,
        paid_at: paidAt,
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error(
        "PayHere payment update failed:",
        updateError
      );

      return textResponse("Payment update failed.", 500);
    }

    console.log(
      "Verified PayHere payment notification:",
      {
        orderId,
        statusCode,
        paymentStatus: nextPaymentStatus,
      }
    );

    return textResponse("OK");
  } catch (error) {
    console.error(
      "Unexpected PayHere notification error:",
      error
    );

    return textResponse("Internal server error.", 500);
  }
});