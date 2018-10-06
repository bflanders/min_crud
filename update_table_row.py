#!/path/to/python/bin
import cgitb
cgitb.enable()

import cgi
import json
import postgresql 
from urllib.parse import parse_qs
db = postgresql.open('pq://user:pw@localhost:5432/db')

form = cgi.FieldStorage()

print("Content-Type: text/html")
print()
print()

schema = form['schema'] if 'schema' in form else 'public'
tname = form['name'].value
columns = form['columns'].value if 'columns' in form else '*'
op = form['op'].value
form_data = parse_qs(form['form_data'].value)

pkeys = []
for i,v in enumerate(columna):
	if (v['data_type'] in ('text','date')):
		form_data[v['data']] = f"'{form_data[v['data']][0]}'"
	elif (v['data_type']=='jsonb'):
		jdata = form_data[v['data']][0]
		jdata = '['+jdata if jdata[0]!='[' else jdata
		jdata = ']'+jdata if jdata[-1]!=']' else jdata
		form_data[v['data']]=f"to_jsonb('{jdata}'::text)"
	else:
		form_data[v['data']] = form_data[v['data']][0]
	if (v['is_pkey']):
		pkeys.append(v['data'])
		
where = ' where '+'and'.join(
	[f'{pk} = {form_data[pk]}' for pk in pkeys])
	
if op=='add':
	cols = ','.join([k for k in form_data.keys() ])
	values = f"({','.join([v for v in form_data.values()])})"
	pk_exists = 'select 1 from {schema}.{tname} {where}'
	if (not db.query(pk_exists)):
		db.execute(f"insert into {schema}.{tname} ({cols}) values {values}")
elif op=='edit':
	set_values = ' , '.join(
		[f'{k} = {v}' for k.v in form_data.items() if k not in pkeys])
	db.execute(f"update {schema}.{tname} set {set_value} {where}")
	# another approach is to insert new record of the edits
	# you would need to know which is the "serial" column and exclude from "where"
elif op=='del':
	db.execute(f"delete from {schema}.{tname} {where}")
	# another approach is to set visibility to false
# Echo back new or updated row
if op!='del':
	cols = ','.join([k for k in form_data.keys()])
	print(db.query(f"""
		with t as (
			select {cols}
			from {schema}.{tname}
			{where}
		)
		select array_to_json(array_agg(t)) from t
	""")[0][0]) #.encode('ascii','replace').decode('ascii')