// Which proxies' X-Forwarded-For we believe.
//
// Traffic reaches Node as: client -> Cloudflare edge -> load balancer / nginx
// -> Node, so X-Forwarded-For looks like "<client>, <cloudflare edge>".
// "trust proxy = 1" resolves req.ip to the Cloudflare edge for everyone (so
// every rate limit was keyed on Cloudflare, not on the visitor), and any
// hop count also lets someone who reaches the origin directly forge their IP.
// Naming the trusted networks fixes both: private ranges (the LB/nginx) plus
// Cloudflare's published edge ranges. If Cloudflare ever adds a range that is
// missing here, that traffic simply resolves to the edge IP (the old
// behaviour) until the list is updated.
//
// Source: https://www.cloudflare.com/ips-v4 and /ips-v6 (last updated Sep 2023)
export const CLOUDFLARE_RANGES = [
  // IPv4
  "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "104.16.0.0/13",
  "104.24.0.0/14", "108.162.192.0/18", "131.0.72.0/22", "141.101.64.0/18",
  "162.158.0.0/15", "172.64.0.0/13", "173.245.48.0/20", "188.114.96.0/20",
  "190.93.240.0/20", "197.234.240.0/22", "198.41.128.0/17",
  // IPv6
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
  "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
];

export const TRUSTED_PROXIES = ["loopback", "linklocal", "uniquelocal", ...CLOUDFLARE_RANGES];
