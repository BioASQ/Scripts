/**
 * detect_duplicates.js
 * Finds pairwise annoteted questions by title string comparison.
 */
var program = require('commander'),
    fs = require('fs');
program
    .option('-q, --question-file <file name>', 'JSON file with questions to check')
    .option('-f, --output-format [output format]', 'output format [list]', 'list');

program.on('--help', function(){
    console.log('  Supported output formats:\n');
    console.log('    list:       list with information about authors of duplicates');
    console.log('    idlist:     list with plain question IDs');
    console.log('    blacklist:  black list for each author with IDs of duplicate by other author');
    console.log('    questions:  JSON dump of duplicate questions');
    console.log('    map:        JSON object mapping question IDs to their corresponding duplicate ID');
    console.log('    merged:     JSON export of duplicate questions with their annotations merged');
    console.log();
});

program.parse(process.argv);

if (typeof program.questionFile == 'undefined') {
    program.help();
}

var questions = JSON.parse(fs.readFileSync(program.questionFile));
var done = {};
var pairs = {};
var duplicates = [];

// some special cases that cannot be detected automatically
var specialCases = {
    '52ebb2c698d0239505000029': '52f77f042059c6d71c000029',
    '530cf4fe960c95ad0c000003': '52e8e96698d023950500001f'
};

questions.forEach(function (q) {
    questions.forEach(function (qq) {
        var lesserID = q._id < qq._id ? q._id : qq._id;
        var lesserCreatorQuestion = q.creator < qq.creator ? q : qq;

        var title1 = q.body.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        var title2 = qq.body.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        var isSpecialCase = (specialCases[q._id] === qq._id) || (specialCases[qq._id] === q._id);

        if (((title1 === title2) || isSpecialCase) && (q._id !== qq._id) &&
            !done[lesserID]) {

            done[lesserID] = true;

            // default duplicate info list
            if (program.outputFormat === 'list') {
                process.stdout.write(q.body + '\n');
                process.stdout.write(q._id + ' (' + q.creator + ')\n');
                process.stdout.write(qq._id + ' (' + qq.creator + ')\n');
                process.stdout.write('\n');
            } else if (program.outputFormat === 'idlist') {
                process.stdout.write(q._id + '\n');
                process.stdout.write(qq._id + '\n');
            } else if (program.outputFormat === 'blacklist') {
                pairs[q.creator] = pairs[q.creator] || [];
                pairs[q.creator].push(qq._id);
                pairs[qq.creator] = pairs[qq.creator] || [];
                pairs[qq.creator].push(q._id);
            } else if (program.outputFormat === 'questions') {
                duplicates.push(q);
                duplicates.push(qq);
            } else if (program.outputFormat === 'map') {
                pairs[q._id] = qq._id;
                pairs[qq._id] = q._id;
            } else if (program.outputFormat === 'merged') {
                duplicates.push(mergeQuestions(q, qq));
            } else {
                program.help();
            }
        }
    });
});

if (Object.keys(pairs).length) {
    process.stdout.write(JSON.stringify(pairs, false, 4));
}

if (duplicates.length) {
    process.stdout.write(JSON.stringify(duplicates, false, 4));
}

function mergeQuestions(question1, question2) {
    var mergedQuestion = JSON.parse(JSON.stringify(question1));
    mergedQuestion._id = question1._id + question2._id;
    delete mergedQuestion.creator;

    // merge concepts
    Array.prototype.push.apply(mergedQuestion.concepts, question2.concepts.filter(function (c) {
        return !(mergedQuestion.concepts.some(function (mc) {
            if (mc.uri === c.uri) { console.error('ignoring duplicate concept: ' + c.uri); }
            return (mc.uri === c.uri);
        }));
    }));

    // merge documents
    Array.prototype.push.apply(mergedQuestion.documents, question2.documents.filter(function (d) {
        return !(mergedQuestion.documents.some(function (md) {
            if (md.uri === d.uri) { console.error('ignoring duplicate document: ' + d.uri); }
            return (md.uri === d.uri);
        }));
    }));

    // merge statements
    Array.prototype.push.apply(mergedQuestion.statements, question2.statements.filter(function (s) {
        return !(mergedQuestion.statements.some(function (ms) {
            if (ms.title === s.title) { console.error('ignoring duplicate statement: ' + s.title); }
            return (ms.title === s.title);
        }));
    }));

    // merge snippets
    mergedQuestion.snippets.forEach(function (s1) {
        question2.snippets.forEach(function (s2) {
            if (s1['document'] === s2['document']) {
                if (doesSnippetOverlapWithSnippet(s1, s2))  {
                    s1.beginIndex = Math.min(s1.beginIndex, s2.beginIndex);
                    s1.endIndex = Math.max(s1.endIndex, s2.endIndex);

                    for (var i = 0; i < question1.documents.length; i++) {
                        if (question1.documents[i].uri === s1['document']) {
                            s1.text = snippetText(question1.documents[i], s1);
                            break;
                        }
                    }
                    console.error('snippets merged: ' + s1.text);
                } else {
                    mergedQuestion.snippets.push(s2);
                }
            }
        });
    });

    return mergedQuestion;
};

function doesSnippetOverlapWithSnippet(s1, s2) {
    try {
        compareSnippets(s1, s2);
    } catch (e) {
        return true;
    }

    return false;
};

function compareSnippets(op1, op2) {
    if (op1.endSection < op2.beginSection) {
        return -1;
    } else if (op1.beginSection > op2.endSection) {
        return 1;
    } else {
        if (op1.endIndex < op2.beginIndex) {
            return -1;
        } else if (op1.beginIndex > op2.endIndex) {
            return 1;
        } else {
            throw Error('Overlapping snippets!');
        }
    }
};

function snippetText(doc, snippet) {
    if (snippet.beginSection !== snippet.endSection) {
        throw Error('Snippet spanning multiple sections!');
    }
    var parts = snippet.beginSection.split('.'),
        section = parts.length === 1 ? doc[parts[0]] : doc[parts[0]][parseInt(parts[1], 10)];
    return section.substring(snippet.beginIndex, snippet.endIndex);
};
