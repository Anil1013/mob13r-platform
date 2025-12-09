import React from "react";

export default function ApiDocs() {
  const base = "https://backend.mob13r.com";

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Publisher API Documentation</h1>

      {/* SECTION: INTRO */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <p className="text-gray-600 dark:text-gray-300">
          This document describes the APIs a publisher will use to send traffic,
          trigger INAPP flows (PIN), verify OTP, check status, and redirect users
          to operator subscription portals.
        </p>
      </div>

      {/* SECTION: CLICK URL */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">1. Click API (Traffic Redirect)</h2>

        <p className="text-gray-500 mb-2">
          This URL is automatically generated from the dashboard inside the
          <strong> Traffic Distribution → Tracking Links </strong> section.
        </p>

        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto">
GET {base}/click?pub_id=PUB05&geo=IQ&carrier=Zain&click_id=123
        </pre>

        <p className="mt-2 text-gray-500">Optional parameters:</p>

        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto">
sub1, sub2, sub3, sub4, sub5, msisdn, device, ua, ip
        </pre>
      </div>

      {/* SECTION: INAPP PIN FLOW */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">2. INAPP PIN Subscription Flow</h2>

        <p className="text-gray-500 mb-3">
          These URLs are generated automatically when you create an INAPP
          tracking link for a publisher.
        </p>

        <h3 className="font-semibold">Send PIN</h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm mb-4">
GET {base}/inapp/sendpin?pub_id=PUB05&msisdn=&lt;msisdn&gt;&user_ip=&lt;ip&gt;&ua=&lt;ua&gt;
        </pre>

        <h3 className="font-semibold">Verify PIN</h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm mb-4">
GET {base}/inapp/verifypin?pub_id=PUB05&msisdn=&lt;msisdn&gt;&pin=&lt;otp&gt;&user_ip=&lt;ip&gt;&ua=&lt;ua&gt;
        </pre>

        <h3 className="font-semibold">Check Status</h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm mb-4">
GET {base}/inapp/checkstatus?pub_id=PUB05&msisdn=&lt;msisdn&gt;
        </pre>

        <h3 className="font-semibold">Portal URL</h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm mb-4">
GET {base}/inapp/portal?pub_id=PUB05
        </pre>
      </div>

      {/* SECTION: resolve */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">3. Offer Resolve API</h2>

        <p className="text-gray-500 mb-3">
          Publisher can check which offer will fire for a click.
        </p>

        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm">
GET {base}/api/distribution/resolve?pub_id=PUB05&tracking_link_id=3&geo=IQ&carrier=Zain
        </pre>

      </div>
    </div>
  );
}
