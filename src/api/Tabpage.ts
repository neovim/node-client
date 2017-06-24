import { BaseApi } from "./Base";
import { createChainableApi } from "./helpers/createChainableApi";
import { Window } from "./Window";

export class Tabpage extends BaseApi {

  get windows(): Promise<Array<Window>> {
    return this.request(`${this.prefix}list_wins`, [this]);
  }

  get window(): Promise<Window> {
    // Require is here otherwise we get circular refs
    return createChainableApi.call(this, "Window", Window, () =>
      this.request(`${this.prefix}get_win`, [this])
    );
  }

  // Is current tabpage valid
  get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  // Tabpage number
  get number(): Promise<number> {
    return this.request(`${this.prefix}get_number`, [this]);
  }

  getOption(): void {
    this.logger.error("Tabpage does not have `getOption`");
  }
  setOption(): void {
    this.logger.error("Tabpage does not have `setOption`");
  }
}
