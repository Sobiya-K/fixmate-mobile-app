import {
  createClient,
} from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const jsonResponse = (
  body: Record<
    string,
    unknown
  >,
  status = 200
): Response =>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );

const requireEnvironmentVariable = (
  name: string
): string => {
  const value =
    Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
};

const splitCustomerName = (
  fullName: string
): {
  firstName: string;
  lastName: string;
} => {
  const nameParts =
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const firstName =
    nameParts.shift() ||
    "FixMate";

  const lastName =
    nameParts.join(" ") ||
    "Customer";

  return {
    firstName,
    lastName,
  };
};

const normalizeStatus = (
  value: unknown
): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");

const cleanMessage = (
  value: unknown,
  fallback: string
): string => {
  const message =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!message) {
    return fallback;
  }

  return message.slice(
    0,
    500
  );
};

Deno.serve(
  async (
    request: Request
  ): Promise<Response> => {
    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        }
      );
    }

    if (
      request.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }

    try {
      const supabaseUrl =
        requireEnvironmentVariable(
          "SUPABASE_URL"
        );

      const supabaseAnonKey =
        requireEnvironmentVariable(
          "SUPABASE_ANON_KEY"
        );

      const supabaseServiceRoleKey =
        requireEnvironmentVariable(
          "SUPABASE_SERVICE_ROLE_KEY"
        );

      const payHereMerchantId =
        requireEnvironmentVariable(
          "PAYHERE_MERCHANT_ID"
        );

      const payHereEnvironment =
        (
          Deno.env.get(
            "PAYHERE_ENV"
          ) || "sandbox"
        )
          .trim()
          .toLowerCase();

      if (
        payHereEnvironment !==
        "sandbox"
      ) {
        return jsonResponse(
          {
            error:
              "This FixMate build is configured for PayHere Sandbox only.",
          },
          500
        );
      }

      const authorizationHeader =
        request.headers.get(
          "Authorization"
        );

      if (
        !authorizationHeader
      ) {
        return jsonResponse(
          {
            error:
              "Authentication is required.",
          },
          401
        );
      }

      const authenticatedClient =
        createClient(
          supabaseUrl,
          supabaseAnonKey,
          {
            global: {
              headers: {
                Authorization:
                  authorizationHeader,
              },
            },
            auth: {
              persistSession:
                false,
              autoRefreshToken:
                false,
            },
          }
        );

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await authenticatedClient.auth.getUser();

      if (
        userError ||
        !user
      ) {
        return jsonResponse(
          {
            error:
              "Your session is invalid or expired.",
          },
          401
        );
      }

      const requestBody =
        await request
          .json()
          .catch(
            () => null
          );

      const action =
        typeof requestBody?.action ===
          "string"
          ? requestBody.action
              .trim()
              .toLowerCase()
          : "create";

      const bookingId =
        typeof requestBody?.booking_id ===
          "string"
          ? requestBody.booking_id.trim()
          : "";

      if (!bookingId) {
        return jsonResponse(
          {
            error:
              "booking_id is required.",
          },
          400
        );
      }

      const adminClient =
        createClient(
          supabaseUrl,
          supabaseServiceRoleKey,
          {
            auth: {
              persistSession:
                false,
              autoRefreshToken:
                false,
            },
          }
        );

      const {
        data: booking,
        error:
          bookingError,
      } =
        await adminClient
          .from(
            "bookings"
          )
          .select(
            "id, customer_id, worker_id, service_category, service_description, service_address, estimated_price, status"
          )
          .eq(
            "id",
            bookingId
          )
          .single();

      if (
        bookingError ||
        !booking
      ) {
        console.error(
          "PayHere booking lookup failed:",
          bookingError
        );

        return jsonResponse(
          {
            error:
              "Booking not found.",
          },
          404
        );
      }

      if (
        booking.customer_id !==
        user.id
      ) {
        return jsonResponse(
          {
            error:
              "Only the booking customer can manage this payment.",
          },
          403
        );
      }

      if (
        action ===
        "client_event"
      ) {
        const event =
          typeof requestBody?.event ===
            "string"
            ? requestBody.event
                .trim()
                .toLowerCase()
            : "";

        if (
          ![
            "completed",
            "error",
            "dismissed",
          ].includes(
            event
          )
        ) {
          return jsonResponse(
            {
              error:
                "A valid PayHere client event is required.",
            },
            400
          );
        }

        const {
          data:
            existingPayment,
          error:
            existingPaymentError,
        } =
          await adminClient
            .from(
              "payments"
            )
            .select(
              "id, payment_status, gateway_payment_id"
            )
            .eq(
              "booking_id",
              booking.id
            )
            .eq(
              "customer_id",
              user.id
            )
            .maybeSingle();

        if (
          existingPaymentError
        ) {
          console.error(
            "PayHere client-event payment lookup failed:",
            existingPaymentError
          );

          return jsonResponse(
            {
              error:
                "The payment record could not be checked.",
            },
            500
          );
        }

        if (
          !existingPayment
        ) {
          return jsonResponse(
            {
              error:
                "Payment record not found.",
            },
            404
          );
        }

        const currentStatus =
          normalizeStatus(
            existingPayment.payment_status
          );

        if (
          currentStatus ===
          "paid"
        ) {
          return jsonResponse({
            success: true,
            payment_status:
              "paid",
            message:
              "The secure PayHere notification has already confirmed this payment.",
          });
        }

        const suppliedGatewayPaymentId =
          typeof requestBody?.gateway_payment_id ===
            "string"
            ? requestBody.gateway_payment_id.trim()
            : "";

        const updateValues:
          Record<
            string,
            unknown
          > = {
            updated_at:
              new Date().toISOString(),
          };

        if (
          event ===
          "completed"
        ) {
          updateValues.payment_status =
            "processing";

          updateValues.gateway_message =
            cleanMessage(
              requestBody?.message,
              "PayHere native SDK reported payment completion. Waiting for secure server verification."
            );

          if (
            suppliedGatewayPaymentId
          ) {
            updateValues.gateway_payment_id =
              suppliedGatewayPaymentId;
          }
        }

        if (
          event ===
          "error"
        ) {
          updateValues.payment_status =
            "failed";

          updateValues.gateway_message =
            cleanMessage(
              requestBody?.message,
              "PayHere native checkout returned an error."
            );
        }

        if (
          event ===
          "dismissed"
        ) {
          updateValues.payment_status =
            "cancelled";

          updateValues.gateway_message =
            cleanMessage(
              requestBody?.message,
              "The customer dismissed the PayHere native checkout."
            );
        }

        const {
          data:
            updatedPayment,
          error:
            updateError,
        } =
          await adminClient
            .from(
              "payments"
            )
            .update(
              updateValues
            )
            .eq(
              "id",
              existingPayment.id
            )
            .neq(
              "payment_status",
              "paid"
            )
            .select(
              "id, booking_id, payment_status, gateway_payment_id, gateway_message"
            )
            .maybeSingle();

        if (
          updateError
        ) {
          console.error(
            "PayHere client-event payment update failed:",
            updateError
          );

          return jsonResponse(
            {
              error:
                "The payment status could not be updated.",
            },
            500
          );
        }

        return jsonResponse({
          success: true,
          event,
          payment:
            updatedPayment,
        });
      }

      if (
        action !==
        "create"
      ) {
        return jsonResponse(
          {
            error:
              "Unsupported payment action.",
          },
          400
        );
      }

      const bookingStatus =
        normalizeStatus(
          booking.status
        );

      if (
        ![
          "accepted",
          "in_progress",
          "completed",
        ].includes(
          bookingStatus
        )
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
        data:
          existingPayment,
        error:
          existingPaymentError,
      } =
        await adminClient
          .from(
            "payments"
          )
          .select(
            "id, payment_status"
          )
          .eq(
            "booking_id",
            bookingId
          )
          .maybeSingle();

      if (
        existingPaymentError
      ) {
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
        normalizeStatus(
          existingPayment?.payment_status
        ) === "paid"
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
        data:
          customerProfile,
        error:
          profileError,
      } =
        await adminClient
          .from(
            "profiles"
          )
          .select(
            "full_name, phone, town"
          )
          .eq(
            "id",
            user.id
          )
          .single();

      if (
        profileError ||
        !customerProfile
      ) {
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
        user.email?.trim() ||
        "";

      const customerPhone =
        String(
          customerProfile.phone ||
            ""
        ).trim();

      const customerTown =
        String(
          customerProfile.town ||
            ""
        ).trim();

      const customerAddress =
        String(
          booking.service_address ||
            ""
        ).trim();

      if (
        !customerEmail
      ) {
        return jsonResponse(
          {
            error:
              "A valid email address is required for online payment.",
          },
          400
        );
      }

      if (
        !customerPhone
      ) {
        return jsonResponse(
          {
            error:
              "Add your phone number in Profile before paying online.",
          },
          400
        );
      }

      if (
        !customerTown
      ) {
        return jsonResponse(
          {
            error:
              "Add your town in Profile before paying online.",
          },
          400
        );
      }

      if (
        !customerAddress
      ) {
        return jsonResponse(
          {
            error:
              "A service address is required for online payment.",
          },
          400
        );
      }

      const numericAmount =
        Number(
          booking.estimated_price
        );

      if (
        !Number.isFinite(
          numericAmount
        ) ||
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
        numericAmount.toFixed(
          2
        );

      const currency =
        "LKR";

      const orderId =
        `FM-${Date.now()}-${booking.id.slice(
          0,
          8
        )}`;

      const notifyUrl =
        `${supabaseUrl}/functions/v1/payhere-notify`;

      const {
        data: payment,
        error:
          paymentError,
      } =
        await adminClient
          .from(
            "payments"
          )
          .upsert(
            {
              booking_id:
                booking.id,
              customer_id:
                booking.customer_id,
              worker_id:
                booking.worker_id,
              amount,
              currency,
              payment_method:
                "payhere",
              payment_status:
                "processing",
              gateway_order_id:
                orderId,
              gateway_payment_id:
                null,
              gateway_status_code:
                null,
              gateway_message:
                "PayHere native Sandbox checkout created.",
              paid_at: null,
            },
            {
              onConflict:
                "booking_id",
            }
          )
          .select(
            "id, booking_id"
          )
          .single();

      if (
        paymentError ||
        !payment
      ) {
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

      const {
        firstName,
        lastName,
      } =
        splitCustomerName(
          String(
            customerProfile.full_name ||
              "FixMate Customer"
          )
        );

      return jsonResponse({
        payment_id:
          payment.id,

        booking_id:
          booking.id,

        payment_object: {
          sandbox: true,

          merchant_id:
            payHereMerchantId,

          notify_url:
            notifyUrl,

          order_id:
            orderId,

          items:
            `FixMate - ${String(
              booking.service_category
            )}`,

          amount,
          currency,

          first_name:
            firstName,

          last_name:
            lastName,

          email:
            customerEmail,

          phone:
            customerPhone,

          address:
            customerAddress,

          city:
            customerTown,

          country:
            "Sri Lanka",

          delivery_address:
            customerAddress,

          delivery_city:
            customerTown,

          delivery_country:
            "Sri Lanka",

          custom_1:
            booking.id,

          custom_2:
            payment.id,
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
  }
);
