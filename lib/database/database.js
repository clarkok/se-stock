'use strict';

let Promise = require('bluebird');
let moment = require('moment');
let checkArgTypes = require('check-arg-types');

const TABLE_NAME = 'instructions';

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

    _storePrice(price) {
        checkArgTypes(arguments, ['number']);
        return (price * 100) | 0;
    }

    _loadPrice(price) {
        checkArgTypes(arguments, ['number']);
        return (price / 100.0);
    }

    _promiseAllInstructions() {
        checkArgTypes(arguments, []);
        return this.db(TABLE_NAME).where('amount', '!=', 0);
    }

    getAllInstructions() {
        checkArgTypes(arguments, []);
        return this._promiseAllInstructions().then(this._fetchResult);
    }

    getInstructionById(id) {
        checkArgTypes(arguments, ['number']);
        return this._promiseAllInstructions().where('id', id).then(this._fetchResult);
    }
    
    getAllBuyingInstructions() {
        checkArgTypes(arguments, []);
        return this._promiseAllInstructions().where('is_buying', 1).orderBy('price').then(this._fetchResult);
    }

    getAllSellingInstructions() {
        checkArgTypes(arguments, []);
        return this._promiseAllInstructions().where('is_buying', 0).orderBy('price', 'desc').then(this._fetchResult);
    }

    makeTrade(buying_id, selling_id, amount) {
        checkArgTypes(arguments, ['number', 'number', 'number']);

        return this.db.transaction((trx) => {
            return Promise.map([buying_id, selling_id], (id) => this.getInstructionById(id))
                .then((insts_array) => {
                    if (insts_array[0].length != 1) {
                        throw new Error(buying_id + ' is not a valid buying id');
                    }

                    if (insts_array[1].length != 1) {
                        throw new Error(selling_id + ' is not a valid selling id');
                    }

                    let buying_inst = insts_array[0][0],
                        selling_inst = insts_array[1][0];

                    if (buying_inst.amount < amount) {
                        throw new Error('buying instruction dose not require so much stocks');
                    }

                    if (selling_inst.amount < amount) {
                        throw new Error('selling instruction dose not have enough stocks');
                    }

                    return Promise.all([
                        trx(TABLE_NAME).where('id', buying_id).decrement('amount', amount),
                        trx(TABLE_NAME).where('id', selling_id).decrement('amount', amount),
                    ]);
                })
        });
    }

    _insertIntoTable(data) {
        data = Object.assign({ time : moment().format('YYYY-MM-DD hh:mm:ss') }, data);
        return this.db(TABLE_NAME).insert(data);
    }

    commitBuyingInstruction(owner, price, amount) {
        checkArgTypes(arguments, ['number', 'number', 'number']);

        price = this._storePrice(price);
        return this._insertIntoTable({
            owner,
            price,
            amount,
            is_buying : 1
        });
    }

    commitSellingInstruction(owner, price, amount) {
        checkArgTypes(arguments, ['number', 'number', 'number']);

        price = this._storePrice(price);
        return this._insertIntoTable({
                owner,
                price,
                amount,
                is_buying : 0
            });
    }

    clearAllInstructions() {
        return this.db(TABLE_NAME).del();
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

