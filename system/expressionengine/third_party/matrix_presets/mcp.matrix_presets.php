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

class Matrix_presets_mcp {
	
	public $return_data;
	
	private $_base_url;
	
	/**
	 * Constructor
	 */
	public function __construct()
	{
		
		$this->_base_url = BASE.AMP.'C=addons_modules'.AMP.'M=show_module_cp'.AMP.'module=matrix_presets';
		
		ee()->cp->set_right_nav(array(
			'module_home'	=> $this->_base_url,
			// Add more right nav items here.
		));
	}
	
	// ----------------------------------------------------------------

	/**
	 * Index Function
	 *
	 * @return 	void
	 */
	public function index()
	{
	
	echo ee()->input->get('method');

		// If this isn't an AJAX request, just display the "base" settings form.
		if ( ! ee()->input->is_ajax_request())
		{
			ee()->cp->set_variable('cp_page_title', 
									lang('matrix_presets_module_name'));
									
			return "Nothing to see here...";
		}

	}

	
	/**
	 * Start on your custom code here...
	 */
	 
	public function get_presets()
	{
		$presets = array();
		$query = ee()->db->select('settings')->where('module_name', 'Matrix_presets')->get('exp_modules');
		foreach ($query->result_array() as $row)
		{
			$presets = unserialize($row['settings']);
		}
		ee()->output->send_ajax_response(array('presets' => $presets, 'csrf_token' => '{csrf_token}'));
	}	
	
	
	public function save_preset()
	{
		// get existing presets
		$presets = array();
		$query = ee()->db->select('settings')->where('module_name', 'Matrix_presets')->get('exp_modules');
		
        if ($query->num_rows())
        {
			foreach ($query->result_array() as $row)
			{
				$presets = unserialize($row['settings']);
			}
		}
		
		// is this a new preset?
		$newpreset = ee()->input->post('newpreset');
		
		// merge with existing presets
		if(ee()->input->post('preset')) 
		{
			$preset = ee()->input->post('preset');
			
			foreach($preset as $key => $val)
			{
				foreach($val as $k => $v)
				{
					$presetId = 0;
					if ($newpreset == 'true' && isset($presets[$key]))
					{
						// get highest key
						$presetId = max( array_keys( $presets[$key] ) ) +1;
					}
					else {
						$presetId = $k;
					}
					$presets[$key][$presetId] =  $v;
				}
			}
			ee()->db->where('module_name', 'Matrix_presets')->update('exp_modules', array('settings' => serialize($presets)));
		}
		ee()->output->send_ajax_response(array('presets' => $presets, 'csrf_token' => '{csrf_token}'));
	}
	
	
	public function delete_preset()
	{
		// get existing presets
		$presets = array();
		$fieldId = ee()->input->post('id');
		$presetId = ee()->input->post('presetId');
		
		if ($fieldId)
		{
			$query = ee()->db->select('settings')->where('module_name', 'Matrix_presets')->get('exp_modules');
			if ($query->num_rows())
			{
				foreach ($query->result_array() as $row)
				{
					$presets = unserialize($row['settings']);
				}
				// remove preset
				if (isset($presets[$fieldId][$presetId])) {
					
					unset($presets[$fieldId][$presetId]);
					
					if (empty($presets[$fieldId]))
						unset($presets[$fieldId]);
					
					ee()->db->where('module_name', 'Matrix_presets')->update('exp_modules', array('settings' => serialize($presets)));
				}
			}
		}
		ee()->output->send_ajax_response(array('presets' => $presets, 'csrf_token' => '{csrf_token}'));
	}
	
}
/* End of file mcp.matrix_presets.php */
/* Location: /system/expressionengine/third_party/matrix_presets/mcp.matrix_presets.php */
