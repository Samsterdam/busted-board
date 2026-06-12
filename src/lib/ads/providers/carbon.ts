import type { AdProvider } from "../types";

/**
 * Carbon Ads — single, tasteful unit aimed at design/dev/tech audiences.
 * The script must live inside the slot element it renders into, so Carbon
 * is rendered as a per-slot script rather than a global one.
 */
export const carbon: AdProvider = {
  id: "carbon",
  name: "Carbon Ads",
  kind: "direct",
  note: "One curated unit for tech audiences. Renders inline via #carbonads.",
  envKeys: ["NEXT_PUBLIC_CARBON_SERVE", "NEXT_PUBLIC_CARBON_PLACEMENT"],
  isConfigured: (env) =>
    Boolean(env.NEXT_PUBLIC_CARBON_SERVE && env.NEXT_PUBLIC_CARBON_PLACEMENT),
  // Carbon's tag is injected into the slot element, so there's no global script.
  getScripts: () => [],
  getSlotSpec: (slot, env) => {
    if (slot !== "sidebar") return null; // Carbon is best as a single sidebar unit
    const serve = env.NEXT_PUBLIC_CARBON_SERVE;
    const placement = env.NEXT_PUBLIC_CARBON_PLACEMENT;
    if (!serve || !placement) return null;
    return {
      kind: "div",
      id: "carbon-host",
      onMount: `(function(){ var d=document.getElementById('carbon-host'); if(!d||d.querySelector('#_carbonads_js'))return; var s=document.createElement('script'); s.async=true; s.id='_carbonads_js'; s.src='https://cdn.carbonads.com/carbon.js?serve=${serve}&placement=${placement}'; d.appendChild(s); })();`,
    };
  },
};
