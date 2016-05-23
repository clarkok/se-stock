'use strict';

let assert = require('chai').assert;
let Database = require('../../lib/database/database.js');
let config = require('../../config.json');

describe('Database', function () {
    let uut = Database(config.database);

    beforeEach(function () {
        return uut.clearAllInstructions()
            .then(() => uut.commitBuyingInstruction(1, 10, 100))
            .then(() => uut.commitSellingInstruction(2, 20, 200));
    });

    describe('#commitBuyingInstruction', function () {
        it('commit a buying instruction', function () {
            return uut.commitBuyingInstruction(1, 10, 10).then((ids) => { assert.equal(ids.length, 1); });
        });
    });

    describe('#commitSellingInstruction', function () {
        it('commit a selling instruction', function () {
            return uut.commitSellingInstruction(2, 20, 20).then((ids) => { assert.equal(ids.length, 1); });
        });
    });

    describe('#getAllSellingInstuctions', function () {
        it('should list all selling instructions', function () {
            return uut.getAllSellingInstructions()
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].is_buying, 0);
                    assert.equal(insts[0].owner, 2);
                    assert.equal(insts[0].amount, 200);
                    assert.equal(insts[0].price, 20);
                });
        });
    });

    describe('#getAllBuyingInstuctions', function () {
        it('should list all buying instructions', function () {
            return uut.getAllBuyingInstructions()
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].is_buying, 1);
                    assert.equal(insts[0].owner, 1);
                    assert.equal(insts[0].amount, 100);
                    assert.equal(insts[0].price, 10);
                });
        });
    });

    describe('#makeTrade', function () {
        it('should make a trade', function () {
            let buying_id, selling_id;
            return uut.getAllBuyingInstructions()
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    buying_id = insts[0].id;
                    return uut.getAllSellingInstructions();
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    selling_id = insts[0].id;
                    return uut.makeTrade(buying_id, selling_id, 50);
                })
                .then(() => uut.getAllBuyingInstructions())
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].amount, 50);
                    return uut.getAllSellingInstructions();
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].amount, 150);
                })
        });
    });
});
