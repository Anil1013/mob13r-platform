// services/offers.js

export const getOffers = async () => {
  // future: return fetch("/api/offers").then(res => res.json())
  return [
    {
      id: "OFF-1001",
      name: "Shemaroo Weekly Pack",
      advertiser: "Shemaroo",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.5,
      revenue: 1.2,
      status: "Active",
      method: "POST",
    },
    {
      id: "OFF-1002",
      name: "Zain Sports Bundle",
      advertiser: "Zain",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.7,
      revenue: 1.5,
      status: "Paused",
      method: "GET",
    },
  ];
};

export const saveOffer = async (offer) => {
  console.log("Saving offer:", offer);
  // future: POST / PUT API
  return true;
};
