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

        this._fetchResult = (rows) => {
            if (Array.isArray(rows)) {
                rows.forEach((inst) => { inst.price = this._loadPrice(inst.price); })
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
        return this.db(INST_TABLE_NAME).where('amount', '!=', 0);
    }

    getAllInstructions() {
        checkArgTypes(arguments, []);
        return this._promiseAllInstructions().then(this._fetchResult);
    }

    getInstructionById(id) {
        checkArgTypes(arguments, ['number']);
        return this._promiseAllInstructions()
            .where('id', id)
            .then(this._fetchResult)
            .then((insts) => {
                if (insts.length != 1) {
                    throw new Error(`cannot find instruction by id ${id}`);
                }
                return Promise.resolve(insts[0]);
            });
    }
    
    getAllBuyingInstructions(stock) {
        checkArgTypes(arguments, ['number']);
        return this._promiseAllInstructions()
            .where({
                is_buying: 1,
                stock
            })
            .orderBy('price', 'desc')
            .then(this._fetchResult);
    }

    getAllSellingInstructions(stock) {
        checkArgTypes(arguments, ['number']);
        return this._promiseAllInstructions()
            .where({
                is_buying: 0,
                stock
            })
            .orderBy('price')
            .then(this._fetchResult);
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

                    if (selling_inst.amount < amount) {
                        throw new Error('selling instruction dose not have enough stocks');
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
        data = Object.assign({ time : this._storeCurrentTime() }, data);
        return this.db(INST_TABLE_NAME).insert(data);
    }

    commitBuyingInstruction(owner, stock, price, amount) {
        checkArgTypes(arguments, ['number', 'number', 'number', 'number']);

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
        checkArgTypes(arguments, ['number', 'number', 'number', 'number']);

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

