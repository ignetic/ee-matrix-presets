<?php if (! defined('APP_VER')) exit('No direct script access allowed');

/**
 * ExpressionEngine Matrix Presets Module Control Panel File
 *
 * @package		Matrix Presets
 * @subpackage	Addons
 * @category	Module
 * @author		Simon Andersohn
 * @link		
 */
 
require_once PATH_THIRD.'matrix_presets/config.php';

class Matrix_presets_ext {

	public $name = MATRIX_PRESETS_NAME;
	public $version = MATRIX_PRESETS_VERSION; 
	
	public $description    = 'Adds the ability to save and load matrix values';
	public $settings_exist = 'n';
	public $docs_url       = '';


	/**
	 * Class Constructor
	 */
	public function __construct($settings = array())
	{
	
		$this->EE =& get_instance();
		
		// --------------------------------------------
		//  Settings!
		// --------------------------------------------
	
		$this->settings = $settings;

	}

	// --------------------------------------------------------------------

	/**
	 * Activate Extension
	 */
	public function activate_extension()
	{
		// Setup custom settings in this array.
		$this->settings = array();
	
		// -------------------------------------------
		//  Add the extension hooks
		// -------------------------------------------

		$hooks = array(
			'cp_js_end',
		);

		foreach($hooks as $hook)
		{
			$this->EE->db->insert('extensions', array(
				'class'    => get_class($this),
				'method'   => $hook,
				'hook'     => $hook,
				'settings' => serialize($this->settings),
				'priority' => 110,
				'version'  => $this->version,
				'enabled'  => 'y'
			));
		}
	}

	/**
	 * Update Extension
	 */
	public function update_extension($current = '')
	{
		// Nothing to change...
		return FALSE;
	}

	/**
	 * Disable Extension
	 */
	public function disable_extension()
	{
		// -------------------------------------------
		//  Delete the extension hooks
		// -------------------------------------------

		$this->EE->db->where('class', get_class($this))
		             ->delete('exp_extensions');
	}

	// --------------------------------------------------------------------


	/**
	 * cp_js_end ext hook
	 */
	function cp_js_end()
	{
	
		$output = '';
	
		if ($this->EE->extensions->last_call !== FALSE)
		{
			$output = $this->EE->extensions->last_call;
		}
	
		$vars = array();
		
		$output .= $this->EE->load->view('matrix_presets.js', $vars, TRUE);

		return $output;

	}

}
/* End of file ext.matrix_presets.php */
/* Location: /system/expressionengine/third_party/matrix_presets/ext.matrix_presets.php */