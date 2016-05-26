'use strict';

let assert = require('chai').assert;
let Database = require('../../lib/database/database.js');
let config = require('../../config.json');

describe('Database', function () {
    let uut = Database(config.database);

    beforeEach(function () {
        return uut.clearAllInstructions()
            .then(() => uut.commitBuyingInstruction(1, 12345, 10, 100))
            .then(() => uut.commitSellingInstruction(2, 12345, 20, 200));
    });

    describe('#commitBuyingInstruction', function () {
        it('commit a buying instruction', function () {
            return uut.commitBuyingInstruction(1, 12345, 10, 10).then((ids) => { assert.typeOf(ids, 'number'); });
        });
    });

    describe('#commitSellingInstruction', function () {
        it('commit a selling instruction', function () {
            return uut.commitSellingInstruction(2, 12345, 20, 20).then((ids) => { assert.typeOf(ids, 'number'); });
        });
    });

    describe('#getAllSellingInstuctions', function () {
        it('should list all selling instructions', function () {
            return uut.getAllSellingInstructions(12345)
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].is_buying, 0);
                    assert.equal(insts[0].owner, 2);
                    assert.equal(insts[0].stock, 12345);
                    assert.equal(insts[0].amount, 200);
                    assert.equal(insts[0].price, 20);
                });
        });
    });

    describe('#getAllBuyingInstuctions', function () {
        it('should list all buying instructions', function () {
            return uut.getAllBuyingInstructions(12345)
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].is_buying, 1);
                    assert.equal(insts[0].owner, 1);
                    assert.equal(insts[0].stock, 12345);
                    assert.equal(insts[0].amount, 100);
                    assert.equal(insts[0].price, 10);
                });
        });
    });

    describe('#makeTrade', function () {
        it('should make a trade', function () {
            let buying_id, selling_id;
            return uut.getAllBuyingInstructions(12345)
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    buying_id = insts[0].id;
                    return uut.getAllSellingInstructions(12345);
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    selling_id = insts[0].id;
                    return uut.makeTrade(buying_id, selling_id, 50, 100);
                })
                .then(() => uut.getAllBuyingInstructions(12345))
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].amount, 50);
                    return uut.getAllSellingInstructions(12345);
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].amount, 150);
                })
        });
    });
});
