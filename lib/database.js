'use strict';

let Promise = require('bluebird');
let moment = require('moment');
let checkArgTypes = require('check-arg-types');

const INST_TABLE_NAME = 'instructions';
const OPER_TABLE_NAME = 'operation';
const STATE_TABLE_NAME = 'stock_state';

class Database {
    constructor(connection) {
        this.db = require('knex')({
            client : 'mysql',
            connection
        });

        this._fetchInstructionResult = (rows) => {
            if (Array.isArray(rows)) {
                rows.forEach((inst) => { inst.price = this._loadPrice(inst.price); });
            }
            else {
                rows.price = this._loadPrice(rows.price);
            }
            return Promise.resolve(rows);
        }

        this._fetchOperationResult = (rows) => {
            if (Array.isArray(rows)) {
                rows.forEach((oper) => { oper.price = this._loadPrice(oper.price); });
            }
            else {
                rows.price = this._loadPrice(rows.price);
            }
            return Promise.resolve(rows);
        }
    }

    _storeCurrentTime() {
        checkArgTypes(arguments, []);
        return moment().format('YYYY-MM-DD hh:mm:ss');
    }

    _storePrice(price) {
        checkArgTypes(arguments, ['number']);
        return (price * 100 + 0.5) | 0;
    }

    _loadPrice(price) {
        checkArgTypes(arguments, ['number']);
        return (price / 100.0);
    }

    _promiseAllInstructions() {
        checkArgTypes(arguments, []);
        return this.db(INST_TABLE_NAME);
    }

    _promiseAllOperations() {
        checkArgTypes(arguments, []);
        return this.db(OPER_TABLE_NAME);
    }

    getAllInstructions() {
        checkArgTypes(arguments, []);
        return this._promiseAllInstructions().then(this._fetchInstructionResult);
    }

    getInstructionById(id) {
        checkArgTypes(arguments, ['number']);
        return this._promiseAllInstructions()
            .where('id', id)
            .then(this._fetchInstructionResult)
            .then((insts) => {
                if (insts.length != 1) {
                    throw new Error(`cannot find instruction by id ${id}`);
                }
                return Promise.resolve(insts[0]);
            });
    }
    
    getAllBuyingInstructions(stock) {
        checkArgTypes(arguments, ['string']);
        return this._promiseAllInstructions()
            .where({
                is_buying: 1,
                stock
            })
            .where('amount', '>', 0)
            .orderBy('price', 'desc')
            .then(this._fetchInstructionResult);
    }

    getAllSellingInstructions(stock) {
        checkArgTypes(arguments, ['string']);
        return this._promiseAllInstructions()
            .where({
                is_buying: 0,
                stock
            })
            .where('amount', '>', 0)
            .orderBy('price')
            .then(this._fetchInstructionResult);
    }

    makeTrade(state_id, buying_id, selling_id, amount, price) {
        checkArgTypes(arguments, ['number', 'number', 'number', 'number', 'number']);

        return this.db.transaction((trx) => {
            return Promise.map([buying_id, selling_id], (id) => this.getInstructionById(id))
                .then((insts_array) => {
                    let buying_inst = insts_array[0],
                        selling_inst = insts_array[1];

                    if (buying_inst.stock != selling_inst.stock) {
                        throw new Error(`buying ${buying_inst.stock} but selling ${selling_inst.stock}`);
                    }

                    let stock = buying_inst.stock;

                    return this.getStockState(stock).then((state) => {
                        if (state_id != state.id) {
                            throw new Error('state id not matched');
                        }

                        if (buying_inst.amount < amount) {
                            throw new Error('buying instruction dose not require so much stocks');
                        }

                        if (buying_inst.is_cancelled) {
                            throw new Error('buying instruction is cancelled');
                        }

                        if (selling_inst.amount < amount) {
                            throw new Error('selling instruction dose not have enough stocks');
                        }

                        if (selling_inst.is_cancelled) {
                            throw new Error('selling instruction is cancelled');
                        }

                        if (state.state != 'normal') {
                            throw new Error('stock not in normal state');
                        }

                        if (price > state.surging_price) {
                            return trx(STATE_TABLE_NAME).where('stock', stock).update('state', 'surged');
                        }

                        if (price < state.decline_price) {
                            return trx(STATE_TABLE_NAME).where('stock', stock).update('state', 'declined');
                        }

                        return Promise.all([
                            trx(INST_TABLE_NAME).where('id', buying_id).decrement('amount', amount),
                            trx(INST_TABLE_NAME).where('id', selling_id).decrement('amount', amount),
                            trx(OPER_TABLE_NAME).insert({
                                time : this._storeCurrentTime(),
                                buying_id,
                                selling_id,
                                amount,
                                price : this._storePrice(price),
                                stock
                            }),
                            trx(STATE_TABLE_NAME).where('stock', stock).increment('amount', amount),
                            (price > state.highest_price) 
                                ? trx(STATE_TABLE_NAME)
                                    .where('stock', stock)
                                    .update('highest_price', this._storePrice(price))
                                : Promise.resolve(),
                            (price < state.lowest_price)
                                ? trx(STATE_TABLE_NAME)
                                    .where('stock', stock)
                                    .update('lowest_price', this._storePrice(price))
                                : Promise.resolve(),
                            (state.opening_price === 0.0)
                                ? trx(STATE_TABLE_NAME)
                                    .where('stock', stock)
                                    .update('opening_price', this._storePrice(price))
                                : Promise.resolve()
                        ]);
                    })
                })
        });
    }

    _insertIntoTable(data) {
        data = Object.assign(
            {
                time : this._storeCurrentTime(),
                is_cancelled : 0
            },
            data
        );
        return this.db(INST_TABLE_NAME).insert(data);
    }

    commitBuyingInstruction(token, stock, price, amount) {
        checkArgTypes(arguments, ['string', 'string', 'number', 'number']);

        price = this._storePrice(price);
        return this._insertIntoTable({
                token,
                stock,
                price,
                amount,
                original : amount,
                is_buying : 1
            })
            .then((ids) => Promise.resolve(ids[0]));
    }

    commitSellingInstruction(token, stock, price, amount) {
        checkArgTypes(arguments, ['string', 'string', 'number', 'number']);

        price = this._storePrice(price);
        return this._insertIntoTable({
                token,
                stock,
                price,
                amount,
                original : amount,
                is_buying : 0
            })
            .then((ids) => Promise.resolve(ids[0]));
    }

    cancelInstruction(id) {
        checkArgTypes(arguments, ['number']);

        return this.getInstructionById(id)
            .then((inst) => {
                if (inst.amount != inst.original) {
                    throw new Error(`instruction not cancellable`);
                }
                return this.db(INST_TABLE_NAME).where('id', id).update('is_cancelled', 1)
            });
    }

    queryOperationByStock(stock) {
        checkArgTypes(arguments, ['string']);

        return this._promiseAllOperations().where('stock', stock).then(this._fetchOperationResult);
    }

    queryLastOperation(stock) {
        checkArgTypes(arguments, ['string']);

        return this._promiseAllOperations().where('stock', stock).orderBy('id', 'desc').limit(1)
            .then((ops) => {
                if (ops.length == 0) {
                    throw new Error('no operations found');
                }
                return Promise.resolve(ops[0]);
            })
            .then(this._fetchOperationResult);
    }

    queryAllOperationStocks() {
        checkArgTypes(arguments, []);

        return this.db(OPER_TABLE_NAME).select('stock').groupBy('stock')
            .then((rows) => Promise.resolve(rows.map((row) => row.stock)))
    }

    insertStockState(stock, closing_price, surging_price, decline_price) {
        checkArgTypes(arguments, ['string', 'number', 'number', 'number']);

        closing_price = this._storePrice(closing_price);
        surging_price = this._storePrice(surging_price);
        decline_price = this._storePrice(decline_price);

        return this.db(STATE_TABLE_NAME).insert({
            stock,
            state: 'normal',
            closing_price,
            opening_price : 0,
            highest_price : closing_price,
            lowest_price : closing_price,
            surging_price,
            decline_price,
            last_price : closing_price
        })
            .then((ids) => Promise.resolve(ids[0]));
    }

    getAllStockState() {
        checkArgTypes(arguments, []);

        return this.db(STATE_TABLE_NAME)
            .then((rows) => {
                rows.forEach((state) => {
                    state.closing_price = this._loadPrice(state.closing_price);
                    state.highest_price = this._loadPrice(state.highest_price);
                    state.lowest_price  = this._loadPrice(state.lowest_price);
                    state.surging_price = this._loadPrice(state.surging_price);
                    state.decline_price = this._loadPrice(state.decline_price);
                    state.last_price = this._loadPrice(state.decline_price);
                });

                return Promise.resolve(rows);
            });
    }

    getStockState(stock) {
        checkArgTypes(arguments, ['string']);

        return this.db(STATE_TABLE_NAME).where('stock', stock)
            .then((rows) => {
                if (rows.length == 0) {
                    throw new Error('no stock found');
                }
                let state = rows[0];
                state.closing_price = this._loadPrice(state.closing_price);
                state.highest_price = this._loadPrice(state.highest_price);
                state.lowest_price  = this._loadPrice(state.lowest_price);
                state.surging_price = this._loadPrice(state.surging_price);
                state.decline_price = this._loadPrice(state.decline_price);
                state.last_price = this._loadPrice(state.decline_price);
                return Promise.resolve(state);
            });
    }

    updateDeclingPrice(stock, decling_price) {
        checkArgTypes(arguments, ['string', 'number']);

        return this.db(STATE_TABLE_NAME).where('stock', stock)
            .update('decling_price', this._storePrice(decline_price))
            .then((updated) => {
                if (!updated) {
                    return this.db(STATE_TABLE_NAME).insert({
                        stock,
                        state : 'normal',
                        closing_price : 0,
                        opening_price : 0,
                        highest_price : 0,
                        lowest_price : 0,
                        surging_price : 1.0e30,
                        decline_price : this._storePrice(decline_price),
                        last_price : 0
                    });
                }
            })
    }

    updateSurgingPrice(stock, surging_price) {
        checkArgTypes(arguments, ['string', 'number']);

        return this.db(STATE_TABLE_NAME).where('stock', stock)
            .update('surging_price', this._storePrice(surging_price))
            .then((updated) => {
                if (!updated) {
                    return this.db(STATE_TABLE_NAME).insert({
                        stock,
                        state : 'normal',
                        closing_price : 0,
                        opening_price : 0,
                        highest_price : 0,
                        lowest_price : 0,
                        surging_price : this._storePrice(decline_price),
                        decline_price : 0,
                        last_price : 0
                    });
                }
            });
    }

    pauseStock(stock) {
        checkArgTypes(arguments, ['string']);

        return this.db(STATE_TABLE_NAME).where('stock', stock)
            .update('state', 'pause')
            .then((updated) => {
                if (!updated) {
                    return this.db(STATE_TABLE_NAME).insert({
                        stock,
                        state : 'pause',
                        closing_price : 0,
                        opening_price : 0,
                        highest_price : 0,
                        lowest_price : 0,
                        surging_price : 1.0e30,
                        decline_price : 0,
                        last_price : 0
                    });
                }
            })
    }

    resumeStock(stock) {
        checkArgTypes(arguments, ['string']);

        return this.db(STATE_TABLE_NAME).where('stock', stock)
            .update('state', 'normal')
            .then((updated) => {
                if (!updated) {
                    throw new Error('no stock updated');
                }
            })
    }

    clearAll() {
        return Promise.all([
            this.db(INST_TABLE_NAME).del(),
            this.db(OPER_TABLE_NAME).del()
        ]);
    }
}

module.exports = function (config_database) {
    let config = Object.assign(
        {
            host : 'localhost',
            user : 'username',
            password : 'password',
            database : 'database'
        },
        config_database || {}
    );

    return new Database(config);
}

