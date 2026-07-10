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
  BackHandler,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  WebViewNavigation,
} from "react-native-webview";

import {
  WebView,
} from "react-native-webview";

import {
  useLanguage,
} from "@/contexts/LanguageContext";

import {
  supabase,
} from "@/lib/supabase";

type CheckoutFields = Record<
  string,
  string
>;

type CreatePaymentResponse = {
  checkout_url: string;
  payment_id: string;
  booking_id: string;
  fields: CheckoutFields;
};

const escapeHtml = (
  value: string
): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const buildCheckoutHtml = (
  checkoutUrl: string,
  fields: CheckoutFields
): string => {
  const hiddenInputs =
    Object.entries(fields)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escapeHtml(
            name
          )}" value="${escapeHtml(
            String(value)
          )}" />`
      )
      .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1"
  />
  <title>Opening PayHere</title>
  <style>
    html,
    body {
      margin: 0;
      min-height: 100%;
      font-family: Arial, sans-serif;
      background: #f7f4ff;
      color: #1f2937;
    }

    body {
      display: grid;
      place-items: center;
    }

    .card {
      width: min(84%, 360px);
      padding: 28px 22px;
      border: 1px solid #ddd6fe;
      border-radius: 18px;
      background: #ffffff;
      text-align: center;
      box-shadow: 0 12px 36px rgba(31, 41, 55, 0.09);
    }

    .spinner {
      width: 38px;
      height: 38px;
      margin: 0 auto 18px;
      border: 4px solid #ede9fe;
      border-top-color: #6d28d9;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
    }

    h1 {
      margin: 0;
      font-size: 22px;
      color: #6d28d9;
    }

    p {
      margin: 12px 0 0;
      font-size: 14px;
      line-height: 1.6;
      color: #6b7280;
    }

    button {
      width: 100%;
      min-height: 48px;
      margin-top: 20px;
      border: 0;
      border-radius: 10px;
      background: #6d28d9;
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="spinner"></div>
    <h1>Opening PayHere Sandbox</h1>
    <p>
      Please wait while FixMate prepares the secure checkout.
    </p>

    <form
      id="payhere-form"
      method="post"
      action="${escapeHtml(checkoutUrl)}"
    >
      ${hiddenInputs}
      <button type="submit">
        Continue to PayHere
      </button>
    </form>
  </main>

  <script>
    window.setTimeout(function () {
      document.getElementById("payhere-form").submit();
    }, 350);
  </script>
</body>
</html>`;
};

const getSingleParam = (
  value: string | string[] | undefined
): string =>
  Array.isArray(value)
    ? value[0] || ""
    : value || "";

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

  const webViewRef =
    useRef<WebView>(null);

  const checkoutFinishedRef =
    useRef(false);

  const [
    checkoutHtml,
    setCheckoutHtml,
  ] = useState("");

  const [
    isPreparing,
    setIsPreparing,
  ] = useState(true);

  const [
    canGoBack,
    setCanGoBack,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const preparePayment =
    useCallback(async () => {
      setIsPreparing(true);
      setErrorMessage("");
      setCheckoutHtml("");
      checkoutFinishedRef.current =
        false;

      try {
        if (!bookingId) {
          setErrorMessage(
            translate(
              "payments.invalidBooking",
              "The booking reference is missing."
            )
          );

          return;
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
          router.replace("/login");
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
          console.error(
            "Create PayHere payment function error:",
            error
          );

          setErrorMessage(
            error.message ||
              translate(
                "payments.checkoutPrepareFailed",
                "The online payment could not be prepared."
              )
          );

          return;
        }

        const response =
          data as
            | CreatePaymentResponse
            | null;

        if (
          !response ||
          !response.checkout_url ||
          !response.fields
        ) {
          setErrorMessage(
            translate(
              "payments.invalidCheckoutResponse",
              "The payment server returned an invalid checkout response."
            )
          );

          return;
        }

        setCheckoutHtml(
          buildCheckoutHtml(
            response.checkout_url,
            response.fields
          )
        );
      } catch (error) {
        console.error(
          "Unexpected PayHere checkout preparation error:",
          error
        );

        setErrorMessage(
          translate(
            "payments.checkoutUnexpectedError",
            "Something went wrong while preparing the online payment."
          )
        );
      } finally {
        setIsPreparing(false);
      }
    }, [
      bookingId,
      translate,
    ]);

  useEffect(() => {
    void preparePayment();
  }, [preparePayment]);

  const returnToBookings =
    useCallback(
      (
        result:
          | "submitted"
          | "cancelled"
      ) => {
        if (
          checkoutFinishedRef.current
        ) {
          return;
        }

        checkoutFinishedRef.current =
          true;

        if (
          result ===
          "cancelled"
        ) {
          Alert.alert(
            translate(
              "payments.paymentCancelledTitle",
              "Payment cancelled"
            ),
            translate(
              "payments.paymentCancelledMessage",
              "The PayHere checkout was cancelled. You can try again from My Bookings."
            ),
            [
              {
                text: translate(
                  "common.ok",
                  "OK"
                ),

                onPress: () =>
                  router.replace(
                    "/my-bookings"
                  ),
              },
            ]
          );

          return;
        }

        Alert.alert(
          translate(
            "payments.paymentSubmittedTitle",
            "Payment submitted"
          ),
          translate(
            "payments.paymentSubmittedMessage",
            "Return to My Bookings while PayHere securely verifies the result. The status may take a few seconds to update."
          ),
          [
            {
              text: translate(
                "payments.viewBooking",
                "View Booking"
              ),

              onPress: () =>
                router.replace(
                  "/my-bookings"
                ),
            },
          ]
        );
      },
      [translate]
    );

  const handleNavigationRequest =
    useCallback(
      (
        request: WebViewNavigation
      ): boolean => {
        const url =
          request.url || "";

        const isReturnUrl =
          url.includes(
            "/functions/v1/payhere-notify"
          ) &&
          url.includes(
            "result=return"
          );

        const isCancelUrl =
          url.includes(
            "/functions/v1/payhere-notify"
          ) &&
          url.includes(
            "result=cancel"
          );

        if (isCancelUrl) {
          setTimeout(
            () =>
              returnToBookings(
                "cancelled"
              ),
            0
          );

          return false;
        }

        if (isReturnUrl) {
          setTimeout(
            () =>
              returnToBookings(
                "submitted"
              ),
            0
          );

          return false;
        }

        return true;
      },
      [returnToBookings]
    );

  const handleNavigationChange =
    useCallback(
      (
        navigationState:
          WebViewNavigation
      ) => {
        setCanGoBack(
          navigationState.canGoBack
        );
      },
      []
    );

  const handleWebViewError =
    useCallback(
      (
        event: {
          nativeEvent: unknown;
        }
      ) => {
        console.error(
          "PayHere WebView error:",
          event.nativeEvent
        );

        setErrorMessage(
          translate(
            "payments.checkoutLoadFailed",
            "The PayHere checkout page could not be loaded. Check your internet connection and try again."
          )
        );
      },
      [translate]
    );

  const handleBack =
    useCallback((): boolean => {
      if (
        canGoBack &&
        webViewRef.current
      ) {
        webViewRef.current.goBack();
        return true;
      }

      router.replace(
        "/my-bookings"
      );

      return true;
    }, [canGoBack]);

  useEffect(() => {
    const subscription =
      BackHandler.addEventListener(
        "hardwareBackPress",
        handleBack
      );

    return () => {
      subscription.remove();
    };
  }, [handleBack]);

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View
        style={styles.header}
      >
        <Pressable
          style={
            styles.backButton
          }
          onPress={handleBack}
        >
          <Text
            style={styles.backText}
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
          style={styles.noticeText}
        >
          {translate(
            "payments.testPaymentNotice",
            "This is a test payment. No real money will be charged."
          )}
        </Text>
      </View>

      {isPreparing && (
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
            {translate(
              "payments.preparingCheckout",
              "Preparing secure checkout..."
            )}
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            {translate(
              "payments.pleaseWait",
              "Please wait a moment."
            )}
          </Text>
        </View>
      )}

      {!isPreparing &&
        errorMessage !== "" && (
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
              onPress={() =>
                void preparePayment()
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
              onPress={() =>
                router.replace(
                  "/my-bookings"
                )
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

      {!isPreparing &&
        errorMessage === "" &&
        checkoutHtml !== "" && (
          <WebView
            ref={webViewRef}
            style={styles.webView}
            source={{
              html: checkoutHtml,
              baseUrl:
                "https://sandbox.payhere.lk",
            }}
            originWhitelist={[
              "*",
            ]}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={
              false
            }
            startInLoadingState
            renderLoading={() => (
              <View
                style={
                  styles.webViewLoading
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#6D28D9"
                />

                <Text
                  style={
                    styles.webViewLoadingText
                  }
                >
                  {translate(
                    "payments.openingPayHere",
                    "Opening PayHere..."
                  )}
                </Text>
              </View>
            )}
            onShouldStartLoadWithRequest={
              handleNavigationRequest
            }
            onNavigationStateChange={
              handleNavigationChange
            }
            onError={
              handleWebViewError
            }
            onHttpError={(
              event
            ) => {
              console.error(
                "PayHere WebView HTTP error:",
                event.nativeEvent
              );
            }}
          />
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
      fontSize: 17,
      fontWeight: "800",
      textAlign: "center",
      color: "#1F2937",
    },

    loadingText: {
      marginTop: 7,
      fontSize: 13,
      textAlign: "center",
      color: "#6B7280",
    },

    errorIcon: {
      fontSize: 46,
    },

    errorTitle: {
      marginTop: 14,
      fontSize: 20,
      fontWeight: "800",
      textAlign: "center",
      color: "#1F2937",
    },

    errorText: {
      marginTop: 9,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color: "#B91C1C",
    },

    retryButton: {
      minWidth: 210,
      minHeight: 48,
      alignItems: "center",
      justifyContent:
        "center",
      marginTop: 22,
      paddingHorizontal: 22,
      borderRadius: 10,
      backgroundColor:
        "#6D28D9",
    },

    retryButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    returnButton: {
      minWidth: 210,
      minHeight: 46,
      alignItems: "center",
      justifyContent:
        "center",
      marginTop: 10,
      paddingHorizontal: 22,
      borderWidth: 1,
      borderColor: "#C4B5FD",
      borderRadius: 10,
      backgroundColor:
        "#FFFFFF",
    },

    returnButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#6D28D9",
    },

    webView: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    webViewLoading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
    },

    webViewLoadingText: {
      marginTop: 13,
      fontSize: 13,
      fontWeight: "700",
      color: "#6B7280",
    },
  });
