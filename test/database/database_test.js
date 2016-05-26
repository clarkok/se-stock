'use strict';

let assert = require('chai').assert;
let Database = require('../../lib/database/database.js');
let config = require('../../config.json');

describe('Database', function () {
    let uut = Database(config.database);

    beforeEach(function () {
        return uut.clearAll()
            .then(() => uut.commitBuyingInstruction(1, '12345', 10, 100))
            .then(() => uut.commitSellingInstruction(2, '12345', 20, 200));
    });

    describe('#commitBuyingInstruction', function () {
        it('commit a buying instruction', function () {
            return uut.commitBuyingInstruction(1, '12345', 10, 10).then((ids) => { assert.typeOf(ids, 'number'); });
        });
    });

    describe('#commitSellingInstruction', function () {
        it('commit a selling instruction', function () {
            return uut.commitSellingInstruction(2, '12345', 20, 20).then((ids) => { assert.typeOf(ids, 'number'); });
        });
    });

    describe('#getAllSellingInstuctions', function () {
        it('should list all selling instructions', function () {
            return uut.getAllSellingInstructions('12345')
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].is_buying, 0);
                    assert.equal(insts[0].owner, 2);
                    assert.equal(insts[0].stock, '12345');
                    assert.equal(insts[0].amount, 200);
                    assert.equal(insts[0].price, 20);
                });
        });
    });

    describe('#getAllBuyingInstuctions', function () {
        it('should list all buying instructions', function () {
            return uut.getAllBuyingInstructions('12345')
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].is_buying, 1);
                    assert.equal(insts[0].owner, 1);
                    assert.equal(insts[0].stock, '12345');
                    assert.equal(insts[0].amount, 100);
                    assert.equal(insts[0].price, 10);
                });
        });
    });

    describe('#makeTrade', function () {
        it('should make a trade', function () {
            let buying_id, selling_id;
            return uut.getAllBuyingInstructions('12345')
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    buying_id = insts[0].id;
                    return uut.getAllSellingInstructions('12345');
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    selling_id = insts[0].id;
                    return uut.makeTrade(buying_id, selling_id, 50, 100);
                })
                .then(() => uut.getAllBuyingInstructions('12345'))
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].amount, 50);
                    return uut.getAllSellingInstructions('12345');
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    assert.equal(insts[0].amount, 150);
                })
        });
    });

    describe('#queryLastOperation', function () {
        it('should get last operation', function () {
            let buying_id, selling_id;
            return uut.getAllBuyingInstructions('12345')
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    buying_id = insts[0].id;
                    return uut.getAllSellingInstructions('12345');
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    selling_id = insts[0].id;
                    return uut.makeTrade(buying_id, selling_id, 50, 100);
                })
                .then(() => uut.queryLastOperation('12345'))
                .then((op) => {
                    assert.equal(op.buying_id, buying_id);
                    assert.equal(op.selling_id, selling_id);
                    assert.equal(op.amount, 50);
                    assert.equal(op.price, 100);
                    assert.equal(op.stock, '12345');
                });
        });
    });

    describe('#queryAllOperationStocks', function () {
        it('should get all stocks operated', function () {
            let buying_id, selling_id;
            return uut.getAllBuyingInstructions('12345')
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    buying_id = insts[0].id;
                    return uut.getAllSellingInstructions('12345');
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    selling_id = insts[0].id;
                    return uut.makeTrade(buying_id, selling_id, 50, 100);
                })
                .then(() => uut.queryAllOperationStocks())
                .then((stocks) => {
                    assert.equal(stocks.length, 1);
                    assert.equal(stocks[0], '12345');
                });
        });
    });

    describe('#queryMaxMin', function () {
        it('should find max / min price of operations', function () {
            let buying_id, selling_id;
            return uut.getAllBuyingInstructions('12345')
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    buying_id = insts[0].id;
                    return uut.getAllSellingInstructions('12345');
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    selling_id = insts[0].id;
                    return Promise.all([
                        uut.makeTrade(buying_id, selling_id, 1, 100),
                        uut.makeTrade(buying_id, selling_id, 1, 10),
                        uut.makeTrade(buying_id, selling_id, 1, 1),
                    ]);
                })
                .then(() => uut.queryMaxMin('12345'))
                .then((max_min) => {
                    assert.equal(max_min.max, 100);
                    assert.equal(max_min.min, 1);
                });
        });
    });

    describe('#queryTotalAmount', function () {
        it('should find total amount traded', function () {
            let buying_id, selling_id;
            return uut.getAllBuyingInstructions('12345')
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    buying_id = insts[0].id;
                    return uut.getAllSellingInstructions('12345');
                })
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    selling_id = insts[0].id;
                    return Promise.all([
                        uut.makeTrade(buying_id, selling_id, 1, 100),
                        uut.makeTrade(buying_id, selling_id, 1, 10),
                        uut.makeTrade(buying_id, selling_id, 1, 1),
                    ]);
                })
                .then(() => uut.queryTotalAmount('12345'))
                .then((total) => {
                    assert.equal(total, 3);
                });
        });
    });

    describe('#cancelInstruction', function () {
        it('should cancel an instruction', function () {
            let buying_id;
            return uut.getAllBuyingInstructions('12345')
                .then((insts) => {
                    assert.equal(insts.length, 1);
                    buying_id = insts[0].id;
                    return uut.cancelInstruction(buying_id);
                })
                .then(() => uut.getInstructionById(buying_id))
                .then((inst) => {
                    assert.equal(inst.is_cancelled, 1);
                })
        });
    });

    describe('#clearAll', function () {
        it('should clear all information', function () {
            return uut.clearAll();
        });
    });
});
