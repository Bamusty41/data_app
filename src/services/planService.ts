import { Provider, Network } from '../types/enums';

export interface PricingPlan {
  provider: Provider;
  network: Network;
  planId: string;
  providerCost: number;
  sellPrice: number;
  markup: number;
}

const pricingStore = new Map<string, PricingPlan>();

function pricingKey(provider: Provider, network: Network, planId: string) {
  return `${provider}:${network}:${planId}`;
}

function computeMarkup(providerCost: number, sellPrice: number) {
  if (providerCost <= 0) return 0;
  return Number((((sellPrice - providerCost) / providerCost) * 100).toFixed(2));
}

export function initializeDefaultPricing() {
  if (pricingStore.size > 0) return;

  [Provider.INLOMAX, Provider.HUSMODATA].forEach((provider) => {
    ['MTN', 'AIRTEL', 'GLO', 'NINE_MOBILE'].forEach((network) => {
      const defaultPlans = ['1.5GB', '3.5GB', '5GB'];
      defaultPlans.forEach((planId, index) => {
        const providerCost = 1000 + index * 900;
        const sellPrice = Number((providerCost * 1.23).toFixed(2));
        pricingStore.set(pricingKey(provider, network as Network, planId), {
          provider,
          network: network as Network,
          planId,
          providerCost,
          sellPrice,
          markup: computeMarkup(providerCost, sellPrice),
        });
      });
    });
  });
}

export function getPricingPlans() {
  initializeDefaultPricing();
  return Array.from(pricingStore.values()).sort((a, b) => {
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    if (a.network !== b.network) return a.network.localeCompare(b.network);
    return a.planId.localeCompare(b.planId);
  });
}

export function getPricingPlan(provider: Provider, network: Network, planId: string) {
  initializeDefaultPricing();
  return pricingStore.get(pricingKey(provider, network, planId));
}

export function updatePricingPlan(update: Omit<PricingPlan, 'markup'> & { markup?: number }) {
  initializeDefaultPricing();
  const key = pricingKey(update.provider, update.network, update.planId);
  const providerCost = update.providerCost;
  const sellPrice = update.sellPrice;
  if (providerCost <= 0 || sellPrice <= 0) {
    throw new Error('providerCost and sellPrice must be greater than zero');
  }
  const plan = {
    provider: update.provider,
    network: update.network,
    planId: update.planId,
    providerCost,
    sellPrice,
    markup: computeMarkup(providerCost, sellPrice),
  };
  pricingStore.set(key, plan);
  return plan;
}

export function isPlanValid(network: Network, planId: string) {
  initializeDefaultPricing();
  return Array.from(pricingStore.values()).some((plan) => plan.network === network && plan.planId === planId);
}

export function getPlanByNetworkAndId(network: Network, planId: string) {
  initializeDefaultPricing();
  return Array.from(pricingStore.values()).find((plan) => plan.network === network && plan.planId === planId);
}
