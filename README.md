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

    Usage: dump_questions.js [options]

    Options:

        -h, --help                       output usage information
        -f, --question-file <file name>  JSON file with questions to import
        -d, --database-name <name>       Database to import to
        -c, --collection-name <name>     Collection to import to
        -r, --read-from-stdin            read question IDs from stdin (one per line)
        -n, --finalized-only             dump only questions whose publication level is not `private`

`import_questions.js`
---------------------

Imports questions in JSON format into the questions database specified.

    Usage: import_questions.js [options]

    Options:

        -h, --help                       output usage information
        -f, --question-file <file name>  JSON file with questions to import
        -d, --database-name <name>       Database to import to
        -c, --collection-name <name>     Collection to import to

`createTestPhase.py`
---------------------

Creates the files for the task B BioASQ challenge, given dump data from the BioASQ Annotation Tool.

    Usage: python createTestPhase.py filename

    Filename: the path to the file containing the Annotation Tool data 
    
    Example Call: python createDataFiles.py annotationToolData-toy.json 
    Comment: The annotationToolData-toy.json is provided to test the implementation.
    


`createStats.py`
---------------------

Provides a summary with stastistics about a dataset of the task B BioASQ challenge.

    Usage: python createStats.py filename

    Filename: the path to the file containing the golden data of a task B BioASQ challenge, as created by the script     createTestPhase.py
    
    Example Call: python createStats.py golden.json
    Comment: The annotationToolData-toy.json is provided to test the script createTestPhase.py. In a next step you can use its output file "golden.json" to test this script.


