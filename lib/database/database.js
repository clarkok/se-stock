'use strict';

let Promise = require('bluebird');
let moment = require('moment');
let checkArgTypes = require('check-arg-types');

const INST_TABLE_NAME = 'instructions';
const OPER_TABLE_NAME = 'operation';

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
            .orderBy('price')
            .then(this._fetchInstructionResult);
    }

    makeTrade(buying_id, selling_id, amount, price) {
        checkArgTypes(arguments, ['number', 'number', 'number', 'number']);

        return this.db.transaction((trx) => {
            return Promise.map([buying_id, selling_id], (id) => this.getInstructionById(id))
                .then((insts_array) => {
                    let buying_inst = insts_array[0],
                        selling_inst = insts_array[1];

                    if (buying_inst.stock != selling_inst.stock) {
                        throw new Error(`buying ${buying_inst.stock} but selling ${selling_inst.stock}`);
                    }

                    let stock = buying_inst.stock;

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
                        })
                    ]);
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

    commitBuyingInstruction(owner, stock, price, amount) {
        checkArgTypes(arguments, ['number', 'string', 'number', 'number']);

        price = this._storePrice(price);
        return this._insertIntoTable({
                owner,
                stock,
                price,
                amount,
                original : amount,
                is_buying : 1
            })
            .then((ids) => Promise.resolve(ids[0]));
    }

    commitSellingInstruction(owner, stock, price, amount) {
        checkArgTypes(arguments, ['number', 'string', 'number', 'number']);

        price = this._storePrice(price);
        return this._insertIntoTable({
                owner,
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

    queryMaxMin(stock) {
        checkArgTypes(arguments, ['string']);

        return this._promiseAllOperations().where('stock', stock)
            .then(this._fetchOperationResult)
            .then((ops) => {
                if (ops.length == 0) {
                    throw new Error('no operations found');
                }
                return Promise.resolve({
                    max : ops.reduce((prev, op) => Math.max(prev, op.price), -1),
                    min : ops.reduce((prev, op) => Math.min(prev, op.price), 1.e30)
                });
            })
    }

    queryTotalAmount(stock) {
        checkArgTypes(arguments, ['string']);

        return this._promiseAllOperations().where('stock', stock)
            .then((ops) => Promise.resolve(ops.reduce((prev, op) => prev + op.amount, 0)));
    }

    queryAllOperationStocks() {
        checkArgTypes(arguments, []);

        return this.db(OPER_TABLE_NAME).select('stock').groupBy('stock')
            .then((rows) => Promise.resolve(rows.map((row) => row.stock)))
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

