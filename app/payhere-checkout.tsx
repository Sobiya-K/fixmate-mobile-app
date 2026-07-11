import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PayHere from "@payhere/payhere-mobilesdk-reactnative";

import {
  useLanguage,
} from "@/contexts/LanguageContext";

import {
  supabase,
} from "@/lib/supabase";

type PayHerePaymentObject = {
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
};

type CreatePaymentResponse = {
  payment_id: string;
  booking_id: string;
  payment_object: PayHerePaymentObject;
};

type CheckoutState =
  | "preparing"
  | "opening"
  | "waiting"
  | "error";

type ClientEvent =
  | "completed"
  | "error"
  | "dismissed";

const getSingleParam = (
  value: string | string[] | undefined
): string =>
  Array.isArray(value)
    ? value[0] || ""
    : value || "";

const formatError = (
  value: unknown
): string => {
  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    return value.trim();
  }

  if (value instanceof Error) {
    return value.message;
  }

  try {
    const serialized =
      JSON.stringify(value);

    if (
      serialized &&
      serialized !== "{}"
    ) {
      return serialized;
    }
  } catch {
    // Fall through to the generic message.
  }

  return "Unknown PayHere error.";
};

export default function PayHereCheckoutScreen() {
  const {
    t,
  } = useLanguage();

  const params =
    useLocalSearchParams<{
      bookingId?:
        | string
        | string[];
    }>();

  const bookingId = useMemo(
    () =>
      getSingleParam(
        params.bookingId
      ).trim(),
    [params.bookingId]
  );

  const translate = useCallback(
    (
      key: string,
      fallback: string
    ): string => {
      const translatedValue =
        t(key);

      return translatedValue ===
        key
        ? fallback
        : translatedValue;
    },
    [t]
  );

  const screenActiveRef =
    useRef(true);

  const launchStartedRef =
    useRef(false);

  const [
    checkoutState,
    setCheckoutState,
  ] = useState<CheckoutState>(
    "preparing"
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const reportClientEvent =
    useCallback(
      async (
        event: ClientEvent,
        options?: {
          gatewayPaymentId?: string;
          message?: string;
        }
      ): Promise<void> => {
        try {
          const {
            error,
          } =
            await supabase.functions.invoke(
              "create-payhere-payment",
              {
                body: {
                  action:
                    "client_event",
                  booking_id:
                    bookingId,
                  event,
                  gateway_payment_id:
                    options?.gatewayPaymentId ??
                    null,
                  message:
                    options?.message ??
                    null,
                },
              }
            );

          if (error) {
            console.error(
              "PayHere client-event reporting failed:",
              error
            );
          }
        } catch (error) {
          console.error(
            "Unexpected PayHere client-event reporting error:",
            error
          );
        }
      },
      [bookingId]
    );

  const returnToBookings =
    useCallback(() => {
      router.replace(
        "/my-bookings"
      );
    }, []);

  const handlePaymentCompleted =
    useCallback(
      async (
        paymentId: string
      ): Promise<void> => {
        if (
          screenActiveRef.current
        ) {
          setCheckoutState(
            "waiting"
          );
        }

        await reportClientEvent(
          "completed",
          {
            gatewayPaymentId:
              String(
                paymentId || ""
              ).trim(),
            message:
              "PayHere native SDK reported payment completion. Waiting for the secure server notification.",
          }
        );

        if (
          !screenActiveRef.current
        ) {
          return;
        }

        Alert.alert(
          translate(
            "payments.paymentSubmittedTitle",
            "Payment submitted"
          ),
          translate(
            "payments.paymentSubmittedMessage",
            "PayHere accepted the payment. FixMate is securely verifying it, and the status will update automatically."
          ),
          [
            {
              text: translate(
                "payments.viewBooking",
                "View Booking"
              ),
              onPress:
                returnToBookings,
            },
          ],
          {
            cancelable: false,
          }
        );
      },
      [
        reportClientEvent,
        returnToBookings,
        translate,
      ]
    );

  const handlePaymentError =
    useCallback(
      async (
        errorData: unknown
      ): Promise<void> => {
        const message =
          formatError(
            errorData
          );

        console.error(
          "PayHere native payment error:",
          errorData
        );

        await reportClientEvent(
          "error",
          {
            message,
          }
        );

        if (
          !screenActiveRef.current
        ) {
          return;
        }

        launchStartedRef.current =
          false;

        setErrorMessage(message);

        setCheckoutState(
          "error"
        );
      },
      [reportClientEvent]
    );

  const handlePaymentDismissed =
    useCallback(
      async (): Promise<void> => {
        await reportClientEvent(
          "dismissed",
          {
            message:
              "The customer dismissed the PayHere native checkout.",
          }
        );

        if (
          !screenActiveRef.current
        ) {
          return;
        }

        Alert.alert(
          translate(
            "payments.paymentCancelledTitle",
            "Payment cancelled"
          ),
          translate(
            "payments.paymentCancelledMessage",
            "The PayHere payment was not completed. You can try again from My Bookings."
          ),
          [
            {
              text: translate(
                "common.ok",
                "OK"
              ),
              onPress:
                returnToBookings,
            },
          ],
          {
            cancelable: false,
          }
        );
      },
      [
        reportClientEvent,
        returnToBookings,
        translate,
      ]
    );

  const prepareAndLaunchPayment =
    useCallback(async (): Promise<void> => {
      if (
        launchStartedRef.current
      ) {
        return;
      }

      launchStartedRef.current =
        true;

      setCheckoutState(
        "preparing"
      );

      setErrorMessage("");

      try {
        if (!bookingId) {
          throw new Error(
            translate(
              "payments.invalidBooking",
              "The booking reference is missing."
            )
          );
        }

        if (
          Platform.OS !==
            "android" &&
          Platform.OS !== "ios"
        ) {
          throw new Error(
            translate(
              "payments.mobileOnly",
              "PayHere native checkout is available only on Android or iOS."
            )
          );
        }

        if (
          !NativeModules.PayhereOfficial
        ) {
          throw new Error(
            translate(
              "payments.nativeModuleMissing",
              "The PayHere native module is not available. Open FixMate using the installed development APK, not Expo Go."
            )
          );
        }

        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !session
        ) {
          router.replace(
            "/login"
          );
          return;
        }

        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            "create-payhere-payment",
            {
              body: {
                booking_id:
                  bookingId,
              },
            }
          );

        if (error) {
          throw error;
        }

        const response =
          data as
            | CreatePaymentResponse
            | null;

        if (
          !response ||
          !response.payment_id ||
          !response.booking_id ||
          !response.payment_object
        ) {
          throw new Error(
            translate(
              "payments.invalidCheckoutResponse",
              "The payment server returned an invalid native checkout response."
            )
          );
        }

        if (
          !screenActiveRef.current
        ) {
          return;
        }

        setCheckoutState(
          "opening"
        );

        PayHere.startPayment(
          response.payment_object,
          (
            paymentId:
              string
          ) => {
            void handlePaymentCompleted(
              paymentId
            );
          },
          (
            errorData:
              unknown
          ) => {
            void handlePaymentError(
              errorData
            );
          },
          () => {
            void handlePaymentDismissed();
          }
        );
      } catch (error) {
        const message =
          formatError(error);

        console.error(
          "PayHere native checkout preparation error:",
          error
        );

        await reportClientEvent(
          "error",
          {
            message,
          }
        );

        if (
          !screenActiveRef.current
        ) {
          return;
        }

        launchStartedRef.current =
          false;

        setErrorMessage(
          message
        );

        setCheckoutState(
          "error"
        );
      }
    }, [
      bookingId,
      handlePaymentCompleted,
      handlePaymentDismissed,
      handlePaymentError,
      reportClientEvent,
      translate,
    ]);

  useEffect(() => {
    screenActiveRef.current =
      true;

    void prepareAndLaunchPayment();

    return () => {
      screenActiveRef.current =
        false;
    };
  }, [
    prepareAndLaunchPayment,
  ]);

  const retryPayment =
    useCallback(() => {
      launchStartedRef.current =
        false;

      void prepareAndLaunchPayment();
    }, [
      prepareAndLaunchPayment,
    ]);

  const statusTitle =
    checkoutState ===
      "waiting"
      ? translate(
          "payments.verifyingPayment",
          "Verifying payment..."
        )
      : checkoutState ===
          "opening"
        ? translate(
            "payments.openingPayHere",
            "Opening PayHere..."
          )
        : translate(
            "payments.preparingCheckout",
            "Preparing secure checkout..."
          );

  const statusMessage =
    checkoutState ===
      "waiting"
      ? translate(
          "payments.verificationWait",
          "Please wait while FixMate confirms the secure PayHere notification."
        )
      : translate(
          "payments.pleaseWait",
          "Please wait a moment."
        );

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <View
        style={styles.header}
      >
        <Pressable
          style={
            styles.backButton
          }
          onPress={
            returnToBookings
          }
          disabled={
            checkoutState ===
            "waiting"
          }
        >
          <Text
            style={[
              styles.backText,
              checkoutState ===
                "waiting" &&
                styles.disabledText,
            ]}
          >
            ←{" "}
            {translate(
              "common.back",
              "Back"
            )}
          </Text>
        </Pressable>

        <View
          style={
            styles.headerInformation
          }
        >
          <Text
            style={styles.title}
          >
            {translate(
              "payments.secureCheckout",
              "Secure Checkout"
            )}
          </Text>

          <Text
            style={styles.subtitle}
          >
            {translate(
              "payments.sandboxMode",
              "PayHere Sandbox"
            )}
          </Text>
        </View>

        <View
          style={
            styles.securityBadge
          }
        >
          <Text
            style={
              styles.securityBadgeText
            }
          >
            🔒
          </Text>
        </View>
      </View>

      <View
        style={
          styles.noticeCard
        }
      >
        <Text
          style={
            styles.noticeText
          }
        >
          {translate(
            "payments.testPaymentNotice",
            "This is a sandbox test payment. No real money will be charged."
          )}
        </Text>
      </View>

      {checkoutState !==
        "error" ? (
        <View
          style={
            styles.centerContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#6D28D9"
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            {statusTitle}
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            {statusMessage}
          </Text>

          <View
            style={
              styles.nativeBadge
            }
          >
            <Text
              style={
                styles.nativeBadgeText
              }
            >
              {translate(
                "payments.nativeCheckout",
                "Native mobile checkout"
              )}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={
            styles.centerContainer
          }
        >
          <Text
            style={
              styles.errorIcon
            }
          >
            ⚠️
          </Text>

          <Text
            style={
              styles.errorTitle
            }
          >
            {translate(
              "payments.checkoutErrorTitle",
              "Checkout unavailable"
            )}
          </Text>

          <Text
            style={
              styles.errorText
            }
          >
            {errorMessage}
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={
              retryPayment
            }
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              {translate(
                "common.retry",
                "Try Again"
              )}
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.returnButton
            }
            onPress={
              returnToBookings
            }
          >
            <Text
              style={
                styles.returnButtonText
              }
            >
              {translate(
                "payments.returnToBookings",
                "Return to My Bookings"
              )}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#F7F4FF",
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        "#E5E7EB",
      backgroundColor:
        "#FFFFFF",
    },

    backButton: {
      paddingVertical: 8,
      paddingRight: 12,
    },

    backText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#6D28D9",
    },

    disabledText: {
      color: "#9CA3AF",
    },

    headerInformation: {
      flex: 1,
      alignItems: "center",
    },

    title: {
      fontSize: 17,
      fontWeight: "800",
      color: "#1F2937",
    },

    subtitle: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "700",
      color: "#6D28D9",
    },

    securityBadge: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 19,
      backgroundColor:
        "#EDE9FE",
    },

    securityBadgeText: {
      fontSize: 17,
    },

    noticeCard: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor:
        "#FDE68A",
      backgroundColor:
        "#FFFBEB",
    },

    noticeText: {
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: "#92400E",
    },

    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 28,
    },

    loadingTitle: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "center",
      color: "#1F2937",
    },

    loadingText: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color: "#6B7280",
    },

    nativeBadge: {
      marginTop: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor:
        "#EDE9FE",
    },

    nativeBadgeText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#6D28D9",
    },

    errorIcon: {
      fontSize: 48,
    },

    errorTitle: {
      marginTop: 14,
      fontSize: 19,
      fontWeight: "800",
      textAlign: "center",
      color: "#1F2937",
    },

    errorText: {
      marginTop: 10,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color: "#6B7280",
    },

    retryButton: {
      width: "100%",
      marginTop: 24,
      paddingVertical: 14,
      alignItems: "center",
      borderRadius: 12,
      backgroundColor:
        "#6D28D9",
    },

    retryButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    returnButton: {
      width: "100%",
      marginTop: 12,
      paddingVertical: 13,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#C4B5FD",
      borderRadius: 12,
      backgroundColor:
        "#FFFFFF",
    },

    returnButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#6D28D9",
    },
  });
