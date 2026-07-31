import { Provider } from '../../types/enums';
import { IVtuProvider, VtuProviderResponse } from './IVtuProvider';
import { InlomaxProvider } from './inlomaxProvider';
import { HusmodataProvider } from './husmodataProvider';

const providers = new Map<Provider, IVtuProvider>([
  [Provider.INLOMAX, new InlomaxProvider()],
  [Provider.HUSMODATA, new HusmodataProvider()],
]);

export class VTUServiceFactory {
  static getProvider(name: Provider): IVtuProvider {
    const provider = providers.get(name);
    if (!provider) throw new Error(`Unsupported provider: ${name}`);
    return provider;
  }

  static getFallbackProvider(current: Provider): IVtuProvider {
    const fallbackName = current === Provider.INLOMAX ? Provider.HUSMODATA : Provider.INLOMAX;
    return this.getProvider(fallbackName);
  }
}

export type VTUPurchaseResponse = VtuProviderResponse;
