BioASQ Scripts
==============

This repository contains some scripts that are useful when dealing with BioASQ data.
The following scripts are included:

`detect_duplicates.js`
----------------------

Finds pairwise annotated questions by title string comparison.

    Usage: detect_duplicates.js [options]

    Options:

        -h, --help                           output usage information
        -q, --question-file <file name>      JSON file with questions to check
        -f, --output-format [output format]  output format [list]

    Supported output formats:

        list:       list with information about authors of duplicates
        idlist:     list with plain question IDs
        blacklist:  black list for each author with IDs of duplicate by other author
        questions:  JSON dump of duplicate questions
        map:        JSON object mapping question IDs to their corresponding duplicate ID
        merged:     JSON export of duplicate questions with their annotations merged


`dump_logs.js`
--------------

Dumps the log database in log file format.

`dump_questions.js`
-------------------

Dumps the questions database as JSON.

`import_questions.js`
---------------------

Imports questions in JSON format into the questions database specified.

    Usage: import_questions.js [options]

    Options:

        -h, --help                       output usage information
        -f, --question-file <file name>  JSON file with questions to import
        -d, --database-name <name>       Database to import to
        -c, --collection-name <name>     Collection to import to
