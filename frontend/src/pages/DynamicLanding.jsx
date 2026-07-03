import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useParams } from "react-router-dom";

const API_BASE =
  "https://backend.mob13r.com";

export default function DynamicLanding() {
  const { id } = useParams();

  const [landing, setLanding] =
    useState(null);

  const [step, setStep] =
    useState("msisdn");

  const [msisdn, setMsisdn] =
    useState("");

  const [otp, setOtp] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [
    sessionToken,
    setSessionToken,
  ] = useState("");

  const [timer, setTimer] =
    useState(30);

  const [
    statusText,
    setStatusText,
  ] = useState("");

  const [
    redirectCounter,
    setRedirectCounter,
  ] = useState(3);

  const [success, setSuccess] =
    useState(false);

  const otpRefs = useRef([]);

  const pollingRef =
    useRef(null);

  const loadingRef =
    useRef(false);

  const redirectRef =
    useRef(false);

  const abortRef =
    useRef(null);

  /* =========================
     LOAD LANDING
  ========================= */

  useEffect(() => {
    loadLanding();

    return () => {
      if (pollingRef.current) {
        clearInterval(
          pollingRef.current
        );
      }

      abortRef.current?.abort();
    };
  }, [id]);

  const loadLanding =
    async () => {
      try {
        abortRef.current =
          new AbortController();

        const res =
          await fetch(
            `${API_BASE}/api/landing/${id}`,
            {
              signal:
                abortRef.current
                  .signal,
            }
          );

        if (!res.ok) {
          throw new Error(
            "Failed to load landing"
          );
        }

        const data =
          await res.json();

        if (
          data.status ===
          "SUCCESS"
        ) {
          const landingData =
            data.data;

          setLanding(
            landingData
          );

          setTimer(
            Number(
              landingData.timer_seconds
            ) || 30
          );

          setRedirectCounter(
            Number(
              landingData.redirect_delay_seconds
            ) || 3
          );

          const otpLength =
            Number(
              landingData.otp_length
            ) || 4;

          setOtp(
            Array(
              otpLength
            ).fill("")
          );

          injectAntiFraud(
            landingData
          );
        }
      } catch (err) {
        console.error(
          "Landing Load Error:",
          err
        );
      }
    };

  /* =========================
     OTP TIMER
  ========================= */

  useEffect(() => {
    let interval;

    if (
      step === "otp" &&
      timer > 0 &&
      landing?.show_timer
    ) {
      interval =
        setInterval(() => {
          setTimer(
            (prev) =>
              prev - 1
          );
        }, 1000);
    }

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    timer,
    step,
    landing,
  ]);

  /* =========================
     OTP FOCUS
  ========================= */

  useEffect(() => {
    if (step === "otp") {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  /* =========================
     SUCCESS REDIRECT
  ========================= */

  useEffect(() => {
    let interval;

    if (
      success &&
      landing?.enable_redirect &&
      redirectCounter > 0
    ) {
      interval =
        setInterval(() => {
          setRedirectCounter(
            (prev) =>
              prev - 1
          );
        }, 1000);
    }

    if (
      success &&
      landing?.enable_redirect &&
      redirectCounter <= 0 &&
      !redirectRef.current
    ) {
      redirectRef.current =
        true;

      handleRedirect();
    }

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    success,
    redirectCounter,
    landing,
  ]);

  /* =========================
     ANTIFRAUD
  ========================= */

  const injectAntiFraud =
    (landingData) => {
      try {
        if (
          !landingData.has_antifraud
        ) {
          return;
        }

        const bfid =
          "bfid_" +
          Math.random()
            .toString(36)
            .substring(2);

        const clickId =
          "click_" +
          Math.random()
            .toString(36)
            .substring(2);

        localStorage.setItem(
          "bfid",
          bfid
        );

        localStorage.setItem(
          "click_id",
          clickId
        );
      } catch (err) {
        console.error(err);
      }
    };

  /* =========================
     SEND PIN
  ========================= */

  const sendPin =
    async () => {
      if (!msisdn) {
        return alert(
          "Please enter mobile number"
        );
      }

      if (
        loadingRef.current
      )
        return;

      loadingRef.current =
        true;

      setLoading(true);

      setStatusText(
        "Sending OTP..."
      );

      try {
        const params =
          new URLSearchParams(
            {
              offer_id:
                landing.offer_id,

              msisdn,

              geo:
                landing.geo ||
                "",

              carrier:
                landing.carrier ||
                "",

              "x-api-key":
                landing.api_key,

              user_agent:
                navigator.userAgent,

              click_id:
                localStorage.getItem(
                  "click_id"
                ) || "",

              bfid:
                localStorage.getItem(
                  "bfid"
                ) || "",
            }
          );

        const res =
          await fetch(
            `${API_BASE}/api/publisher/pin/send?${params}`
          );

        const data =
          await res.json();

        if (
          data.status ===
            "OTP_SENT" ||
          data.status ===
            "SUCCESS"
        ) {
          setSessionToken(
            data.session_token ||
              ""
          );

          localStorage.setItem(
            "session_token",
            data.session_token ||
              ""
          );

          if (
            data.session_key
          ) {
            localStorage.setItem(
              "sessionKey",
              data.session_key
            );
          }

          setStep("otp");

          setStatusText(
            "OTP Sent Successfully"
          );
        } else if (data.status === "WRONG_CARRIER") {
          setStatusText(
            data.message || "Wrong carrier"
          );
          alert(
            "❌ " + (data.message || "This number is not valid for this offer.")
          );
        } else {
          alert(
            data.message ||
              "OTP Failed"
          );

          setStatusText(
            data.message ||
              "OTP Failed"
          );
        }
      } catch (err) {
        console.error(err);

        alert(
          "Server Error"
        );
      }

      loadingRef.current =
        false;

      setLoading(false);
    };

  /* =========================
     VERIFY OTP
  ========================= */

  const verifyPin =
    async () => {
      const otpValue =
        otp.join("");

      if (
        otpValue.length !==
        otp.length
      ) {
        return alert(
          "Please enter complete OTP"
        );
      }

      if (
        loadingRef.current
      )
        return;

      loadingRef.current =
        true;

      setLoading(true);

      setStatusText(
        "Verifying OTP..."
      );

      try {
        const params =
          new URLSearchParams(
            {
              session_token:
                sessionToken ||
                localStorage.getItem(
                  "session_token"
                ),

              otp: otpValue,

              "x-api-key":
                landing.api_key,

              user_agent:
                navigator.userAgent,
            }
          );

        const res =
          await fetch(
            `${API_BASE}/api/publisher/pin/verify?${params}`
          );

        const data =
          await res.json();

        if (
          data.status ===
          "SUCCESS"
        ) {
          setStatusText(
            "Verification Successful"
          );

          if (
            landing.enable_status_polling ||
            landing.has_status_check
          ) {
            pollStatus();
          } else {
            showSuccessScreen();
          }
        } else {
          alert(
            data.message ||
              "Invalid OTP"
          );

          setStatusText(
            data.message ||
              "Verification Failed"
          );
        }
      } catch (err) {
        console.error(err);

        alert(
          "Verification Error"
        );
      }

      loadingRef.current =
        false;

      setLoading(false);
    };

  /* =========================
     STATUS POLLING
  ========================= */

  const pollStatus =
    async () => {
      let attempts = 0;

      const maxAttempts =
        landing.max_polling_attempts ||
        6;

      const intervalMs =
        (landing.polling_interval_seconds ||
          5) *
        1000;

      pollingRef.current =
        setInterval(
          async () => {
            attempts++;

            try {
              const res =
                await fetch(
                  `${API_BASE}/api/publisher/status/check?session_token=${sessionToken}`
                );

              const data =
                await res.json();

              if (
                data.status ===
                "SUCCESS"
              ) {
                clearInterval(
                  pollingRef.current
                );

                showSuccessScreen();

                return;
              }

              if (
                attempts >=
                maxAttempts
              ) {
                clearInterval(
                  pollingRef.current
                );

                showSuccessScreen();
              }
            } catch (err) {
              clearInterval(
                pollingRef.current
              );

              console.error(
                err
              );
            }
          },
          intervalMs
        );
    };

  /* =========================
     SUCCESS
  ========================= */

  const showSuccessScreen =
    () => {
      if (
        landing.enable_success_screen
      ) {
        setSuccess(true);

        setStep("success");
      } else {
        handleRedirect();
      }
    };

  /* =========================
     REDIRECT
  ========================= */

  const handleRedirect =
    () => {
      if (
        landing.success_redirect_url &&
        landing.success_redirect_url !==
          ""
      ) {
        window.location.assign(
          landing.success_redirect_url
        );

        return;
      }

      if (
        landing.redirect_url
      ) {
        window.location.assign(
          landing.redirect_url
        );

        return;
      }

      if (
        landing.portal_url
      ) {
        window.location.assign(
          landing.portal_url
        );

        return;
      }

      window.location.assign(
        "https://google.com"
      );
    };

  /* =========================
     OTP CHANGE
  ========================= */

  const handleOtpChange = (
    value,
    index
  ) => {
    const clean =
      value.replace(
        /[^0-9]/g,
        ""
      );

    if (
      !clean &&
      value
    )
      return;

    const updated = [
      ...otp,
    ];

    updated[index] =
      clean;

    setOtp(updated);

    if (
      clean &&
      index <
        otp.length - 1
    ) {
      otpRefs.current[
        index + 1
      ]?.focus();
    }
  };

  /* =========================
     RESEND OTP
  ========================= */

  const resendOtp =
    async () => {
      if (
        loadingRef.current
      )
        return;

      if (timer > 0)
        return;

      setTimer(
        landing.resend_timer_seconds ||
          30
      );

      await sendPin();
    };

  /* =========================
     LOADING
  ========================= */

  if (!landing) {
    return (
      <div
        style={
          styles.loadingScreen
        }
      >
        Loading
        Landing...
      </div>
    );
  }

  /* =========================
     MAINTENANCE
  ========================= */

  if (
    landing.maintenance_mode
  ) {
    return (
      <div
        style={
          styles.loadingScreen
        }
      >
        {
          landing.maintenance_message
        }
      </div>
    );
  }

  return (
    <div
      dir={
        landing.rtl_enabled
          ? "rtl"
          : "ltr"
      }
      style={{
        ...styles.page,

        backgroundImage:
          landing.background_url
            ? `url(${landing.background_url})`
            : "linear-gradient(135deg,#020617,#111827)",

        color:
          landing.text_color ||
          "#ffffff",

        fontFamily:
          landing.font_family ||
          "Inter",
      }}
    >
      {/* OVERLAY */}

      <div
        style={{
          ...styles.overlay,

          background:
            landing.background_overlay ||
            "rgba(0,0,0,0.45)",

          backdropFilter:
            landing.background_blur
              ? "blur(8px)"
              : "none",
        }}
      />

      {/* CARD */}

      <div
        style={{
          ...styles.card,

          background:
            landing.card_color &&
            landing.card_color.startsWith(
              "#"
            )
              ? `${landing.card_color}20`
              : "rgba(255,255,255,0.08)",

          borderRadius:
            landing.card_radius ||
            24,
        }}
      >
        {/* BADGE */}

        {landing.show_secure_badge && (
          <div
            style={{
              ...styles.badge,

              background:
                landing.theme_color ||
                "#22c55e",
            }}
          >
            ✓ SECURE VERIFIED
            CONNECTION
          </div>
        )}

        {/* LOGO */}

        {landing.logo_url && (
          <img
            src={
              landing.logo_url
            }
            alt={
              landing.logo_alt ||
              "logo"
            }
            style={
              styles.logo
            }
          />
        )}

        {/* HERO */}

        {landing.image_url && (
          <img
            src={
              landing.image_url
            }
            alt=""
            style={
              styles.hero
            }
          />
        )}

        {/* TITLE */}

        <h1
          style={
            styles.title
          }
        >
          {landing.title}
        </h1>

        {landing.subtitle && (
          <p
            style={
              styles.subtitle
            }
          >
            {
              landing.subtitle
            }
          </p>
        )}

        <p
          style={
            styles.description
          }
        >
          {
            landing.description
          }
        </p>

        {/* META */}

        <div
          style={styles.meta}
        >
          {landing.show_geo &&
            landing.geo && (
              <div
                style={
                  styles.metaBadge
                }
              >
                🌍{" "}
                {landing.geo}
              </div>
            )}

          {landing.show_carrier_logo &&
            landing.carrier && (
              <div
                style={
                  styles.metaBadge
                }
              >
                📶{" "}
                {
                  landing.carrier
                }
              </div>
            )}
        </div>

        {/* MSISDN */}

        {step ===
          "msisdn" && (
          <>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="Enter Mobile Number"
              value={msisdn}
              onChange={(
                e
              ) =>
                setMsisdn(
                  e.target.value.replace(
                    /[^0-9]/g,
                    ""
                  )
                )
              }
              style={
                styles.input
              }
            />

            <button
              onClick={
                sendPin
              }
              disabled={
                loading
              }
              style={{
                ...styles.button,

                background:
                  landing.theme_color ||
                  "#22c55e",

                borderRadius:
                  landing.button_radius ||
                  12,

                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",

                opacity:
                  loading
                    ? 0.7
                    : 1,

                transition:
                  "all 0.2s ease",
              }}
            >
              {loading
                ? "Sending..."
                : landing.button_text ||
                  "Continue"}
            </button>
          </>
        )}

        {/* OTP */}

        {step ===
          "otp" && (
          <>
            <div
              style={
                styles.otpContainer
              }
            >
              {otp.map(
                (
                  digit,
                  index
                ) => (
                  <input
                    key={
                      index
                    }
                    ref={(
                      el
                    ) =>
                      (otpRefs.current[
                        index
                      ] = el)
                    }
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={
                      1
                    }
                    value={
                      digit
                    }
                    onChange={(
                      e
                    ) =>
                      handleOtpChange(
                        e.target
                          .value,
                        index
                      )
                    }
                    onKeyDown={(
                      e
                    ) => {
                      if (
                        e.key ===
                          "Backspace" &&
                        !otp[
                          index
                        ] &&
                        index >
                          0
                      ) {
                        otpRefs.current[
                          index -
                            1
                        ]?.focus();
                      }
                    }}
                    onPaste={(
                      e
                    ) => {
                      const pasted =
                        e.clipboardData
                          .getData(
                            "text"
                          )
                          .replace(
                            /[^0-9]/g,
                            ""
                          );

                      if (
                        !pasted
                      )
                        return;

                      const updated =
                        [
                          ...otp,
                        ];

                      pasted
                        .split(
                          ""
                        )
                        .slice(
                          0,
                          otp.length
                        )
                        .forEach(
                          (
                            digit,
                            i
                          ) => {
                            updated[
                              i
                            ] =
                              digit;
                          }
                        );

                      setOtp(
                        updated
                      );

                      e.preventDefault();
                    }}
                    style={{
                      ...styles.otpInput,

                      borderRadius:
                        landing.otp_box_style ===
                        "rounded"
                          ? 999
                          : 14,
                    }}
                  />
                )
              )}
            </div>

            <button
              onClick={
                verifyPin
              }
              disabled={
                loading
              }
              style={{
                ...styles.button,

                background:
                  landing.theme_color ||
                  "#22c55e",

                borderRadius:
                  landing.button_radius ||
                  12,

                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",

                opacity:
                  loading
                    ? 0.7
                    : 1,

                transition:
                  "all 0.2s ease",
              }}
            >
              {loading
                ? "Verifying..."
                : landing.verify_button_text ||
                  "Confirm"}
            </button>

            {landing.enable_resend_otp && (
              <div
                style={
                  styles.timer
                }
              >
                {timer >
                0 ? (
                  <>
                    Resend
                    OTP in{" "}
                    {
                      timer
                    }
                    s
                  </>
                ) : (
                  <button
                    onClick={
                      resendOtp
                    }
                    style={
                      styles.resendButton
                    }
                  >
                    Resend
                    OTP
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* SUCCESS */}

        {step ===
          "success" && (
          <div
            style={
              styles.successBox
            }
          >
            <div
              style={
                styles.successIcon
              }
            >
              ✓
            </div>

            <h2>
              {landing.success_title ||
                "Subscription Successful"}
            </h2>

            <p>
              {landing.success_message}
            </p>

            {landing.enable_redirect && (
              <div
                style={
                  styles.redirectText
                }
              >
                Redirecting
                in{" "}
                {
                  redirectCounter
                }
                s...
              </div>
            )}
          </div>
        )}

        {/* STATUS */}

        {statusText && (
          <div
            style={
              styles.status
            }
          >
            {statusText}
          </div>
        )}

        {/* DISCLAIMER */}

        {landing.show_disclaimer && (
          <div
            style={
              styles.disclaimer
            }
          >
            {
              landing.disclaimer
            }
          </div>
        )}

        {/* POWERED */}

        {landing.show_powered_by && (
          <div
            style={
              styles.powered
            }
          >
            Powered by
            Mob13r
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  page: {
    minHeight: "100vh",

    backgroundSize:
      "cover",

    backgroundPosition:
      "center",

    display: "flex",

    justifyContent:
      "center",

    alignItems: "center",

    padding: 20,

    position: "relative",

    overflow: "hidden",
  },

  overlay: {
    position: "absolute",

    inset: 0,
  },

  card: {
    width: "100%",

    maxWidth: 420,

    minWidth: 320,

    padding: 28,

    position: "relative",

    zIndex: 5,

    backdropFilter:
      "blur(24px)",

    WebkitBackdropFilter:
      "blur(24px)",

    border:
      "1px solid rgba(255,255,255,0.12)",

    boxShadow:
      "0 20px 60px rgba(0,0,0,0.45)",
  },

  badge: {
    display:
      "inline-flex",

    padding:
      "8px 14px",

    borderRadius: 999,

    color: "#fff",

    fontSize: 11,

    fontWeight: 700,

    marginBottom: 18,
  },

  logo: {
    width: 90,

    height: 90,

    objectFit:
      "cover",

    borderRadius: 20,

    marginBottom: 20,
  },

  hero: {
    width: "100%",

    height: 220,

    objectFit:
      "cover",

    borderRadius: 18,

    marginBottom: 20,
  },

  title: {
    fontSize: 30,

    fontWeight: 800,

    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,

    opacity: 0.85,

    marginBottom: 12,
  },

  description: {
    opacity: 0.85,

    lineHeight: 1.7,

    marginBottom: 20,
  },

  meta: {
    display: "flex",

    gap: 10,

    flexWrap:
      "wrap",

    marginBottom: 22,
  },

  metaBadge: {
    padding:
      "8px 14px",

    borderRadius: 999,

    background:
      "rgba(255,255,255,0.08)",

    fontSize: 13,
  },

  input: {
    width: "100%",

    padding: 16,

    borderRadius: 16,

    border:
      "1px solid rgba(255,255,255,0.1)",

    background:
      "rgba(255,255,255,0.08)",

    color: "#fff",

    outline: "none",

    marginBottom: 18,

    fontSize: 15,

    boxSizing:
      "border-box",
  },

  button: {
    width: "100%",

    padding: 16,

    border: "none",

    color: "#fff",

    fontWeight: 700,

    fontSize: 15,
  },

  otpContainer: {
    display: "flex",

    justifyContent:
      "center",

    gap: 10,

    marginBottom: 20,
  },

  otpInput: {
    width: 58,

    height: 58,

    textAlign:
      "center",

    fontSize: 24,

    fontWeight: 700,

    border:
      "1px solid rgba(255,255,255,0.12)",

    background:
      "rgba(255,255,255,0.08)",

    color: "#fff",

    outline: "none",
  },

  timer: {
    marginTop: 16,

    textAlign:
      "center",

    opacity: 0.8,
  },

  resendButton: {
    background:
      "transparent",

    border: "none",

    color: "#22c55e",

    fontWeight: 700,

    cursor: "pointer",
  },

  successBox: {
    textAlign: "center",

    paddingTop: 20,
  },

  successIcon: {
    width: 90,

    height: 90,

    borderRadius:
      "50%",

    background:
      "#22c55e",

    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize: 40,

    fontWeight: 800,

    margin:
      "0 auto 20px",
  },

  redirectText: {
    marginTop: 20,

    opacity: 0.75,
  },

  status: {
    marginTop: 18,

    fontSize: 13,

    opacity: 0.75,

    textAlign:
      "center",
  },

  disclaimer: {
    marginTop: 24,

    fontSize: 11,

    opacity: 0.65,

    lineHeight: 1.6,
  },

  powered: {
    marginTop: 16,

    textAlign:
      "center",

    fontSize: 12,

    opacity: 0.55,
  },

  loadingScreen: {
    minHeight: "100vh",

    background:
      "#020617",

    display: "flex",

    justifyContent:
      "center",

    alignItems:
      "center",

    color: "#fff",

    fontSize: 18,
  },
};
