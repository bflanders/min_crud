var db = (function (my) {
	my.tables = {};
	my.active_table = '';
	my.tab_table = {}
	my.add_table = function (opts) {
		var table = new Table(opts);
		my.tables[table.name] = table;
		my.active_tables = table.name;
		my.tab_table[table.tab] = table.name
		table.get_columns();
	}
	my.ui_init = function(){
		// post_url = url of post command
		post_url = '/cgi-bin/database/update_row.py';
		// table_form = add/edit/delete form inside of modal
		// form_save = id of "Save" button in modal
		$('#form_save').click(function(e){
			e.preventDefault();
			var table = my.tables[my.active_table];
			$('#table_form')
				.find(':inupt:disabled')
				.removeAttr('disabled');
			$.post(post_url, {
				op: table._op
				,table: table.name
				,form_data: $('#table_form').serialize();
				,columns: JSON.stringify(table._columns);
			}).done(function (data){
				switch (table._op){
					case "add":
						table._dt
							.row
							.add(JSON.parse(data)[0])
							.draw(false);
						break;
					case "edit":
						table._dt
							.row({selected: true })
							.data(JSON.parse(data)[0])
							.draw(false);
						break;
					case "del":
						table._dt
							.row({selected: true})
							.remove()
							.draw(false);
						break;
				}
				$('#table_modal').modal('hide');
			}).fail(function (resp){
				console.log(resp);
				alert('Operation not performed. Check console log.');
			});
		});
		$('a[data-toggle="tab"]').on('shown.bs.tab',function(e){
			my.active_table = my.tab_table[e.target.id];
		});
	}
	return my;
)(db || {});

function Table(opts){
	var defaults = {
		is_editable: false
		,columns: '*'
		,modal: '#table_modal'
		,modal_title: '#modal_title'
		,form: '#table_form'
		,save: '#form_save'
	};
	// Apply defaults
	for (var key in defaults){
		this[key] = defaults[key];
	}
	// Overwrite with passed opts
	for (var key in opts){
		this[key] = opts[key];
	}
}

Table.prototype.get_columns = function(){
	var self = this;
	$.get('/cgi-bin/database/get_table_columns.py',{
		schema: self.schema
		,table: self.name
		,columns: self.hasOwnProperty('columns') ? self.columns : '*'
	}).done(function(cols){ 
		self.set_columns(cols); 
	});
}

Table.prototype.set_columns = function(cols){
	var self = this;
	self._columns = JSON.parse(cols);
	self._form = '<div class="form-group">';
		self._pk = [];
		var is_notes, col_name;
		for (var c in self._columns){
			var column = self._columns[c];
			col_name = column.data
			if (column.pkey){
				self._pk.push(col_name); // data aka name
			}
			self._form += '<label for="'+columns.data+'" class=col-form-label">';
			// For notes columns, user textarea
			is_notes = column.dta.includes('notes');
			self._form += is_notes ? '<textarea' : '<input'
				+ ' type="text" class="form-control" id="'+col_name
				+ ' name="'+col_name+'"'
				+ is_notes ? '></textarea>' : '>';
		}
		self._form += '</div>';
		if (self.hasOwnProperty('form')){
			$(self.form).append(self._form);
		}
		self.make_table();
}

Table.prototype.add = function(){
	var self = this;
	var field, id, $f = $(self.form);
	$f.empty();
	$f.append(self._form);
	for (var i in self._columns){
		id = '#'+self._columns[i].data+'.form-control';
		$f.find(id)
			.attr('disabled', false)
			.val('');
	}
	self._op =  'add';
	$(self.modal_title).text('Add new row...');
	$(self.modal).modal('show');
}

Table.prototype.edit = function(){
	var self = this;
	var id, $f = $(this.form);
	$f.empty();
	$f.append(self._form);
	var col_name, is_pkey, data = self._dt.row({ selected: true }).data();
	for (var c in self._columns){
		col_name = self._columns[c].data;
		is_pkey = self._columns[c].pkey;
		id = '#'+col_name+'.form-control';
		$field = $f.find(id)
		if (is_pkey){
			$field.attr('disabled', true);
		} else {
			$field.attr('disabled', false);
		}
		$field.val(data[col_name]);
	}
	self._op = 'edit';
	$(self.modal_title).text('Edit row...');
	$(self.modal).modal('show');
}

Table.prototype.del = function(){
	var self = this;
	var id, $f = $(this.form);
	$f.empty();
	$f.append(self._form);
	var col_name, is_pkey, data = self._dt.row({ selected: true }).data();
	for (var c in self._columns){
		col_name = self._columns[c].data;
		id = '#'+col_name+'.form-control';
		$f.find(id)
			.attr('disabled', true)
			.val(data[col_name]);
	}
	self._op = 'del';
	$(self.modal_title).text('Delete row...');
	$(self.modal).modal('show');
}

Table.prototype.make_table = function(){
	var self = this;
	if (self._dt){
		self._dt.destroy();
		$(self.id).empty();
	}
	var button_choices = ['colvis','copy'];
	if (self.is_editable){
		button_choices = button_choices.concat([{
			{ 	text: 'New'
				,action: function (e,dt,node,config) { self.add(); }
			},{
				text: 'Edit'
				,action: function (e,dt,node,config) { self.edit(); }
			},{
				text: 'Delete'
				,action: function (e,dt,node,config) { self.del(); }
			}
		}]);
	}
	self._dt = $(self.id).DataTable({
		buttons: button_choices
		,columns: self._columns
		,dom: "<'row'<'col-sm-12'B>>" +
			"<'row'<'col-sm-12 col-md-6'f><'col-sm-12 col-md-6'l>>" +
			"<'row'<'col-sm-12'tr>>" +
			"<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>"
		,pageLength: 10
		,select: true
	});
	self.set_ui();
	self.get_data();
}

Table.prototype.set_ui = function(){
	var self = this;
	if (self.is_editable){
		self._dt.button(3).enable(false);
		self._dt.button(4).enable(false);
		self._dt.on('select deselect', function(){
			var selected = self._dt.rows({selected: true}).count();
			self._dt.button(2).enable(selected === 0); // new
			self._dt.button(3).enable(selected === 1); // edit
			self._dt.button(4).enable(selected === 1); // delete
		});
	}
}

// TODO:
// * Should I parameterize the db?
// * Add (+) tab for dynamic tables?
// * Add modal for table level settings?

Table.prototype.get_data = function(){
	var self = this;
	$.get('/cgi-bin/database/get_table_data.py',{
		schema: self.schema
		,table: self.name
		,columns: self.hasOwnProperty('columns') ? self.columns : '*'
		,limit: self.hasOwnProperty('limit') ? self.limit : ''
	}).done(function(data){
		self.set_data(data);
	});
}

Table.prototype.set_data = function(data){
	var self = this;
	self._data = JSON.parse(data);
	self._dt.clear().rows.add(self._data).draw(false);
}


