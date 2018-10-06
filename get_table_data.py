#!/path/to/python/bin
import cgi
import postgresql 

db = postgresql.open('pq://user:pw@localhost:5432/db')

form = cgi.FieldStorage()

print("Content-Type: text/html")
print()
print()

schema = form['schema'] if 'schema' in form else 'public'
tname = form['name'].value
columns = form['columns'].value if 'columns' in form else '*'
where = f" where {form['where'].value} " if 'where' in form else ''
limit = f" where {form['limit'].value} " if 'limit' in form else ''
stmt = """
	with t as (
		select {columns} from {schema}.{tname}
		{where}
		{limit}
	)
	select array_to_json(array_agg(t)) from t
"""
print(db.query(stmt)[0][0]) #.encode('ascii','replace').decode('ascii')