#!/usr/bin/env node
/**
 * dump_logs.js
 * Dumps the log database in log file format.
 */
var mongodb = require('mongodb'),
    server = new mongodb.Server('127.0.0.1', '27017', {}),
    connection = new mongodb.Db('bioasq-at', server, { safe: false }),
    querystring = require('querystring');

connection.open(function (err, conn) {
    if (err) {
        process.stdout.write('Could not open connection.');
        process.exit(-1);
    }

    conn.collection('log', function (err, log) {
        if (err) {
            process.stdout.write('Could not open `logs` collection.');
            process.exit(-1);
        }
        /*
         * TODO: Modify here to change the query
         */
        var cursor = log.find(
            { path: 'login' },  // db query: set key and value of the fields to match
            { time: false, _id: false } // set fields to not return to false
        );

        cursor.count(function (err, count) {
            console.log(count + ' log entries found.');

            cursor.each(function (err, doc) {
                if (err) {
                    process.stdout.write('Could not retrieve document.');
                    process.exit(-1);
                }

                if (doc) {
                    printDoc(doc);
                } else {
                    // the last entry will be `null`
                    process.exit(0);
                }
            });
        });
    });
});

var printDoc = function (doc) {
    var valueStrings = [];
    Object.keys(doc).forEach(function (key) {
        valueStrings.push(key + '=' + JSON.stringify(doc[key]));
    });
    console.log(valueStrings.join(' '));
};
