import { Provider } from '../../types/enums';
import { IVTUProvider } from './vtuProvider.interface';
import { InlomaxProvider } from './inlomaxProvider';
import { HusmodataProvider } from './husmodataProvider';

export class VTUServiceFactory {
  private static providers: Map<Provider, IVTUProvider> = new Map<Provider, IVTUProvider>([
    [Provider.INLOMAX, new InlomaxProvider()],
    [Provider.HUSMODATA, new HusmodataProvider()],
  ]);

  /**
   * Returns a specific provider instance by name.
   */
  static getProvider(name: Provider): IVTUProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' is not supported`);
    }
    return provider;
  }

  /**
   * Returns the default provider or alternate provider for failover.
   */
  static getFallbackProvider(currentProvider: Provider): IVTUProvider {
    const fallback = currentProvider === Provider.INLOMAX ? Provider.HUSMODATA : Provider.INLOMAX;
    return this.getProvider(fallback);
  }
}
