#!/path/to/python/bin
import cgi
import postgresql 

db = postgresql.open('pq://user:pw@localhost:5432/db')

form = cgi.FieldStorage()

print("Content-Type: text/html")
print()
print()

tname = form['name'].value
columns = form['columns'].value if 'columns' in form else '*'
schema = form['schema'] if 'schema' in form else 'public'

and_cols_in = ''

if columns != '*':
	# ...then columns are listed explicitly...
	and_cols_in = f"""
		and column_name in (
			{','.join(["'"+c+"'" for c in columns.split(',')])}
		)
	"""
# Column name needs to be called "data" for DataTables
stmt = f"""
	with t as (
		select	
			replace(initicap(column_name),'_',' ') as title
			,column_name as data
			,data_type
			,column_name in (
				select a.attname
				from pg_index i
					join pg_attributes a
					on a.attrelid = i.indrelid
						and a.attnum = any(i.indkey)
				where i.indrelid = '{tname}'::regclass
			) as is_pkey
		from information_schema.columns
		where
			table_schema = '{schema}'
			and table_name = '{tname}'
			{and_cols_in}
	)
	select array_to_json(array_agg(t)) from t
"""
print(db.query(stmt)[0][0])