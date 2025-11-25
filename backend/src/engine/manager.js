import exchanges from "./exchanges.js";
const { User, Market } = exchanges;

class Manager {
  constructor() {
    this.markets = new Map();
  }

  getMarket(marketId) {
    if (!this.markets.has(marketId)) {
      this.markets.set(marketId, new Market());
    }
    return this.markets.get(marketId);
  }

  addUserToMarket(marketId, userId, balance = 1000) {
    const market = this.getMarket(marketId);
    if (!market.users.has(userId)) {
      market.addUser(new User(userId, balance));
    }
  }
}

export default new Manager();
