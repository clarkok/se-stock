'use strict';

let Promise = require('bluebird');

class Trading {
    constructor(db) {
        this.db = db;
        this.listener = [];
    }

    makeBuying(buying_id) {
        return this.db.getInstructionById(id)
            .then((buying_inst) => Promise.all([
                Promise.resolve(buying_inst),
                this.db.getAllSellingInstructions(buying_inst.stock),
                this.db.getStockState(buying_inst.stock)
            ]))
            .then((result) => {
                let [buying_inst, selling_insts, state] = result;

                if (state.state != 'normal') { return; }

                let i = 0;
                while (i < selling_insts.length && selling_insts[i].price > buying_inst.price) {
                    ++i;
                }
                if (i >= selling_insts.length) { return; }

                let selling_inst = selling_insts[i];
                let price = (selling_inst.price + buying_inst.price) / 2;
                let amount = Math.min(selling_inst.amount, buying_inst.amount);

                return this.db.makeTrade(buying_inst.id, selling_inst.id, amount, price)
                    .then(() => this.listener.forEach((listener) => listener(buying_inst, selling_inst, amount, price)));
            })
            .catch((e) => {
                console.err(e);
                console.err(e.stack);
            });
    }

    makeSelling(selling_id) {
        return this.db.getInstructionById(id)
            .then((selling_id) => Promise.all([
                Promise.resolve(selling_id),
                this.db.getAllBuyingInstructions(selling_inst.stock),
                this.db.getStockState(selling_inst.stock)
            ]))
            .then((result) => {
                let [selling_inst, buying_insts, state] = result;

                if (state.state != 'normal') { return; }

                let i = 0;
                while (i < buying_insts.length && buying_insts[i].price < selling_inst.price) {
                    ++i;
                }
                if (i >= selling_insts.length) { return; }

                let buying_inst = buying_insts[i];
                let price = (selling_inst.price + buying_inst.price) / 2;
                let amount = Math.min(selling_inst.amount, buying_inst.amount);
                
                return this.db.makeTrade(buying_inst.id, selling_inst.id, amount, price)
                    .then(() => this.listener.forEach((listener) => listener(buying_inst, selling_inst, amount, price)));
            })
            .catch((e) => {
                console.err(e);
                console.err(e.stack);
            });
    }

    addTradingListener(listener) {
        this.listener.push(listener);
    }

    removeTradingListener(listener) {
        this.listener = this.listener.filter((l) => l != listener);
    }
}

module.exports = Trading;
