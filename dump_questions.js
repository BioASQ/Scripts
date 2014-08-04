#!/usr/bin/env node
/**
 * dump_questions.js
 * Dumps the questions database as JSON.
 */
var program = require('commander');
program
    .option('-f, --question-file <file name>', 'JSON file with questions to import')
    .option('-d, --database-name <name>', 'Database to import to')
    .option('-c, --collection-name <name>', 'Collection to import to')
    .option('-r, --read-from-stdin', 'read question IDs from stdin (one per line)')
    .option('-n, --finalized-only', 'dump only questions whose publication level is not `private`')
    .parse(process.argv);

var mongodb = require('mongodb'),
    server = new mongodb.Server('127.0.0.1', '27017', {}),
    connection = new mongodb.Db(program.databaseName, server, { safe: false }),
    ObjectID = require('mongodb').ObjectID,
    querystring = require('querystring'),
    byline = require('byline'),
    util = require('util');

var questionIDs = [];

if (program.readFromStdin) {
    var IDStream = byline(process.stdin);
    IDStream.on('data', function (ID) {
        try {
            var oid = new ObjectID(String(ID));
            questionIDs.push(oid);
        } catch (e) {
            console.error('Could not create ObjectID from id: ' + ID);
            console.error(e);
        }
    });
    IDStream.on('end', function () {
        exportQuestions();
    });
} else {
    exportQuestions();
}

function exportQuestions() {
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

            var query = questionIDs.length ? { _id: { $in: questionIDs } } : {};
            if (program.finalizedOnly) {
                query['finalized'] = { $nin: [ 'private' ] };
            }
            var cursor = questions.find(query);

            var documents = [];
            if (typeof cursor !== 'undefined') {
                cursor.count(function (err, count) {
                    process.stderr.write('Retrieved ' + count + ' documents.\n');
                    var num = 1,
                        notExported = 0;
                    cursor.each(function (err, doc, index) {
                        if (err) {
                            process.stderr.write('Error counting cursor.\n');
                            process.stderr.write(err.trace);
                            process.exit(-1);
                        }

                        if (doc) {
                            transform(doc);
                            documents.push(doc);
                        } else {
                            // the last entry will be `null`
                            process.stderr.write(notExported + ' questions were not written.\n');
                            process.stdout.write(JSON.stringify(documents, null, 4));
                            process.exit(0);
                        }
                    });
                });
            }
        });
    });
};

function transform(question) {
    question.type = question.question_type;
    delete question.question_type;

    question.creator = "test@bioasq.org";
};

function cleanAnswer(doc) {
    var copy = JSON.parse(JSON.stringify(doc));
    switch (doc.type) {
    case 'factoid':
        copy.answer.exact = copy.answer.exact.filter(function (e) { return (e !== ''); });
        break;
    case 'list':
/*
        copy.answer.exact.forEach(function (e) {
            e = e.filter(function (i) { return (i !== ''); });
        });
*/
        break;
    default:
        /* do nothing */
    }
    return copy;
};

function exportDoc(doc, num, f) {
    if (doc.answer /*&& doc.answer.text /*&& doc.body.search(/^.*#\s* /) > -1*/) {
        f.id = doc._id;
        f.creator = doc.creator;
        f.type = doc.type;
        // replace finalization markers
        f.body = doc.body.replace(/^.*#\s*/, '').replace(/\s*$/, '');

        // construct body
        f.answer = {};
        try {
            var split = splitAnswer(doc.answer.text, f.type);
            f.answer.ideal = split.ideal;

            if (f.type !== 'summary') {
                f.answer.exact = split.exact;
            }
        } catch (e) {
            console.log('ERROR! ----------');
            console.log(e);
            console.log(doc.answer.text);
            console.log(split);
            process.exit();
        }
        // f.answer.original = doc.answer.text;
        f.answer.annotations = [];

        doc.entities.forEach(function (entity) {
            var e = {};
            e.type = entity.domClass.replace('Result', '');

            switch (e.type) {
            case 'document':
                e.title    = entity.title;
                e.uri      = entity.uri;
                e.sections = entity.sections
                .filter(function (sec) { return (typeof sec !== 'undefined' && sec !== null); })
                .map(function (sec) {
                    if (!sec) { console.error('Empty section: ' + e.uri); }
                    return stripAnnotationHTML(sec);
                });
                break;
            case 'concept':
                e.title = entity.title;
                e.uri   = entity.uri;
                break;
            case 'statement':
                e.s     = entity.s;
                e.p     = entity.p;
                e.o     = entity.o;
                e.title = entity.title;
                break;
            }

            f.answer.annotations.push(e);
        });

        doc.answer.annotations.forEach(function (annotation) {
            var s      = {};
            s.type     = 'snippet';
            s.document = annotation.annotationDocument;
            s.text     = stripAnnotationHTML(annotation.annotationText);

            try {
                var index = annotationIndex(doc,
                                            s.document,
                                            annotation.annotationText,
                                            annotation.annotationHTML);
                s.beginIndex     = index.begin;
                s.endIndex       = index.end;
                s.beginFieldName = index.fieldName;
                s.endFieldName   = index.fieldName;

                f.answer.annotations.push(s);
            } catch (e) {
                switch (e.name) {
                case 'ReferenceError':
                    process.stderr.write('ReferenceError: ' + s.document + '\n');
                    break;
                case 'TypeError':
                    process.stderr.write('TypeError: ' + s.document + '\n');
                    break;
                }
                // annotation is not pushed if an error occurs during
                // its creation
            }
        });

        return true;
    }

    return false;
};

function annotationIndex(question, documentURI, annotationText, annotationHTML) {
    var result = {},
        documents = question.entities.filter(function (e) { return e.uri === documentURI; });

    if (!documents.length) {
        throw ReferenceError('Document not found');
    }

    var entity = documents[0];
    if (entity.domClass && entity.domClass !== 'documentResult') {
        throw TypeError('Not a document!');
    }

    var strippedAnnotationText = stripAnnotationHTML(annotationText),
        strippedAnnotationHTML = stripAnnotationHTML(annotationHTML),
        length                 = Math.min(strippedAnnotationHTML.length, strippedAnnotationHTML.length),
        s;

    if (entity.title.indexOf(strippedAnnotationText) > -1) {
        result.fieldName = 'title';
        result.begin     = entity.title.indexOf(strippedAnnotationText);
        result.end       = result.begin + entity.title.length;
    } else if (entity.title.indexOf(strippedAnnotationHTML) > -1) {
        result.fieldName = 'title';
        result.begin     = entity.title.indexOf(strippedAnnotationHTML);
        result.end       = result.begin + entity.title.length;
    } else {
        entity.sections.forEach(function (section, idx) {
            s = stripAnnotationHTML(section);
            if (s.indexOf(strippedAnnotationText) > -1) {
                result.fieldName = 'sections.' + String(idx);
                result.begin     = s.indexOf(strippedAnnotationText);
                result.end       = result.begin + length;
            } else if (s.indexOf(strippedAnnotationHTML) > -1) {
                result.fieldName = 'sections.' + String(idx);
                result.begin     = s.indexOf(strippedAnnotationHTML);
                result.end       = result.begin + length;
            }
        });
    }

    if (!result.hasOwnProperty('begin')) {
        process.stdout.write(' !!! No Snippet Index Found !!!\n');
        console.log(entity.id + '\n\n');
        console.log(question._id + '\n\n');
        console.log(s + '\n\n');
        // console.log('"' + strippedAnnotationHTML + '"');
        // console.log(s.indexOf(strippedAnnotationText));
        // console.log(s.search(strippedAnnotationText));
        process.stdout.write(documentURI + '\n');
        process.stdout.write('title: "' + entity.title + '"\n\n');
        // process.stdout.write(annotationText + '\n\n');
        // process.stdout.write(annotationHTML + '\n\n');
        process.stdout.write(strippedAnnotationText + '\n\n');
        process.stdout.write(strippedAnnotationHTML + '\n\n');
        /*
         * entity.sections.forEach(function (s) {
         *     console.log(stripAnnotationHTML(s));
         * });
         * process.stdout.write('\n\n');
         */
        process.exit();
    }

    return result;
};

function secondPartIsExactAnswer(string) {
    var iPos = string.search(/ideal +(?:answer|asnwer)/i),
        ePos = string.search(/exact +(?:answer|asnwer)/i);

    return (
        (iPos > -1 & ePos > -1 & iPos < ePos) ||
        (iPos == -1 & ePos > -1)
    );
};

function splitAnswer(answer, type) {
    var ideal, exact,
        tmp = answer.split(/\s*(?:ideal|exact)\s+(?:answer|asnwer):?\s*/i)
                    .filter(function (item) { return item !== ''; });

    if (tmp.length > 1) {
        if (secondPartIsExactAnswer(answer)) {
            ideal = tmp[0];
            exact = tmp[1];
        } else {
            ideal = tmp[1];
            exact = tmp[0];
        }
    } else {
        // do cleanup only
        ideal = tmp[0];
        exact = tmp[0];
    }

    // parse list answer
    if (type === 'list') {
        var split = exact.split(/\/\//);
        exact = split.map(function (item) {
            return item.replace(/^[\s"“”']*|[\s"“”']*$/g, '');
        }).filter(function (item) {
            return (item.trim() !== '');
        }).map(function (item) {
            // parse coma-separated synonym entries
            return item.split(/"?\s?[^\\],\s?"?/).map(function (synonym) {
                return synonym.replace(/\\/g, '');
            });
        });
    } else if (type === 'factoid') {
        // parse coma-separated synonym entries
        exact = exact.split(/"?\s?[^\\],\s?"?/).map(function (item) {
            return item.replace(/^[\s"“”']*|[\s"“”']*$/g, '').replace(/\\/g, '');
        });
    } else if (type === 'decisive') {
        exact = exact.replace(/[^yesnoYESNO]/g, '');
        exact = exact.toLowerCase();
        exact = exact[0].toUpperCase() + exact.slice(1);
    }

    return {
        ideal: ideal.replace(/^[\s"]*|[\s"]*$/g, ''),
        exact: typeof (exact) == 'string' ? exact.replace(/^[\s"]*|[\s"]*$/g, '') : exact
    };
};

function unescapeHTML(text) {
    var escapes = {
        '&lt;':   '<',
        '&gt;':   '>',
        '&#x27;': '\'',
        '&nbsp;': ' ',
        '&quot;': '"'
    };

    // replace all `&amp;` by `&` until a fixpoint is reached
    while (true) {
        tmp = text.replace(/&amp;/g, '&');
        if (tmp == text) {
            break;
        }
        text = tmp;
    }

    // replace other entities
    Object.keys(escapes).forEach(function (search) {
        text = text.replace(new RegExp(search, 'g'), escapes[search]);
    });

    return text;
};

function escapeHTML(text) {
    var escapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        ' ': '&nbsp;'
    };

    // replace characters with entities
    Object.keys(escapes).forEach(function (search) {
        text = text.replace(new RegExp(search, 'g'), escapes[search]);
    });

    return text;
};

function stripAnnotationHTML(text) {
    var stripped = unescapeHTML(text);
    stripped = stripped.replace(new RegExp(
        '\n            <span style=["|\']background-color:#fff000;["|\']>\n                ', 'g'
    ), '');
    stripped = stripped.replace(new RegExp(
        '\n {12}</span>\n {12}<a class="btn btn-mini annotationText" href="#" data-id="[0-9]+" rel="tooltip" title="Remove annotation"><i class="icon-remove"></i></a>\n {8}', 'g'
    ), '');
    stripped = stripped.replace(new RegExp('</span>', 'g'), '');
    stripped = stripped.replace(new RegExp('(\\s)+', 'g'), '$1');
    stripped = stripped.trim();

    return stripped;
}

function quoteRegExp(str) {
    return str.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
};

function stripTagsForRegExp(text) {
    text.replace(new RegExp(/<span[^>]+/), '\\s+')
};
