#!/usr/bin/env node
/**
 * import_questions.js
 * Imports questions into the database.
 */
var program = require('commander');

program
    .option('-f, --question-file <file name>', 'JSON file with questions to import')
    .option('-d, --database-name <name>', 'Database to import to')
    .option('-c, --collection-name <name>', 'Collection to import to')
    .parse(process.argv);

var mongodb     = require('mongodb'),
    server      = new mongodb.Server('127.0.0.1', '27017', {}),
    connection  = new mongodb.Db(program.databaseName, server, { safe: false }),
    ObjectID    = require('mongodb').ObjectID,
    querystring = require('querystring'),
    util        = require('util'),
    fs          = require('fs'),
    step        = require('step');

connection.open(function (err, conn) {
    if (err) {
        process.stdout.write('Could not open connection.');
        process.exit(-1);
    }

    conn.collection(program.collectionName, function (err, questions) {
        if (err) {
            process.stdout.write('Could not open collection.');
            process.exit(-1);
        }

        fs.readFile(program.questionFile, function (err, data) {
            if (err) {
                process.stdout.write('Could not open file.');
                process.exit(-1);
            }

            if (!data.length)
                process.exit(-1);

            var docs = JSON.parse(data);

            if (docs.length < 1)
                process.exit(-1);

            step(
                function () {
                var callbackFactory = this;
                    docs.forEach(function (doc) {
                        if (typeof doc._id !== 'undefined') {
                            doc._id = ObjectID(doc._id);
                        }
                        if (typeof doc.id !== 'undefined') {
                            doc._id = ObjectID(doc.id);
                            delete doc.id;
                        }
                        questions.insert(doc, { safe: true }, callbackFactory.parallel());
                    });

                },
                function (err) {
                    if (err) {
                        console.error(err);
                        process.exit(-1);
                    }
                    process.exit(0);
                }
            );
        });
    });
});

