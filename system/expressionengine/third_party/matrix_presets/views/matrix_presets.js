$(document).ready(function(){

	// Saved Presets
	var presets = {};
	
	// Matrix fields as well as Henshu support
	var matrixFields = $('#publishForm .publish_field.publish_matrix, .pageContents.group form.henshu .henshu_encapsulate:has("table.matrix")');
	
	// !! For some reason this is loaded before EE variable is ready and then again later when it is
	if (typeof EE !== 'undefined') {
		
		var AJAX_BASE = EE.BASE + "&C=addons_modules&M=show_module_cp&module=matrix_presets&method=";
		
		// Pre EE 2.8 support
		var CSRF_TOKEN_NAME = 'CSRF_TOKEN';
		
		if (!EE.CSRF_TOKEN) {
			EE.CSRF_TOKEN = EE.XID;
			CSRF_TOKEN_NAME = 'XID';
		}
		
		// Get matrix field ids
		var fieldIds = new Array();
		matrixFields.each(function() {
			var fieldId = $(this).find('div.matrix:first').attr('id').replace('field_id_','');
			fieldIds.push(parseInt(fieldId));
		});
				
		// Need to wait after `document.ready` has finished executing!
		setTimeout(function() {
			
				// Make sure that this is the publish form
				if (!EE.publish)
					return;

				var postData = {'field_ids': fieldIds};
				postData[CSRF_TOKEN_NAME] = EE.CSRF_TOKEN;
				
				$.ajax({
					url: AJAX_BASE + "get_presets",
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

		// Matrix fields as well as Henshu support
		var matrixFields = $('#publishForm .publish_field.publish_matrix, .pageContents.group form.henshu .henshu_encapsulate:has("table.matrix")');
		
		matrixFields.each(function() {
			
			//var fieldId = $(this).attr('id').replace('hold_field_','');
			var fieldId = $(this).find('div.matrix:first').attr('id').replace('field_id_','');

			if ( ! fieldId)
				return true;
			
			var buttonsHTML = '<div style="float:right; margin-top:-12px;" class="matrix-presets" data-field-id="' + fieldId + '"><select class="matrix-preset-select"><option value="">- Select A Preset -</option></select> <input type="button" name="matrix-preset-load" class="matrix-preset-load" value="Load"> <input type="button" name="matrix-preset-delete" class="matrix-preset-delete" value="Delete"> <input type="button" name="matrix-preset-save" class="matrix-preset-save" value="Save"></div>';
			
			var presetButtons = $(buttonsHTML).appendTo($(this).find('div.matrix'));
			
			updateSelects(presets, fieldId);
			
		});
		
		
		// Load preset button
		matrixFields.find('div.matrix .matrix-preset-load').on('click', function() {

			var fieldId = $(this).closest('.matrix-presets').data('field-id');
			var presetId = $(this).parent().find('.matrix-preset-select').val();

			if (fieldId && presetId != "") {
				
				//var answer = confirm("Are you sure you want to load this preset?");
				
				//if (!answer)
				//	return false;

				var field = $(this).closest('#sub_hold_field_' + fieldId);
				
				if (typeof presets[fieldId] == 'undefined') {
					alert('Preset not found');
					return false;
				}
				
				var values = presets[fieldId][presetId].values;

				// Only matrix visible fields
				var numRows = field.find('tbody tr:not(.matrix-norows):visible').length;

				var addEntryButton = $('#sub_hold_field_' + fieldId + ' > .holder > div.matrix > a.matrix-btn.matrix-add');

				// Create one row for each value
				for (var i in values)
					addEntryButton.click();

				// Wait for field to finish initializing...
				setTimeout(function() {
					// Skip the placeholder row for "No rows have been added yet..."
					field.find('tbody tr:not(.matrix-norows):visible').filter(':eq('+ numRows + '), :gt(' + numRows + ')').each(function(irow) {
						
						var value = values[irow];
						
						$(this).find('> td.matrix').each(function(icol) {
						
							var $cell = $(this);
							var fieldValue = '';

							// PT List
							if ($(this).find('ul.pt-list').length > 0) {
								
								for (i in value[icol]) {
									if (fieldValue = value[icol][i]) {

										var $cloneField = $(this).closest('td.matrix').find('ul.pt-list li:last');
										
										if (i != value[icol].length-1)
											$cloneField.clone().insertAfter($cloneField);
										
										$cloneField.find('input').val(value[icol][i]);
									}
								}
								
							// PT Pill
							} else if ($(this).find('ul.pt-pill').length > 0) {
								
								$(this).find('select').each(function(ifield) {
									if (fieldValue = value[icol][ifield]) {
										
										// select option
										if ($(this).find("option[value='"+fieldValue+"']").length > 0) {
											$(this).val(fieldValue);								
										} else {
											$(this).prepend('<option value="'+value[icol]+'">'+value[icol]+'</option>').val(fieldValue);
										}
										// show selected
										if ($(this).find('option:selected').length > 0) {
											$(this).closest('td.matrix').find('ul.pt-pill li').removeClass('selected');
											var selectedText = $(this).find('option:selected').text();
											if ($(this).closest('td.matrix').find('ul.pt-pill li.selected').text() != selectedText) {
												$(this).closest('td.matrix').find('ul.pt-pill li:contains("'+selectedText+'")').click().addClass('selected');
											}
										}

									}
								});
							
							} else if ($(this).hasClass('matrix-file')) {
								
								$(this).find('input').each(function(ifield) {
									if (fieldValue = value[icol][ifield]) {

										$(this).val(fieldValue);
										
										if (ifield == 1) {
											$(this).after('<div class="matrix-filename">'+fieldValue+'</div>');
											$cell.find('.matrix-btn.matrix-add').hide();
										}
									}
								});
							
							// All Other Basic Fields
							} else {

								$(this).find('input, textarea, select, radio').each(function(ifield) {

									if (typeof value[icol][ifield] !== "undefined") {
										
										var fieldValue = value[icol][ifield];

										// find multiselect value (there is a hidden field within this too)
										if ($(this).is('select[multiple]')) {
											$(this).val(fieldValue);
											
										// select option or populate if value not found
										} else if ($(this).is('select')) {
											if ($(this).find("option[value='"+fieldValue+"']").length > 0) {
												$(this).val(fieldValue);
											} else {
												$(this).prepend('<option value="'+value[icol]+'">'+value[icol]+'</option>').val(fieldValue);
											}

										// basics
										} else {
											$(this).val(fieldValue);
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
									$(this).find('ul.pt-switch li:contains("'+$(this).find('option:selected').text()+'")').click();
								}
								
							}

							// MX Select Plus
							if ($(this).find('.chzn-container').length > 0) {
								if(jQuery().trigger) {
									$(this).find('select').trigger('liszt:updated').trigger("chosen:updated");
								}
							}					

							// Assets
							if ($(this).hasClass('assets') && typeof Assets.actions !== 'undefined') {
									
								var $assetsField = $(this).find('.assets-field')
								var field_id = $assetsField.attr('id');
								
								// Can't we access the Matrix Cell object directly?! So we shall get info directly from field:
								var field_name = $(this).find('input').attr('name').replace(/\[\]$/, "");
								var col_id = field_name.match(/\[([^\]]+)\]*$/)[1];
								
								var postData = {
									'ACT': Assets.actions.get_selected_files,
									'field_id': field_id,
									'field_name': field_name,
									'requestId': icol,
									'show_filenames': 'y',
									'thumb_size': 'small',
									'view': 'thumbs'
								};
								// get settings
								if (typeof Assets.Field.matrixConfs[col_id] !== 'undefined') {
									postData['show_filenames'] = Assets.Field.matrixConfs[col_id].show_filenames;
									postData['thumb_size'] = Assets.Field.matrixConfs[col_id].thumb_size;
									postData['view'] = Assets.Field.matrixConfs[col_id].view;
								}
								
								// Add images
								if ($.isArray(value[icol])) {
									for (i in value[icol]) {
										postData['file_id['+i+']'] = value[icol][i];
									}
								}								

								// Get thumbnails
								$.ajax({
									url: "/",
									type: "POST",
									data: postData,
									dataType: 'json', 
									success:function(data) {
										if (data.html) {
											$assetsField.find('.assets-thumbview ul').append(data.html);

											// Can't use buttons correctly so let's just hide them
											$cell.find('.assets-buttons .assets-btn').slideUp('slow');
											
										}
										
									},
									error:function(jqXHR, textStatus, errorMessage) {
										alert(textStatus+': '+errorMessage);
									} 
								});											
							
							}
							
							// ... add more fieldtypes here
							
							// Ideally we would reinitialize the fields via the Matrix field class after the values has been entered...??!
							
							
						});
					});
				}, 0);

			}
			
		});
		
		
		// Save preset button
		matrixFields.find('div.matrix .matrix-preset-save').on('click', function() {
		
			var field = $(this).closest('div.matrix');
			var fieldId = $(this).closest('.matrix-presets').data('field-id');
			//var groupId = EE.publish.field_group;

			if (!fieldId)
				return false;
			
			// if no rows exist, do nothing
			if (!field.find('tbody tr:not(.matrix-norows):visible').length)
				return false;
			
			var presetId = $(this).parent().find('.matrix-preset-select').val();
			var presetName = $(this).parent().find('.matrix-preset-select option:selected').text();
			
			// Is this a new preset?
			var newPreset = false;
			if (!presetId) {
				newPreset = true;
				presetId = 0;
				
				presetName = prompt("Please name your preset");
				
				if (!presetName)
					return false;
			} else {
			
				var answer = confirm("Overwrite this preset?");
				
				if (!answer)
					return false;
			}

			// Get the row data and save
			var numRows = field.find('tbody tr:not(.matrix-norows):visible').length;
			
			// simpler to use objects when sending to PHP
			var presetValues = {}
			presetValues[fieldId] = {}
			presetValues[fieldId][presetId] = {'name':presetName};
			
			var fieldRow = {};
			
			// search all field types (more to add)
			field.find('tbody tr:not(.matrix-norows):visible').each(function(irow) {
				fieldRow[irow] = {};
				$(this).find('td.matrix').each(function(icol) {
					fieldRow[irow][icol] = {};
					$(this).find('input, textarea, select, radio').each(function(ifield) {
						fieldRow[irow][icol][ifield] = $(this).val();
					});
				});
				presetValues[fieldId][presetId].values = fieldRow;
			});
			
			var postData = {'field_ids': fieldIds, 'preset': presetValues, 'newpreset': newPreset};
			postData[CSRF_TOKEN_NAME] = EE.CSRF_TOKEN;
			
			$.ajax({
				url: AJAX_BASE + "save_preset",
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
		matrixFields.find('div.matrix .matrix-preset-delete').on('click', function() {
		
			var field = $(this).closest('div.matrix');
			var fieldId = $(this).closest('.matrix-presets').data('field-id');
			//var groupId = EE.publish.field_group;

			var presetId = $(this).parent().find('.matrix-preset-select').val();
			
			if (!fieldId || !presetId)
				return false;
				
			var answer = confirm("Are you sure you want to delete this preset?");
			
			if (!answer)
				return false;

			var postData = {'field_ids': fieldIds, 'field_id': fieldId, 'preset_id': presetId};
			postData[CSRF_TOKEN_NAME] = EE.CSRF_TOKEN;
			
			$.ajax({
				url: AJAX_BASE + "delete_preset",
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
			// add options to selects
			for (var i in presets[fieldId]) {
				if (typeof presets[fieldId][i] != 'undefined') {
					presetSelect.append('<option value="'+ i +'">'+ presets[fieldId][i].name +'</option>');
				}
			}
		
		}
	}


});
