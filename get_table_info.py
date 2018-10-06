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


print(db.query(stmt)[0][0])