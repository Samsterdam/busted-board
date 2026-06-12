import type { AdProvider } from "../types";

/**
 * Amazon Publisher Services — Transparent Ad Marketplace (TAM/APS).
 * Provides a competing bid stream that's typically merged with GAM/Prebid.
 * On its own it places no inline element, so slots resolve to "none".
 */
export const amazonTam: AdProvider = {
  id: "amazon-tam",
  name: "Amazon Publisher Services (TAM)",
  kind: "header-bidding",
  note: "apstag bids; combine with Google Ad Manager or Prebid to render.",
  envKeys: ["NEXT_PUBLIC_AMAZON_TAM_PUB_ID"],
  isConfigured: (env) => Boolean(env.NEXT_PUBLIC_AMAZON_TAM_PUB_ID),
  getScripts: (env) => [
    {
      id: "apstag-init",
      strategy: "afterInteractive",
      inlineHtml: `!function(a9,a,p,s,t,A,g){if(a[a9])return;function q(c,r){a[a9]._Q.push([c,r])}a[a9]={init:function(){q("i",arguments)},fetchBids:function(){q("f",arguments)},setDisplayBids:function(){},targetingKeys:function(){return[]},_Q:[]};A=p.createElement(s);A.async=!0;A.src=t;g=p.getElementsByTagName(s)[0];g.parentNode.insertBefore(A,g)}("apstag",window,document,"script","//c.amazon-adsystem.com/aax2/apstag.js");
    window.apstag.init({ pubID: "${env.NEXT_PUBLIC_AMAZON_TAM_PUB_ID}", adServer: "googletag", simplerGPT: true });`,
    },
  ],
  getSlotSpec: () => ({ kind: "none" }),
};
