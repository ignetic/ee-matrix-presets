<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/**
 * ExpressionEngine Matrix Presets Control Panel File
 *
 * @package		Matrix Presets
 * @subpackage	Addons
 * @category	Module
 * @author		Simon Andersohn
 * @link		
 */
 
require_once PATH_THIRD.'matrix_presets/config.php';

class Matrix_presets_mcp {
	
	public $name = MATRIX_PRESETS_NAME;
	public $version = MATRIX_PRESETS_VERSION; 
	
	public $return_data;
	
	private $EE;
	private $class = 'Matrix_presets';
	private $settings_table = 'matrix_presets_settings';
	private $site_id = 1;
	private $csrf_token;
	

	/**
	 * Constructor
	 */
	public function __construct()
	{
		// pre EE 2.6.0 compatibility
		$this->EE = get_instance();
		
		$this->site_id = $this->EE->config->item('site_id');
		
		if(defined('CSRF_TOKEN'))
		{
			$this->csrf_token = CSRF_TOKEN;
		}
		else
		{
			$this->csrf_token = ee()->security->restore_xid();
		} 
		
	}
	
	// ----------------------------------------------------------------

	/**
	 * Index Function
	 *
	 * @return 	void
	 */
	public function index()
	{
		// If this isn't an AJAX request, just display the "base" settings form.
		if ( ! $this->EE->input->is_ajax_request())
		{
			if ( version_compare( APP_VER, '2.6.0', '<' ) )
			{
				$this->EE->cp->set_variable( 'cp_page_title', lang('matrix_presets_module_name') );
			}
			else
			{
				$this->EE->view->cp_page_title = lang('matrix_presets_module_name');
			}
			
			return "Nothing to see here...";
		}

	}

	
	/**
	 * Get presets
	 */
	 
	public function get_presets($field_ids=array(), $ajax=TRUE)
	{
		
		$presets = array();

		if ($this->EE->input->post('field_ids') !== FALSE)
		{
			$field_ids = $this->EE->input->post('field_ids');
			
		}
		if (is_array($field_ids) && !empty($field_ids))
		{
			$this->EE->db->where_in('field_id', $field_ids);
		}

		$query = $this->EE->db->where('site_id', $this->site_id)->get($this->settings_table);
		
		if ($query->num_rows() > 0)
		{
			foreach ($query->result_array() as $row)
			{
				$presets[$row['field_id']][$row['preset_id']] = unserialize($row['preset_values']);
			}
		}
		elseif ($this->EE->db->field_exists('settings', 'modules'))
		{
				// Try old settings
				$query = $this->EE->db->select('settings')->where('module_name', $this->class)->get('modules');
				foreach ($query->result_array() as $row)
				{
					$presets = unserialize($row['settings']);
				}
		}
		
		if ($ajax === TRUE)
		{
			$this->EE->output->send_ajax_response(array('presets' => $presets, 'CSRF_TOKEN' => $this->csrf_token));
		}
		else
		{
			return $presets;
		}
	}	

	
	/**
	 * Save presets
	 */
	
	public function save_preset()
	{
	
		$field_ids = array();
		
		if ($this->EE->input->post('field_ids') !== FALSE)
		{
			$field_ids = $this->EE->input->post('field_ids');
		}
		
		if($this->EE->input->post('preset')) 
		{
			$preset = $this->EE->input->post('preset');
			$newpreset = $this->EE->input->post('newpreset');
			
			foreach($preset as $field_id => $val)
			{
				$fields = array();
				$fields['site_id'] = $this->site_id;
				$fields['field_id'] = $field_id;
				$fields['serialized'] = 1;
				
				foreach($val as $preset_id => $preset_values)
				{
	
					// is this a new preset?... get highest key
					if ($newpreset == 'true' && $preset_id == 0){
						$query = $this->EE->db->select_max('preset_id')->from($this->settings_table)->where($fields)->get();
						if ($query->num_rows() > 0)
						{
							foreach ($query->result_array() as $row)
							{
								$preset_id = (int) $row['preset_id'];
							}
						}
						$preset_id++;
					}

					$fields['preset_id'] = $preset_id;
				
					$this->EE->db->from($this->settings_table);
					$this->EE->db->where($fields);
					if ($this->EE->db->count_all_results() == 0) 
					{
						
						$fields['preset_values'] = serialize($preset_values);
						$query = $this->EE->db->insert($this->settings_table, $fields);
					
					}
					else
					{
						$query = $this->EE->db->update($this->settings_table, array('preset_values' => serialize($preset_values)), $fields);
					}
					
				}
			}
			
		}
		
		$this->EE->output->send_ajax_response(array('presets' => $this->get_presets($field_ids, TRUE), 'CSRF_TOKEN' => $this->csrf_token));
		
	}
	
	
	/**
	 * Delete presets
	 */
	
	public function delete_preset()
	{
		// Get existing presets
		$field_ids = array();
		
		if ($this->EE->input->post('field_ids') !== FALSE)
		{
			$field_ids = $this->EE->input->post('field_ids');
		}		
		
		// Delete
		$presets = array();
		$field_id = $this->EE->input->post('field_id');
		$preset_id = $this->EE->input->post('preset_id');
		
		if ($field_id && $preset_id)
		{
			$this->EE->db->delete($this->settings_table, array('site_id' => $this->site_id, 'field_id' => $field_id, 'preset_id' => $preset_id)); 
			
		}
		
		$this->EE->output->send_ajax_response(array('presets' => $this->get_presets($field_ids, TRUE), 'CSRF_TOKEN' => $this->csrf_token));
	}
	
}
/* End of file mcp.matrix_presets.php */
/* Location: /system/expressionengine/third_party/matrix_presets/mcp.matrix_presets.php */
