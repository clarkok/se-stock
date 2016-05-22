'use strict';

class Database {
    constructor(config_database) {
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
        config_database
    );
}

