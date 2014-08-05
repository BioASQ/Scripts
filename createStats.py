"""
Script where given a file containing BioASQ golden data, a report with different statistics is produced.
Example call of the script from the terminal:
python createStats.py golden.json
Tested with python 2.7
"""
import json, sys #importing the JSON module to be able to read and write JSON files.
fname=sys.argv[1]
f=open(fname, 'r') #open the file containing the golden data
d=json.load(f)
questions=list()
q={}
notriples, noconcepts, nosnippets, nodoc=0,0,0,0 #initialize counter variables
triples, concepts, snippets, doc=0,0,0,0 #initialize counter variables
y, fa, li, su=0,0,0,0  #initialize counter variables
for item in d['questions']:
	if item['type'] == 'factoid':
		fa+=1 #Count factoid questions
	elif item['type'] == 'yesno': 
		y+=1 #Count yes/no questions
	elif item['type'] == 'list':
		li+=1 #Count list questions
	elif item['type'] == 'summary':
		su+=1 #Count summary questions
	else:
		print item['type']
	if len(item['concepts']) != 0: #Count concepts 
			concepts+=len(item['concepts'])
	else:
		noconcepts+=1 # if no concepts, report it
	if len(item['documents']) != 0: #Count docuemnts 
			doc+=len(item['documents'])
	else:
			nodoc+=1 # if no documents, report it
	if len(item['triples']) != 0: #Count RDF triples 
			triples+=len(item['triples'])
	else:
			notriples+=1 # if no snippets, report it
	if len(item['snippets']) != 0: #Count snippets  
			snippets+=len(item['snippets']) 
	else:
		nosnippets+=1 # if no snippets, report it
q_n=len(d['questions'])
print "------------------ Summary---------------------"
print "Yes/no questions: ", y, "List questions: ", li, "Factoid questions: ", fa, "Summary questions: ", su
print "Number of questions without documents: ", nodoc, "Avg of documents per question", float(doc)/(q_n-nodoc)
print "Number of questions without snippets: ", nosnippets,  "Avg of snippets per question", float(snippets)/(q_n-nosnippets)
print "Number of questions without concepts: ", noconcepts,  "Avg of concepts per question", float(concepts)/(q_n-noconcepts)
if q_n-notriples:
	print "Number of questions without triples: ", notriples,  "Avg of triples per question", float(triples)/(q_n-notriples)
else:
	print "Number of questions without triples: ", notriples,  "Avg of triples per question", 0


