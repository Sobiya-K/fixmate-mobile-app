import { createClient } from "npm:@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js@4.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const requireEnvironmentVariable = (name: string): string => {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const md5Upper = (value: string): string =>
  CryptoJS.MD5(value).toString().toUpperCase();

const splitCustomerName = (
  fullName: string
): {
  firstName: string;
  lastName: string;
} => {
  const nameParts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const firstName = nameParts.shift() || "FixMate";
  const lastName = nameParts.join(" ") || "Customer";

  return {
    firstName,
    lastName,
  };
};

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed.",
      },
      405
    );
  }

  try {
    const supabaseUrl =
      requireEnvironmentVariable("SUPABASE_URL");

    const supabaseAnonKey =
      requireEnvironmentVariable("SUPABASE_ANON_KEY");

    const supabaseServiceRoleKey =
      requireEnvironmentVariable(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    const payHereMerchantId =
      requireEnvironmentVariable(
        "PAYHERE_MERCHANT_ID"
      );

    const payHereMerchantSecret =
      requireEnvironmentVariable(
        "PAYHERE_MERCHANT_SECRET"
      );

    const payHereEnvironment =
      (
        Deno.env.get("PAYHERE_ENV") ||
        "sandbox"
      )
        .trim()
        .toLowerCase();

    if (payHereEnvironment !== "sandbox") {
      return jsonResponse(
        {
          error:
            "This FixMate build is configured for PayHere Sandbox only.",
        },
        500
      );
    }

    const authorizationHeader =
      request.headers.get("Authorization");

    if (!authorizationHeader) {
      return jsonResponse(
        {
          error: "Authentication is required.",
        },
        401
      );
    }

    const authenticatedClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorizationHeader,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authenticatedClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: "Your session is invalid or expired.",
        },
        401
      );
    }

    const requestBody = await request
      .json()
      .catch(() => null);

    const bookingId =
      typeof requestBody?.booking_id === "string"
        ? requestBody.booking_id.trim()
        : "";

    if (!bookingId) {
      return jsonResponse(
        {
          error: "booking_id is required.",
        },
        400
      );
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
      data: booking,
      error: bookingError,
    } = await adminClient
      .from("bookings")
      .select(
        "id, customer_id, worker_id, service_category, service_description, service_address, estimated_price, status"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error(
        "PayHere booking lookup failed:",
        bookingError
      );

      return jsonResponse(
        {
          error: "Booking not found.",
        },
        404
      );
    }

    if (booking.customer_id !== user.id) {
      return jsonResponse(
        {
          error:
            "Only the booking customer can start this payment.",
        },
        403
      );
    }

    const bookingStatus = String(
      booking.status
    )
      .trim()
      .toLowerCase()
      .replaceAll(" ", "_");

    if (
      ![
        "accepted",
        "in_progress",
        "completed",
      ].includes(bookingStatus)
    ) {
      return jsonResponse(
        {
          error:
            "Online payment is available only after the worker accepts the booking.",
        },
        400
      );
    }

    const {
      data: existingPayment,
      error: existingPaymentError,
    } = await adminClient
      .from("payments")
      .select(
        "id, payment_status"
      )
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "Existing payment lookup failed:",
        existingPaymentError
      );

      return jsonResponse(
        {
          error:
            "The current payment record could not be checked.",
        },
        500
      );
    }

    if (
      existingPayment?.payment_status ===
      "paid"
    ) {
      return jsonResponse(
        {
          error:
            "This booking has already been paid.",
        },
        409
      );
    }

    const {
      data: customerProfile,
      error: profileError,
    } = await adminClient
      .from("profiles")
      .select(
        "full_name, phone, town"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !customerProfile) {
      console.error(
        "Customer profile lookup failed:",
        profileError
      );

      return jsonResponse(
        {
          error:
            "Your customer profile could not be loaded.",
        },
        400
      );
    }

    const customerEmail =
      user.email?.trim() || "";

    const customerPhone =
      String(
        customerProfile.phone || ""
      ).trim();

    const customerTown =
      String(
        customerProfile.town || ""
      ).trim();

    const customerAddress =
      String(
        booking.service_address || ""
      ).trim();

    if (!customerEmail) {
      return jsonResponse(
        {
          error:
            "A valid email address is required for online payment.",
        },
        400
      );
    }

    if (!customerPhone) {
      return jsonResponse(
        {
          error:
            "Add your phone number in Profile before paying online.",
        },
        400
      );
    }

    if (!customerTown) {
      return jsonResponse(
        {
          error:
            "Add your town in Profile before paying online.",
        },
        400
      );
    }

    if (!customerAddress) {
      return jsonResponse(
        {
          error:
            "A service address is required for online payment.",
        },
        400
      );
    }

    const numericAmount = Number(
      booking.estimated_price
    );

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return jsonResponse(
        {
          error:
            "This booking does not have a valid payment amount.",
        },
        400
      );
    }

    const amount =
      numericAmount.toFixed(2);

    const currency = "LKR";

    const orderId =
      `FM-${Date.now()}-${booking.id.slice(
        0,
        8
      )}`;

    const notifyUrl =
      `${supabaseUrl}/functions/v1/payhere-notify`;

    const returnUrl =
      `${notifyUrl}?result=return&order_id=${encodeURIComponent(
        orderId
      )}`;

    const cancelUrl =
      `${notifyUrl}?result=cancel&order_id=${encodeURIComponent(
        orderId
      )}`;

    const {
      data: payment,
      error: paymentError,
    } = await adminClient
      .from("payments")
      .upsert(
        {
          booking_id: booking.id,
          customer_id:
            booking.customer_id,
          worker_id: booking.worker_id,
          amount,
          currency,
          payment_method: "payhere",
          payment_status:
            "processing",
          gateway_order_id: orderId,
          gateway_payment_id: null,
          gateway_status_code: null,
          gateway_message:
            "PayHere Sandbox checkout created.",
          paid_at: null,
        },
        {
          onConflict: "booking_id",
        }
      )
      .select(
        "id, booking_id"
      )
      .single();

    if (paymentError || !payment) {
      console.error(
        "Payment record creation failed:",
        paymentError
      );

      return jsonResponse(
        {
          error:
            "The online payment record could not be created.",
        },
        500
      );
    }

    const hashedSecret = md5Upper(
      payHereMerchantSecret
    );

    const paymentHash = md5Upper(
      payHereMerchantId +
        orderId +
        amount +
        currency +
        hashedSecret
    );

    const {
      firstName,
      lastName,
    } = splitCustomerName(
      String(
        customerProfile.full_name ||
          "FixMate Customer"
      )
    );

    return jsonResponse({
      checkout_url:
        "https://sandbox.payhere.lk/pay/checkout",

      payment_id: payment.id,

      booking_id: booking.id,

      fields: {
        merchant_id:
          payHereMerchantId,

        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,

        first_name: firstName,
        last_name: lastName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
        city: customerTown,
        country: "Sri Lanka",

        order_id: orderId,

        items:
          `FixMate - ${String(
            booking.service_category
          )}`,

        currency,
        amount,
        hash: paymentHash,

        platform:
          "FixMate Mobile App",

        custom_1: booking.id,
        custom_2: payment.id,
      },
    });
  } catch (error) {
    console.error(
      "Unexpected create PayHere payment error:",
      error
    );

    return jsonResponse(
      {
        error:
          "An unexpected server error occurred while preparing the payment.",
      },
      500
    );
  }
});
