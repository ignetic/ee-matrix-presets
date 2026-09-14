
/************************************
/* Matrix Presets - matrix_presets.js
/************************************/

$(document).ready(function(){

	// Saved Presets
	var presets = {};

	// Preset format 2: values keyed by column ID, checkboxes/radios store their checked state.
	// Older presets are keyed by column position and store every checkbox/radio value.
	var PRESET_FORMAT = 2;

	// Matrix fields as well as Henshu support
	var matrixFields = $('.form-standard fieldset .field-control div.matrix, #publishForm .publish_field.publish_matrix div.matrix, .publish .setting-field > div.matrix, .pageContents.group form.henshu .henshu_encapsulate:has("table.matrix") div.matrix');

	// !! For some reason this is loaded before EE variable is ready and then again later when it is
	if (typeof EE !== 'undefined') {

		var AJAX_BASE = '<?php echo $base; ?>';
		EE.SESSION = '';

		if (AJAX_BASE == '') {
			AJAX_BASE = EE.BASE + "&C=addons_modules&M=show_module_cp&module=matrix_presets&method=";
		} else {
			var session = EE.BASE.match(/(S=[\w\d]+)/);
			if (session) {
				EE.SESSION = EE.BASE.match(/(S=[\w\d]+)/)[0];
			}
		}

		// Pre EE 2.8 support
		var CSRF_TOKEN_NAME = 'CSRF_TOKEN';

		if (!EE.CSRF_TOKEN) {
			EE.CSRF_TOKEN = EE.XID;
			CSRF_TOKEN_NAME = 'XID';
		}

		// Get matrix field ids
		var fieldIds = new Array();
		matrixFields.each(function() {
			if ($(this).attr('id')) {
				var fieldId = parseInt($(this).attr('id').replace('field_id_',''), 10);
				if (fieldId) {
					fieldIds.push(fieldId);
				}
			}
		});

		// Need to wait after `document.ready` has finished executing!
		setTimeout(function() {

				// Make sure that this is the publish form and it has matrix fields
				// (otherwise get_presets would return every preset on the site)
				if (!EE.publish || fieldIds.length == 0)
					return;

				var postData = {'field_ids': fieldIds};
				postData[CSRF_TOKEN_NAME] = EE.CSRF_TOKEN;

				$.ajax({
					url: AJAX_BASE + "get_presets&" + EE.SESSION,
					type: "POST",
					data: postData,
					dataType: 'json', //json
					success:function(data) {
						if (data.presets) {
							presets = data.presets;
						}
						initPresets(presets);
						EE.CSRF_TOKEN = data.CSRF_TOKEN;
						$('input[name='+CSRF_TOKEN_NAME+']').val(data.CSRF_TOKEN);
					},
					error:function(jqXHR, textStatus, errorMessage) {
						console.log('Matrix Presets - '+textStatus+': '+errorMessage);
					}
				});

		}, 0);

	}

	// start the process
	function initPresets(presets) {

		matrixFields.each(function() {

			//var fieldId = $(this).attr('id').replace('hold_field_','');
			var fieldId;
			if ($(this).attr('id')) {
				fieldId = $(this).attr('id').replace('field_id_','');
			}

			if ( ! fieldId)
				return true;

			var buttonsHTML = '<div style="float:right; margin-top:-12px;" class="matrix-presets" data-field-id="' + fieldId + '"><select class="matrix-preset-select" style="padding:3px 15px!important; margin-top:5px;"><option value="">- Select A Preset -</option></select> <input type="button" name="matrix-preset-load" class="matrix-preset-load btn button--small" value="Load" style="padding:5px 15px!important; margin-top:5px;"> <input type="button" name="matrix-preset-delete" class="matrix-preset-delete btn remove button--small" value="Delete" style="padding:5px 15px!important; margin-top:5px;"> <input type="button" name="matrix-preset-save" class="matrix-preset-save btn action button--small" value="Save" style="padding:5px 15px!important; margin-top:5px;"></div>';

			var presetButtons = $(buttonsHTML).appendTo($(this));

			updateSelects(presets, fieldId);

		});


		// Load preset button
		matrixFields.find('.matrix-preset-load').on('click', this, function() {

			var $field = $(this).closest('div.matrix');
			var fieldId = $(this).closest('.matrix-presets').data('field-id');
			var presetId = $field.find('.matrix-preset-select').val();

			if (fieldId && presetId != "") {

				var $rows = $field.find('tbody tr:not(.matrix-norows):visible');
				//if (!$rows.length)
				//	return false;

				if (typeof presets[fieldId] == 'undefined' || typeof presets[fieldId][presetId] == 'undefined') {
					alert('Preset not found');
					return false;
				}

				var preset = presets[fieldId][presetId];
				var values = preset.values || {};

				// Newer presets are keyed by column ID, older ones by column position
				var keyedByColumn = (parseInt(preset.format, 10) >= PRESET_FORMAT);

				// Only matrix visible fields
				var numRows = $rows.length;

				var addEntryButton = $field.find('> a.matrix-btn.matrix-add');

				// Create one row for each value
				for (var i in values)
					addEntryButton.click();

				// Wait for field to finish initializing...
				setTimeout(function() {
					// Skip the placeholder row for "No rows have been added yet..."
					$field.find('tbody tr:not(.matrix-norows):visible').slice(numRows).each(function(irow) {

						var $row = $(this);
						var value = values[irow];

						if (typeof value !== 'object' || value === null)
							return true;

						$(this).find('> td.matrix').each(function(icol) {

							var $cell = $(this);
							var fieldValue = '';
							var cellValue = value[keyedByColumn ? getColKey($cell, icol) : icol];

							// Column isn't in this preset (e.g. added after the preset was saved)
							if (typeof cellValue !== 'object' || cellValue === null)
								return true;

							// Wygwam
							if ($(this).find('.wygwam-textarea').length > 0) {

							$(this).find('textarea').each(function(ifield) {
								if (typeof cellValue[ifield] !== "undefined") {
									//refreshWygwam();
									var fieldValue = cellValue[ifield];
									$(this).val(fieldValue);
									if (typeof Wygwam !== "undefined") {
										var field_id = $(this).attr('id');
										var config_handle = $('#'+field_id).data('config');
										var defer = $('#'+field_id).data('defer');

										if(defer === 'n') defer = false;

										new Wygwam(field_id, config_handle, defer);
									}
								}
							});

							// PT List
							} else if ($(this).find('ul.pt-list').length > 0) {

								for (var i in cellValue) {
									if (fieldValue = cellValue[i]) {

										var $cloneField = $(this).closest('td.matrix').find('ul.pt-list li:last');

										if (i != cellValue.length-1)
											$cloneField.clone().insertAfter($cloneField);

										$cloneField.find('input').val(cellValue[i]);
									}
								}

							// PT Pill
							} else if ($(this).find('ul.pt-pill').length > 0) {

								$(this).find('select').each(function(ifield) {
									if (fieldValue = cellValue[ifield]) {

										// select option
										setSelectValue($(this), fieldValue);

										// show selected
										if ($(this).find('option:selected').length > 0) {
											$(this).closest('td.matrix').find('ul.pt-pill li').removeClass('selected');
											var selectedText = $(this).find('option:selected').text();
											if ($(this).closest('td.matrix').find('ul.pt-pill li.selected').text() != selectedText) {
												liContaining($(this).closest('td.matrix').find('ul.pt-pill li'), selectedText).click().addClass('selected');
											}
										}

									}
								});

							} else if ($(this).hasClass('matrix-file')) {

								$(this).find('input').each(function(ifield) {
									// file inputs can't be given a value (it throws)
									if (this.type === 'file')
										return true;

									if (fieldValue = cellValue[ifield]) {

										$(this).val(fieldValue);

										if (ifield == 1) {
											$(this).after($('<div class="matrix-filename">').text(fieldValue));
											$cell.find('.matrix-btn.matrix-add').hide();
										}
									}
								});

							// All Other Basic Fields
							} else {

								$(this).find('input, textarea, select').each(function(ifield) {

									// file inputs can't be given a value (it throws)
									if (typeof cellValue[ifield] !== "undefined" && this.type !== 'file') {

										var $input = $(this);
										var fieldValue = cellValue[ifield];

										// find multiselect value (there is a hidden field within this too)
										if ($input.is('select[multiple]')) {
											$input.val(fieldValue);

										// select option or populate if value not found
										} else if ($input.is('select')) {
											setSelectValue($input, fieldValue);

										// checkboxes and radios (older presets saved every option's value, checked or not, so leave those alone)
										} else if ($input.is('input:checkbox, input:radio')) {
											if (keyedByColumn) {
												var checked = !!fieldValue;

												// Only click when the state differs, so options checked by default aren't toggled off.
												// A checked radio can't be unchecked by clicking; checking another option does that.
												if ($input.prop('checked') !== checked && (checked || $input.is(':checkbox'))) {
													var $label = $input.closest('label');
													($label.length ? $label : $input).click();
												}
											}

										// basics
										} else {
											$input.val(fieldValue);
										}

									}

								});

							}


							// Fieldtype cleanup and show selected

							// PT Switch
							if ($(this).find('ul.pt-switch').length > 0) {
								if ($(this).find('option:selected').text() == ""){
									$(this).find('ul.pt-switch li:empty').click();
								} else {
									liContaining($(this).find('ul.pt-switch li'), $(this).find('option:selected').text()).click();
								}

							}

							// MX Select Plus
							if ($(this).find('.chzn-container').length > 0) {
								if(jQuery().trigger) {
									$(this).find('select').trigger('liszt:updated').trigger("chosen:updated");
								}
							}

							// EE's React dropdowns (e.g. single Channel Images Select) keep their own state
							refreshDropdowns($cell);

							// Channel Images Select (multi): rebuild the widget from its loaded hidden input
							if ($(this).find('.cis-multi').length && window.ChannelImagesSelectMulti) {
								ChannelImagesSelectMulti.init(this, true);
							}

							// Assets
							if ($(this).hasClass('assets') && typeof Assets !== 'undefined' && typeof Assets.actions !== 'undefined') {
								loadAssetsFiles($cell, cellValue);
							}

							// ... add more fieldtypes here

							// Ideally we would reinitialize the fields via the Matrix field class after the values has been entered...??!


						});
					});
				}, 0);

			}

		});


		// Save preset button
		matrixFields.find('.matrix-preset-save').on('click', function() {

			var $field = $(this).closest('div.matrix');
			var fieldId = $(this).closest('.matrix-presets').data('field-id');
			//var groupId = EE.publish.field_group;

			if (!fieldId)
				return false;

			// if no rows exist, do nothing
			var $rows = $field.find('tbody tr:not(.matrix-norows):visible');
			if (!$rows.length)
				return false;

			var presetId = $field.find('.matrix-preset-select').val();
			var presetName = $field.find('.matrix-preset-select option:selected').text();

			// Is this a new preset?
			var newPreset = false;
			if (!presetId) {
				newPreset = true;
				presetId = 0;

				presetName = prompt("Please name your preset");

				if (!presetName)
					return false;
			} else {

				var answer = confirm("Overwrite this preset?\n'"+presetName+"'");

				if (!answer)
					return false;
			}

			// Get the row data and save
			var numRows = $rows.length;

			// simpler to use objects when sending to PHP
			var presetValues = {}
			presetValues[fieldId] = {}
			presetValues[fieldId][presetId] = {'name':presetName, 'format':PRESET_FORMAT};

			var fieldRow = {};

			// search all field types (more to add)
			$rows.each(function(irow) {
				fieldRow[irow] = {};
				$(this).find('td.matrix').each(function(icol) {
					var colKey = getColKey($(this), icol);
					fieldRow[irow][colKey] = {};
					$(this).find('input, textarea, select').each(function(ifield) {
						// checkboxes and radios only store their value when checked
						if ($(this).is('input:checkbox, input:radio')) {
							fieldRow[irow][colKey][ifield] = $(this).prop('checked') ? $(this).val() : null;
						} else {
							fieldRow[irow][colKey][ifield] = $(this).val();
						}
					});
				});
			});

			presetValues[fieldId][presetId].values = fieldRow;

			var postData = {'field_ids': fieldIds, 'preset': presetValues, 'newpreset': newPreset};
			postData[CSRF_TOKEN_NAME] = EE.CSRF_TOKEN;

			$.ajax({
				url: AJAX_BASE + "save_preset&" + EE.SESSION,
				type: "POST",
				data: postData,
				dataType: 'json', //json
				success:function(data) {
					presets = data.presets;
					updateSelects(presets, fieldId);
					EE.CSRF_TOKEN = data.CSRF_TOKEN;
				},
				error:function(jqXHR, textStatus, errorMessage) {
					alert(textStatus+': '+errorMessage);
				}
			});



		});

		// Delete preset button
		matrixFields.find('.matrix-preset-delete').on('click', this, function() {

			var $field = $(this).closest('div.matrix');
			var fieldId = $(this).closest('.matrix-presets').data('field-id');
			//var groupId = EE.publish.field_group;

			var presetId = $field.find('.matrix-preset-select').val();
			var presetName = $field.find('.matrix-preset-select option:selected').text();

			if (!fieldId || !presetId)
				return false;

			var answer = confirm("Are you sure you want to delete this preset? \n'"+presetName+"'");

			if (!answer)
				return false;

			var postData = {'field_ids': fieldIds, 'field_id': fieldId, 'preset_id': presetId};
			postData[CSRF_TOKEN_NAME] = EE.CSRF_TOKEN;

			$.ajax({
				url: AJAX_BASE + "delete_preset&" + EE.SESSION,
				type: "POST",
				data: postData,
				dataType: 'json',
				success:function(data) {
					presets = data.presets;
					updateSelects(presets, fieldId);
					EE.CSRF_TOKEN = data.CSRF_TOKEN;
				},
				error:function(jqXHR, textStatus, errorMessage) {
					alert(textStatus+': '+errorMessage);
				}
			});

		});

	}

	// Update preset select menu for this field
	function updateSelects(presets, fieldId) {

		// remove any if already added
		var presetSelect = $('#field_id_'+fieldId+'.matrix select.matrix-preset-select');
		presetSelect.find('option:not(:first)').remove();

		// search presets array to add to the individual select menus
		if (typeof presets[fieldId] != 'undefined') {
			// add options to selects (as text, so names can't inject HTML)
			for (var i in presets[fieldId]) {
				if (presets[fieldId][i]) {
					presetSelect.append($('<option>').val(i).text(presets[fieldId][i].name));
				}
			}

		}
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

	// Select an option, adding it first if it doesn't exist (as text, so values can't inject HTML)
	function setSelectValue($select, value) {
		var optionExists = $select.find('option').filter(function() {
			return this.value == value;
		}).length > 0;
		if ( ! optionExists) {
			$select.prepend($('<option>').val(value).text(value));
		}
		$select.val(value);
	}

	// Same as li:contains("text") without building a selector from the text (quotes would break it)
	function liContaining($items, text) {
		return $items.filter(function() {
			return $(this).text().indexOf(text) !== -1;
		});
	}

	// Matrix's own object for a cell's <td> (celltypes such as Assets keep their field instance on it).
	// Matrix only sets up a field's rows once it's visible, so this can be null.
	function getMatrixCell(td) {
		if (typeof Matrix === 'undefined' || ! Matrix.instances)
			return null;

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

	// Assets: add the saved files to a cell
	function loadAssetsFiles($cell, cellValue) {

		// Saved file IDs in order, without repeats (Assets' drag placeholder copies the first file's input)
		var fileIds = [];
		$.each(cellValue, function(i, id) {
			if (id && $.inArray(String(id), fileIds) === -1) {
				fileIds.push(String(id));
			}
		});

		if ( ! fileIds.length)
			return;

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
		var field_name = (matrixCell && matrixCell.field && matrixCell.row && matrixCell.col)
			? matrixCell.field.id+'['+matrixCell.row.id+']['+matrixCell.col.id+']'
			: ($cell.find('input').attr('name') || '').replace(/\[\]$/, "");
		var col_match = field_name.match(/\[([^\]]+)\]*$/);
		var col_id = col_match ? col_match[1] : '';

		var postData = {
			'ACT': Assets.actions.get_selected_files,
			'field_id': $assetsField.attr('id'),
			'field_name': field_name,
			'requestId': 1,
			'show_filenames': 'y',
			'thumb_size': 'small',
			'view': 'thumbs'
		};
		// get settings
		if (Assets.Field && Assets.Field.matrixConfs && typeof Assets.Field.matrixConfs[col_id] !== 'undefined') {
			postData['show_filenames'] = Assets.Field.matrixConfs[col_id].show_filenames;
			postData['thumb_size'] = Assets.Field.matrixConfs[col_id].thumb_size;
			postData['view'] = Assets.Field.matrixConfs[col_id].view;
		}

		$.each(fileIds, function(i, id) {
			postData['file_id['+i+']'] = id;
		});

		// Get thumbnails
		$.ajax({
			url: Assets.siteUrl || "/",
			type: "POST",
			data: postData,
			dataType: 'json',
			success:function(data) {
				if (data.html) {
					$assetsField.find('.assets-thumbview ul').append(data.html);

					// Thumbnail sizes/images come as CSS
					if (data.css) {
						$('<style>' + data.css + '</style>').appendTo('head');
					}

					// Can't use buttons correctly so let's just hide them
					$cell.find('.assets-buttons .assets-btn').slideUp('slow');
				}
			},
			error:function(jqXHR, textStatus, errorMessage) {
				alert(textStatus+': '+errorMessage);
			}
		});
	}

	// Re-render EE's React dropdowns with the loaded value selected (they don't read their hidden input back)
	function refreshDropdowns($cell) {
		if (typeof Dropdown === 'undefined' || typeof ReactDOM === 'undefined')
			return;

		$cell.find('div[data-dropdown-react]').each(function() {
			var value = $(this).find('input[type=hidden]').first().val();

			if ( ! value)
				return;

			// A value missing from the options would render empty, so leave those as they are
			var props;
			try {
				props = JSON.parse(window.atob($(this).data('dropdownReact')));
			} catch (e) {
				return;
			}

			if ( ! props || ! hasDropdownItem(props.items, value))
				return;

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


});
