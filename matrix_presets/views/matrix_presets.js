$(function() {

	// Publish form only (this file is loaded on every CP page)
	if (typeof EE === 'undefined' || ! EE.publish || window.MatrixPresets) {
		return;
	}

	// Shared with other features (e.g. pasting rows)
	window.MatrixPresets = {
		loadRows: loadRows
	};

	var URLS = <?php echo json_encode($urls); ?>;

	// How preset values are stored (the preset's "format"):
	// none: keyed by column position, every checkbox/radio value (before 1.3.7)
	// 2: keyed by column ID, checkboxes/radios store their checked state
	// 3: disabled inputs aren't stored (e.g. Playa's unselected options)
	var PRESET_FORMAT = 3;

	var CONTROLS_HTML = '<div class="matrix-presets" style="float:right; margin-top:-12px;">'
		+ '<select class="matrix-preset-select" style="padding:3px 15px!important; margin-top:5px;"><option value="">- Select A Preset -</option></select> '
		+ '<input type="button" class="matrix-preset-load btn button--small" value="Load" style="padding:5px 15px!important; margin-top:5px;"> '
		+ '<input type="button" class="matrix-preset-delete btn remove button--small" value="Delete" style="padding:5px 15px!important; margin-top:5px;"> '
		+ '<input type="button" class="matrix-preset-save btn action button--small" value="Save" style="padding:5px 15px!important; margin-top:5px;">'
		+ '</div>';

	// [fieldId][presetId] => {name, format, values}
	var presets = {};

	var fieldIds = [];

	findMatrixFields().each(function() {
		var fieldId = getFieldId($(this));

		if (fieldIds.indexOf(fieldId) === -1) {
			fieldIds.push(fieldId);
		}
	});

	if ( ! fieldIds.length) {
		return;
	}

	request('get_presets')
		.done(function() {
			initFields(findMatrixFields());
		})
		.fail(function(jqXHR) {
			// Without access to the add-on, just don't show the buttons
			if (jqXHR.status == 403) {
				console.info('Matrix Presets: this member role does not have access to the add-on');
			} else {
				console.warn('Matrix Presets: ' + errorMessage(jqXHR));
			}
		});


	// ------------------------------------------------------------------
	// Matrix fields

	// Matrix field ID from the field's id ("field_id_12")
	function getFieldId($field) {
		var match = String($field.attr('id') || '').match(/^field_id_(\d+)$/);

		return match ? parseInt(match[1], 10) : false;
	}

	function findMatrixFields() {
		return $('div.matrix').filter(function() {
			return getFieldId($(this)) !== false;
		});
	}

	// The field's own rows (not the "no rows" row, or rows of tables inside cells such as Playa's).
	// Matrix hides deleted rows rather than removing them (until the entry is saved), so skip those.
	function getRows($field) {
		return $field.children('table').first()
			.children('tbody').children('tr')
			.not('.matrix-norows')
			.filter(function() {
				return this.style.display !== 'none';
			});
	}

	// Matrix's own object for the field (Matrix only sets up a field's rows once it's visible)
	function getMatrix($field) {
		if (typeof Matrix === 'undefined' || ! Matrix.instances) {
			return null;
		}

		for (var i = 0; i < Matrix.instances.length; i++) {
			var matrix = Matrix.instances[i];

			if (matrix.dom && matrix.dom.$field && matrix.dom.$field[0] === $field[0]) {
				return matrix;
			}
		}

		return null;
	}

	// Matrix's own object for a cell's <td> (celltypes such as Assets keep their field instance on it)
	function getMatrixCell(td) {
		if (typeof Matrix === 'undefined' || ! Matrix.instances) {
			return null;
		}

		for (var i = 0; i < Matrix.instances.length; i++) {
			var rows = Matrix.instances[i].rows || [];

			for (var r = 0; r < rows.length; r++) {
				var cells = rows[r].cells || [];

				for (var c = 0; c < cells.length; c++) {
					if (cells[c].dom && cells[c].dom.$td && cells[c].dom.$td[0] === td) {
						return cells[c];
					}
				}
			}
		}

		return null;
	}

	// Key for a cell's preset values: its Matrix column ID (from Matrix, or the input names
	// field_id_N[row_x][col_id_N]...), or its position if there isn't one
	function getColKey($cell, icol) {
		var matrixCell = getMatrixCell($cell[0]);

		if (matrixCell && matrixCell.col && /^col_id_\d+$/.test(matrixCell.col.id)) {
			return matrixCell.col.id;
		}

		var colKey = icol;

		$cell.find('[name]').each(function() {
			var match = String(this.name).match(/\[(col_id_\d+)\]/);

			if (match) {
				colKey = match[1];
				return false;
			}
		});

		return colKey;
	}

	// Add the preset controls to each Matrix field (once)
	function initFields($fields) {
		$fields.each(function() {
			var $field = $(this);

			if ($field.data('matrixPresets')) {
				return;
			}

			var $controls = $(CONTROLS_HTML).data('field', $field).appendTo($field);

			$field.data('matrixPresets', $controls);
			updateSelect($controls);
		});
	}

	// Refresh the preset menu
	function updateSelect($controls) {
		var fieldId = getFieldId($controls.data('field'));
		var $select = $controls.find('select.matrix-preset-select');

		$select.find('option').slice(1).remove();

		$.each(presets[fieldId] || {}, function(presetId, preset) {
			if (preset) {
				// as text, so names can't inject HTML
				$select.append($('<option>').val(presetId).text(preset.name));
			}
		});
	}

	function selectedText($select) {
		return $select.find('option').eq($select.prop('selectedIndex')).text();
	}


	// ------------------------------------------------------------------
	// Buttons

	// Load preset
	$(document).on('click', '.matrix-presets .matrix-preset-load', function() {
		var $controls = $(this).closest('.matrix-presets');
		var $field = $controls.data('field');
		var fieldId = getFieldId($field);
		var presetId = $controls.find('.matrix-preset-select').val();

		if ( ! presetId) {
			return false;
		}

		var preset = presets[fieldId] && presets[fieldId][presetId];

		if ( ! preset) {
			alert('Preset not found');
			return false;
		}

		loadRows($field, preset.values || {}, parseInt(preset.format, 10) || 1);
	});

	// Save preset (new, or overwrite the selected one)
	$(document).on('click', '.matrix-presets .matrix-preset-save', function() {
		var $controls = $(this).closest('.matrix-presets');
		var $field = $controls.data('field');
		var fieldId = getFieldId($field);
		var $select = $controls.find('.matrix-preset-select');
		var $rows = getRows($field);

		if ( ! $rows.length) {
			alert('Add some rows to save them as a preset.');
			return false;
		}

		var presetId = $select.val();
		var presetName;

		if ( ! presetId) {
			presetId = 0;
			presetName = prompt('Please name your preset');

			if ( ! presetName) {
				return false;
			}
		} else {
			presetName = selectedText($select);

			if ( ! confirm("Overwrite this preset?\n'" + presetName + "'")) {
				return false;
			}
		}

		request('save_preset', {
			field_id: fieldId,
			preset_id: presetId,
			name: presetName,
			format: PRESET_FORMAT,
			values: JSON.stringify(collectRows($rows))
		})
			.done(function(response) {
				updateSelect($controls);

				// Select the saved preset
				$select.val(String(response.preset_id));
			})
			.fail(function(jqXHR) {
				alert(errorMessage(jqXHR));
			});
	});

	// Delete preset
	$(document).on('click', '.matrix-presets .matrix-preset-delete', function() {
		var $controls = $(this).closest('.matrix-presets');
		var fieldId = getFieldId($controls.data('field'));
		var $select = $controls.find('.matrix-preset-select');
		var presetId = $select.val();

		if ( ! presetId) {
			return false;
		}

		if ( ! confirm("Are you sure you want to delete this preset?\n'" + selectedText($select) + "'")) {
			return false;
		}

		request('delete_preset', {field_id: fieldId, preset_id: presetId})
			.done(function() {
				updateSelect($controls);
			})
			.fail(function(jqXHR) {
				alert(errorMessage(jqXHR));
			});
	});


	// ------------------------------------------------------------------
	// Requests

	function request(method, data) {
		data = $.extend({field_ids: fieldIds, CSRF_TOKEN: EE.CSRF_TOKEN}, data || {});

		return $.ajax({
			url: URLS[method],
			type: 'POST',
			data: data,
			dataType: 'json'
		}).done(function(response) {
			if (response && response.presets) {
				presets = response.presets;
			}
		});
	}

	function errorMessage(jqXHR) {
		if (jqXHR.status == 403) {
			return "You don't have access to Matrix Presets. An administrator can give your member role access to the add-on.";
		}

		if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
			return jqXHR.responseJSON.error;
		}

		return 'Matrix Presets request failed' + (jqXHR.statusText ? ': ' + jqXHR.statusText : '');
	}


	// ------------------------------------------------------------------
	// Save

	// Rows as [ {columnKey: [input values]} ]
	function collectRows($rows) {
		var rows = [];

		$rows.each(function() {
			var row = {};

			$(this).children('td.matrix').each(function(icol) {
				var $cell = $(this);
				var values = [];

				$cell.find('input, textarea, select').each(function() {
					values.push(inputValue(this));
				});

				row[getColKey($cell, icol)] = values;
			});

			rows.push(row);
		});

		return rows;
	}

	// What's stored for an input (null: nothing to load)
	function inputValue(input) {
		// Not submitted (e.g. Playa's unselected options), a file upload, or Chosen's search box
		if (input.disabled || input.type === 'file' || isChosenInput(input)) {
			return null;
		}

		// Checkboxes and radios: the value only when checked
		if (input.type === 'checkbox' || input.type === 'radio') {
			return input.checked ? $(input).val() : null;
		}

		return $(input).val();
	}

	function isChosenInput(input) {
		return $(input).closest('.chzn-container, .chosen-container').length > 0;
	}


	// ------------------------------------------------------------------
	// Load

	// EE validates each field over AJAX (posting the whole form) when it changes. Filling rows
	// changes many fields at once, so skip those requests while loading; saving still validates.
	var validationPauses = 0;

	function pauseValidation() {
		var validation = EE.cp && EE.cp.formValidation;

		if (validation && typeof validation.pause === 'function') {
			validationPauses++;
			validation.pause(true);
		}
	}

	function resumeValidation() {
		var validation = EE.cp && EE.cp.formValidation;

		if ( ! validation || typeof validation.resume !== 'function') {
			return;
		}

		// Let the celltypes' own delayed change handlers run first
		setTimeout(function() {
			validationPauses = Math.max(0, validationPauses - 1);

			if (validationPauses === 0) {
				validation.resume();
			}
		}, 1000);
	}

	// Add a row for each set of values, then fill them in (up to the field's maximum rows).
	// values: [ {columnKey: [input values]} ]
	function loadRows($field, values, format) {
		var rowKeys = Object.keys(values || {});
		var existingRows = getRows($field).length;
		var matrix = getMatrix($field);

		format = format || PRESET_FORMAT;

		if ( ! rowKeys.length) {
			return;
		}

		pauseValidation();

		$.each(rowKeys, function() {
			if (matrix) {
				// Nothing is added at the field's maximum rows
				if ( ! matrix.addRow()) {
					return false;
				}
			} else {
				$field.children('a.matrix-add').first().trigger('click');
			}
		});

		// Let the new rows' celltypes finish initialising
		setTimeout(function() {
			try {
				getRows($field).slice(existingRows).each(function(irow) {
					if (irow < rowKeys.length) {
						fillRow($(this), values[rowKeys[irow]], format);
					}
				});
			} finally {
				resumeValidation();
			}
		}, 0);
	}

	function fillRow($row, value, format) {
		if (typeof value !== 'object' || value === null) {
			return;
		}

		// Newer presets are keyed by column ID, older ones by column position
		var keyedByColumn = (format >= 2);

		$row.children('td.matrix').each(function(icol) {
			var $cell = $(this);
			var cellValue = value[keyedByColumn ? getColKey($cell, icol) : icol];

			// Column isn't in this preset (e.g. added after the preset was saved)
			if (typeof cellValue !== 'object' || cellValue === null) {
				return;
			}

			fillCell($cell, cellValue, format);
		});
	}

	function fillCell($cell, cellValue, format) {
		var matrixCell = getMatrixCell($cell[0]);
		var celltype = matrixCell ? matrixCell.type : '';

		// Wygwam
		if ($cell.find('.wygwam-textarea').length) {
			fillInputs($cell, cellValue, format);
			fillWygwam($cell);

		// PT List
		} else if ($cell.find('ul.pt-list').length) {
			fillList($cell, cellValue);

		// PT Pill
		} else if ($cell.find('ul.pt-pill').length) {
			fillPill($cell, cellValue);

		// Matrix File
		} else if ($cell.hasClass('matrix-file')) {
			fillFile($cell, cellValue);

		// Playa (drop panes): select the saved entries.
		// Presets before format 3 also stored every unselected option, so leave those alone.
		} else if ($cell.find('.playa-dp').length) {
			if (format >= 3) {
				loadPlayaSelections($cell, cellValue);
			}

		} else {
			fillInputs($cell, cellValue, format);
		}

		// Celltypes that need their display updating

		// PT Switch
		if ($cell.find('ul.pt-switch').length) {
			var switchText = $cell.find('option:selected').text();

			if (switchText === '') {
				$cell.find('ul.pt-switch li:empty').trigger('click');
			} else {
				liContaining($cell.find('ul.pt-switch li'), switchText).trigger('click');
			}
		}

		// Matrix rich text: the editor was created before the textarea was filled
		if (celltype == 'rte') {
			fillRte($cell, 0);
		}

		// EE's React dropdowns (e.g. single Channel Images Select) keep their own state
		refreshDropdowns($cell);

		// Channel Images Select (multi): rebuild the widget from its loaded hidden input
		if ($cell.find('.cis-multi').length && window.ChannelImagesSelectMulti) {
			ChannelImagesSelectMulti.init($cell[0], true);
		}

		// Assets
		if ($cell.hasClass('assets') && typeof Assets !== 'undefined' && typeof Assets.actions !== 'undefined') {
			loadAssetsFiles($cell, cellValue);
		}
	}

	// Inputs in the order they were saved
	function fillInputs($cell, cellValue, format) {
		$cell.find('input, textarea, select').each(function(ifield) {
			var $input = $(this);
			var fieldValue = cellValue[ifield];

			// Not saved, can't be set (file uploads), or not a value (disabled inputs, Chosen's search box)
			if (typeof fieldValue === 'undefined' || this.type === 'file' || this.disabled || isChosenInput(this)) {
				return;
			}

			// Checkboxes and radios (older presets saved every option's value, checked or not, so leave those alone)
			if (this.type === 'checkbox' || this.type === 'radio') {
				if (format >= 2) {
					setChecked($input, !! fieldValue);
				}
				return;
			}

			if (fieldValue === null) {
				return;
			}

			if ($input.is('select')) {
				setSelectValues($input, fieldValue);
			} else {
				$input.val(fieldValue);
			}
		});
	}

	// Only click when the state differs, so options checked by default aren't toggled off.
	// A checked radio can't be unchecked by clicking; checking another option does that.
	function setChecked($input, checked) {
		if ($input.prop('checked') !== checked && (checked || $input.is('[type=checkbox]'))) {
			var $label = $input.closest('label');

			($label.length ? $label : $input).trigger('click');
		}
	}

	// Select the value(s), adding any options that aren't there (as text, so values can't inject HTML)
	function setSelectValues($select, value) {
		var selectValues = Array.isArray(value) ? value : [value];

		$.each(selectValues, function(i, optionValue) {
			if (optionValue === '' || optionValue === null) {
				return;
			}

			var optionExists = $select.find('option').filter(function() {
				return this.value == optionValue;
			}).length > 0;

			if ( ! optionExists) {
				$select.prepend($('<option>').val(optionValue).text(optionValue));
			}
		});

		$select.val($select.prop('multiple') ? selectValues : value);

		// Chosen (e.g. MX Select Plus) only redraws when told to
		$select.trigger('liszt:updated').trigger('chosen:updated');
	}

	// Same as li:contains("text") without building a selector from the text (quotes would break it)
	function liContaining($items, text) {
		return $items.filter(function() {
			return $(this).text().indexOf(text) !== -1;
		});
	}

	// PT List: one list item per value
	function fillList($cell, cellValue) {
		var total = cellValue.length;

		$.each(cellValue, function(i, listValue) {
			if ( ! listValue) {
				return;
			}

			var $item = $cell.find('ul.pt-list li').last();

			if (i != total - 1) {
				$item.clone().insertAfter($item);
			}

			$item.find('input').val(listValue);
		});
	}

	// PT Pill: select the value and highlight its pill
	function fillPill($cell, cellValue) {
		$cell.find('select').each(function(ifield) {
			var fieldValue = cellValue[ifield];

			if ( ! fieldValue) {
				return;
			}

			setSelectValues($(this), fieldValue);

			var selectedText = $(this).find('option:selected').text();
			var $pills = $cell.find('ul.pt-pill li');

			if (selectedText) {
				$pills.removeClass('selected');
				liContaining($pills, selectedText).trigger('click').addClass('selected');
			}
		});
	}

	// Matrix File: the directory and file name inputs, showing the file name
	function fillFile($cell, cellValue) {
		$cell.find('input').each(function(ifield) {
			var fieldValue = cellValue[ifield];

			// File inputs can't be given a value (it throws)
			if (this.type === 'file' || ! fieldValue) {
				return;
			}

			$(this).val(fieldValue);

			if (ifield == 1) {
				$(this).after($('<div class="matrix-filename">').text(fieldValue));
				$cell.find('.matrix-btn.matrix-add').hide();
			}
		});
	}

	// Wygwam: put the loaded textarea content into the cell's editor
	function fillWygwam($cell) {
		var $textarea = $cell.find('textarea[name]').first();
		var id = $textarea.attr('id');
		var html = $textarea.val();
		var editor = (id && window.CKEDITOR && CKEDITOR.instances) ? CKEDITOR.instances[id] : null;

		if (editor) {
			if (editor.status === 'ready') {
				editor.setData(html);
			} else {
				editor.on('instanceReady', function() {
					editor.setData(html);
				});
			}
			return;
		}

		// Deferred editor: a preview until clicked (the editor is then created from the textarea)
		var $preview = $cell.find('iframe.wygwam');

		if ($preview.length && $preview[0].contentWindow) {
			$preview[0].contentWindow.document.body.innerHTML = html;
			return;
		}

		// No editor yet
		if (typeof Wygwam !== 'undefined' && id) {
			var matrixCell = getMatrixCell($cell[0]);
			var config = (matrixCell && Wygwam.matrixColConfigs && Wygwam.matrixColConfigs[matrixCell.col.id])
				|| [$textarea.data('config'), $textarea.data('defer') == 'y'];

			new Wygwam(id, config[0], config[1]);
		}
	}

	// Rich text: the editor is created when the row is added (before the textarea is filled),
	// so pass the content to it once it exists
	function fillRte($cell, attempts) {
		// Matrix's own input (editors can add textareas of their own)
		var textarea = $cell.find('textarea[name]').get(0) || $cell.find('textarea').get(0);

		if ( ! textarea) {
			return;
		}

		var html = textarea.value;

		// RedactorX
		if (window.RedactorX && RedactorX.dom) {
			var redactorX = RedactorX.dom(textarea).dataget(RedactorX.namespace);

			if (redactorX && redactorX.editor) {
				redactorX.editor.setContent({html: html});
				return;
			}
		}

		// Redactor
		if ($cell.find('.redactor-box').length && typeof $R !== 'undefined' && textarea.id) {
			$R('#' + textarea.id, 'source.setCode', html);
			return;
		}

		// CKEditor (created asynchronously)
		var $editable = $cell.find('.ck-editor__editable');

		if ($editable.length && $editable[0].ckeditorInstance) {
			$editable[0].ckeditorInstance.setData(html);
			return;
		}

		// Deferred editor: a preview until clicked (the editor is then created from the textarea)
		var $preview = $cell.find('iframe.rte');

		if ($preview.length && $preview[0].contentWindow) {
			$preview[0].contentWindow.document.body.innerHTML = html;
			return;
		}

		// Editor not ready yet
		if (attempts < 50) {
			setTimeout(function() {
				fillRte($cell, attempts + 1);
			}, 100);
		}
	}

	// Re-render EE's React dropdowns with the loaded value selected (they don't read their hidden input back)
	function refreshDropdowns($cell) {
		if (typeof Dropdown === 'undefined' || typeof ReactDOM === 'undefined') {
			return;
		}

		$cell.find('div[data-dropdown-react]').each(function() {
			var value = $(this).find('input[type=hidden]').first().val();

			if ( ! value) {
				return;
			}

			// A value missing from the options would render empty, so leave those as they are
			var props;

			try {
				props = JSON.parse(window.atob($(this).data('dropdownReact')));
			} catch (e) {
				return;
			}

			if ( ! props || ! hasDropdownItem(props.items, value)) {
				return;
			}

			$(this).data('initialValue', value);
			ReactDOM.unmountComponentAtNode(this);
			Dropdown.renderFields($(this).parent());
		});
	}

	function hasDropdownItem(items, value) {
		var found = false;

		$.each(items || [], function(i, item) {
			if (item && (item.value == value || hasDropdownItem(item.children, value))) {
				found = true;
				return false;
			}
		});

		return found;
	}

	// Assets: add the saved files to a cell
	function loadAssetsFiles($cell, cellValue) {

		// Saved file IDs in order, without repeats (Assets' drag placeholder copies the first file's input)
		var fileIds = [];

		$.each(cellValue, function(i, id) {
			if (id && fileIds.indexOf(String(id)) === -1) {
				fileIds.push(String(id));
			}
		});

		if ( ! fileIds.length) {
			return;
		}

		var matrixCell = getMatrixCell($cell[0]);

		// Let the cell's Assets field add them, so they can be removed, reordered and saved as usual
		if (matrixCell && matrixCell.assetsField && typeof matrixCell.assetsField._selectFiles === 'function') {
			matrixCell.assetsField._selectFiles($.map(fileIds, function(id) {
				return {id: id};
			}));
			return;
		}

		// Otherwise just show the thumbnails
		var $assetsField = $cell.find('.assets-field');
		var fieldName = (matrixCell && matrixCell.field && matrixCell.row && matrixCell.col)
			? matrixCell.field.id + '[' + matrixCell.row.id + '][' + matrixCell.col.id + ']'
			: String($cell.find('input').attr('name') || '').replace(/\[\]$/, '');
		var colMatch = fieldName.match(/\[([^\]]+)\]*$/);
		var colId = colMatch ? colMatch[1] : '';
		var conf = (Assets.Field && Assets.Field.matrixConfs && Assets.Field.matrixConfs[colId]) || {};

		var postData = {
			'ACT': Assets.actions.get_selected_files,
			'field_id': $assetsField.attr('id'),
			'field_name': fieldName,
			'requestId': 1,
			'show_filenames': conf.show_filenames || 'y',
			'thumb_size': conf.thumb_size || 'small',
			'view': conf.view || 'thumbs'
		};

		$.each(fileIds, function(i, id) {
			postData['file_id[' + i + ']'] = id;
		});

		$.ajax({
			url: Assets.siteUrl || '/',
			type: 'POST',
			data: postData,
			dataType: 'json'
		}).done(function(response) {
			if (response.html) {
				$assetsField.find('.assets-thumbview > ul').append(response.html);

				// Thumbnail sizes/images come as CSS
				if (response.css) {
					$('<style>' + response.css + '</style>').appendTo('head');
				}

				// Without the Assets field the buttons can't work, so hide them
				$cell.find('.assets-buttons .assets-btn').slideUp('slow');
			}
		}).fail(function(jqXHR) {
			console.warn('Matrix Presets: Assets files could not be loaded (' + jqXHR.status + ')');
		});
	}

	// Playa (drop panes): move the saved entries into the selections pane, in order,
	// the same way Playa's own select button does
	function loadPlayaSelections($cell, cellValue) {
		var $playa = $cell.find('.playa-dp').first();
		var $options = $playa.find('.playa-dp-options > div > ul');
		var $caboose = $playa.find('.playa-dp-selections > div > ul > li.playa-dp-caboose');
		var selected = 0;

		if ( ! $caboose.length) {
			return;
		}

		$.each(cellValue, function(i, entryId) {
			if ( ! entryId) {
				return;
			}

			// The (unselected) option for this entry
			var $item = $options.children('li.playa-entry').not('.playa-dp-placeholder, .playa-dp-selected').filter(function() {
				return $(this).find('input').val() == entryId;
			}).first();

			if ( ! $item.length) {
				return;
			}

			$item.removeClass('playa-dp-active').addClass('playa-dp-selected');

			// Hold the option's position with a placeholder
			$('<li />').attr('id', $item.attr('id') + '-placeholder').addClass('playa-dp-placeholder').insertAfter($item);

			// Enable inputs
			$item.find('[name]').each(function() {
				var name = $(this).attr('name').match(/^(.*)\[options\](.*)$/);

				if (name) {
					$(this).attr('name', name[1] + '[selections]' + name[2]);
				}

				$(this).removeAttr('disabled');
			});

			$item.insertBefore($caboose);
			selected++;
		});

		if ( ! selected) {
			return;
		}

		// Let Playa pick up the moved items
		var instance = getPlayaInstance($playa[0]);

		if (instance) {
			instance.optionsSelect.updateItems();
			instance.selectionsSelect.updateItems();
		}

		$playa.trigger('change');
	}

	function getPlayaInstance(el) {
		if (typeof PlayaDropPanes === 'undefined' || ! PlayaDropPanes.instances) {
			return null;
		}

		for (var i = 0; i < PlayaDropPanes.instances.length; i++) {
			var instance = PlayaDropPanes.instances[i];

			if (instance.dom && instance.dom.$field && instance.dom.$field[0] === el && instance.optionsSelect && instance.selectionsSelect) {
				return instance;
			}
		}

		return null;
	}

});
