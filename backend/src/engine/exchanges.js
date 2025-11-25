class User {
  constructor(id, balance = 1000) {
    this.id = id;
    this.balance = balance;
    this.locked = 0;
  }
  lock(amount) {
    if (amount > this.balance) throw new Error("Not enough balance");
    this.balance -= amount;
    this.locked += amount;
  }
  release(amount) {
    this.locked -= amount;
    this.balance += amount;
  }
  consume(amount) {
    this.locked -= amount;
  }
}

class Offer {
  constructor(offerId, layerId, stake, odds) {
    this.offerId = offerId;
    this.layerId = layerId;
    this.remaining = stake;
    this.odds = odds;
  }
}

class Match {
  constructor(backerId, layerId, stake, odds) {
    this.backerId = backerId;
    this.layerId = layerId;
    this.stake = stake;
    this.odds = odds;
  }
}

class Market {
  constructor(capFraction = 0.3) {
    this.users = new Map();
    this.orderbook = new Map(); // odds: Offer[]
    this.sortedOdds = []; // [3.0, 2.2, 2.0]
    this.liability = 0;
    this.capFraction = capFraction;
    this.matches = [];
  }

  addUser(user) {
    this.users.set(user.id, user);
  }

  placeLayer(id, stake, odds, offerId = null) {
    const user = this.users.get(id);
    if (!user) throw new Error(`unknown user ${id}`);

    const liability = (odds - 1) * stake;

    user.lock(liability);

    if (!this.orderbook.has(odds)) {
      this.orderbook.set(odds, []);
      this.sortedOdds.push(Number(odds));
      this.sortedOdds.sort((a, b) => b - a);
    }

    // create engine Offer using the offerId if present
    const offerObj = new Offer(offerId, id, stake, odds);
    this.orderbook.get(odds).push(offerObj);
    this.liability += liability;
  }

  placeBack(id, stake) {
    const backer = this.users.get(id);
    const cap = this.liability * this.capFraction;

    const usable = Math.min(stake, cap);
    if (usable <= 0) throw new Error("No liquidity");

    backer.lock(usable);

    let remaining = usable;

    for (const odds of [...this.sortedOdds]) {
      const bucket = this.orderbook.get(odds);
      if (!bucket) continue;

      for (let i = 0; i < bucket.length && remaining > 0; i++) {
        const offer = bucket[i];
        const take = Math.min(offer.remaining, remaining);

        this.matches.push(new Match(id, offer.layerId, take, odds));

        offer.remaining -= take;
        remaining -= take;

        const layer = this.users.get(offer.layerId);
        layer.consume((odds - 1) * take);

        this.liability -= (odds - 1) * take;

        if (offer.remaining === 0) {
          bucket.splice(i, 1);
          i--;
        }
      }

      if (bucket.length === 0) {
        this.orderbook.delete(odds);
        this.sortedOdds = this.sortedOdds.filter((o) => o !== odds);
      }
    }

    if (remaining > 0) backer.release(remaining);
  }

  settle(backersWin) {
    for (const m of this.matches) {
      const backer = this.users.get(m.backerId);
      const layer = this.users.get(m.layerId);

      if (backersWin) {
        const payout = m.stake * m.odds;
        backer.release(m.stake);
        backer.balance += payout - m.stake;
      } else {
        layer.balance += m.stake;
        backer.consume(m.stake);
      }
    }

    this.matches = [];

    for (const u of this.users.values()) {
      if (u.locked > 0) u.release(u.locked);
    }
  }
}

export default { User, Offer, Match, Market };
