$(document).ready(function(){

//@TODO: need to fully test while secure forms mode is enabled

	// Saved Presets
	var presets = {};
	
	// !! For some reason this is loaded before EE variable is ready and then again later when it is
	if (typeof EE !== 'undefined') {
		
		var AJAX_BASE = EE.BASE + "&C=addons_modules&M=show_module_cp&module=matrix_presets&method=";

		// Need to wait after `document.ready` has finished executing!
		setTimeout(function() {
			
				// Make sure that this is the publish form
				if (!EE.publish)
					return;
				
				$.ajax({
					url: AJAX_BASE + "get_presets",
					type: "POST",
					data: {'CSRF_TOKEN': EE.CSRF_TOKEN},
					dataType: 'json', //json
					success:function(data) {
						if (data.presets) {
							presets = data.presets;
						}
						initPresets(presets);
						EE.CSRF_TOKEN = data.CSRF_TOKEN;
						$('input[name=CSRF_TOKEN]').val(data.CSRF_TOKEN);
					},
					error:function(jqXHR, textStatus, errorMessage) {
						alert(textStatus+': '+errorMessage);
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
			
			var buttonsHTML = '<div style="float:right; margin-top:-12px;" class="matrix-presets" data-field-id="' + fieldId + '"><select class="matrix-preset-select"><option value="">Select A Preset</option></select> <input type="button" name="matrix-preset-load" class="matrix-preset-load" value="Load"> <input type="button" name="matrix-preset-delete" class="matrix-preset-delete" value="Delete"> <input type="button" name="matrix-preset-save" class="matrix-preset-save" value="Save"></div>';
			
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

				var addEntryButton = $('#sub_hold_field_' + fieldId + ' .matrix-btn.matrix-add');

				// Create one row for each value
				for (var i in values)
					addEntryButton.click();

				// Wait for field to finish initializing...
				// ? can we somehow reinitialize the fields after the value has been entered?
				// ! would prefer this to directly altering into the field html
				setTimeout(function() {
					// Skip the placeholder row for "No rows have been added yet..."
					field.find('tbody tr:not(.matrix-norows):visible').filter(':eq('+ numRows + '), :gt(' + numRows + ')').each(function(irow) {
						var value = values[irow];
						$(this).find('td.matrix').each(function(icol) {
									
							// PT List
							if ($(this).closest('td.matrix').find('ul.pt-list').length > 0) {
								for (i in value[icol]) {
									var $cloneField = $(this).closest('td.matrix').find('ul.pt-list li:last');
									$cloneField.find('input').val(value[icol][i]);
									if (i != value[icol].length-1)
										$cloneField.clone().insertAfter($cloneField);
								}
								
							// All Other
							} else {

								var fieldValue = '';
								$(this).find('input, textarea, select').each(function(ifield) {
									if (fieldValue = value[icol][ifield]) {

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
											
										// basics - probably not needed but focus on field in case it needs initializing this way
										} else {
											//$(this).focus().val(value[icol]).blur();
											$(this).val(value[icol]);
											
										}
									}
								});
							
							}

							// ... add more fieldtypes here
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
					$(this).find('input, textarea, select').each(function(ifield) {
						fieldRow[irow][icol][ifield] = $(this).val();
					});
				});
				presetValues[fieldId][presetId].values = fieldRow;
			});
			
			$.ajax({
				url: AJAX_BASE + "save_preset",
				type: "POST",
				data: {'XID': EE.XID, 'preset': presetValues, 'newpreset': newPreset},
				dataType: 'json', //json
				success:function(data) {
					presets = data.presets;
					updateSelects(presets, fieldId);
					EE.XID = data.XID;
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

			$.ajax({
				url: AJAX_BASE + "delete_preset",
				type: "POST",
				data: {'XID': EE.XID, 'id': fieldId, 'presetId': presetId},
				dataType: 'json',
				success:function(data) {
					presets = data.presets;
					updateSelects(presets, fieldId);
					EE.XID = data.XID;
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
