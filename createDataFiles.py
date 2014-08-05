"""
Script where given a dump of the BioASQ Annotation Tool data, the test files for each phase of the challenge and the golden data file are produced.
Example call of the script from the terminal:
python createDataFiles.py annotationToolData-toy.json 
Output: 3  JSON files, namely: golden.json, phaseA.json, phaseB.json
Tested with python 2.7
"""
import json, sys #importing the JSON module to be able to read and write JSON files.
fname=sys.argv[1]
f=open(fname, 'r') #open file
d=json.load(f)

#Phase A data pre-processing
questions=list()
q={}
for item in d: #Create Phase A data
	q={}
	q['body']=item['body']
	q['type']=item['type']
	q['id']=item['_id']
	questions.append(q)

with open('phaseA.json', 'w') as out: #Save phase A data
	json.dump({"questions":questions}, out, indent=4)

#Phase B data pre-processing
questions=list()
q={}
notriples, noconcepts, nosnippets, nodoc=0,0,0,0
for item in d: #Create Phase B data
	q={}
	q['body']=item['body']
	q['type']=item['type']
	q['id']=item['_id']
	try:
		q['concepts']=[x['uri'] for x in item['concepts']]
	except: 
		noconcepts+=1
	try:
		q['documents']=[x['uri'] for x in item['documents']]
	except:
		nodoc+=1
	try:
		q['snippets']=[{'offsetInBeginSection': x['beginIndex'], 'offsetInEndSection': x['endIndex'], 'text':x['text'], 'beginSection': x['beginSection'], 'document': x['document'], 'endSection':x['endSection']} for x in item['snippets']]
	except:
		nosnippets+=1
	try:
		q['triples']=[{'s':x['s'], 'p':x['p'], 'o':x['o']} for y in item['statements'] for x in y['triples']]
	except:
		notriples+=1
	questions.append(q)
	 
with open('phaseB.json', 'w') as out: #Save phase B data
        json.dump({"questions":questions}, out, indent=4)

#Golden data pre-processing
questions=list()
q={}
for item in d: #Create golden data
	q={}
	q['body']=item['body']
	q['type']=item['type']
	q['id']=item['_id']
	q['concepts']=[x['uri'] for x in item['concepts']]
	q['documents']=[x['uri'] for x in item['documents']]
	q['snippets']=[{'offsetInBeginSection': x['beginIndex'], 'offsetInEndSection': x['endIndex'], 'text':x['text'], 'beginSection': x['beginSection'], 'document': x['document'], 'endSection':x['endSection']} for x in item['snippets']]
	q['triples']=[{'s':x['s'], 'p':x['p'], 'o':x['o']} for y in item['statements'] for x in y['triples']]
	q['ideal_answer']=item['answer']['ideal']
	if not item['type'] == 'summary':
		q['exact_answer']=item['answer']['exact']
		questions.append(q)

with open('golden.json', 'w') as out: #Save golden data
        json.dump({"questions":questions}, out, indent=4)
