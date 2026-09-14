<?php if (! defined('APP_VER')) exit('No direct script access allowed');

/**
 * ExpressionEngine Matrix Presets Extension File
 *
 * @package		Matrix Presets
 * @subpackage	Addons
 * @category	Extension
 * @author		Simon Andersohn
 * @link		https://github.com/ignetic/ee-matrix-presets
 */

require_once PATH_THIRD.'matrix_presets/config.php';

class Matrix_presets_ext {

	public $name           = MATRIX_PRESETS_NAME;
	public $version        = MATRIX_PRESETS_VERSION;
	public $description    = MATRIX_PRESETS_DESCRIPTION;
	public $docs_url       = MATRIX_PRESETS_DOCS_URL;

	public $settings = array();
	public $settings_exist = 'n';


	/**
	 * Class Constructor
	 */
	public function __construct($settings = array())
	{
		$this->settings = $settings;
	}

	// --------------------------------------------------------------------


	/**
	 * Activate Extension
	 */
	public function activate_extension()
	{
		$hooks = array(
			'cp_js_end',
		);

		foreach($hooks as $hook)
		{
			ee()->db->insert('extensions', array(
				'class'    => get_class($this),
				'method'   => $hook,
				'hook'     => $hook,
				'settings' => serialize(array()),
				'priority' => 110,
				'version'  => $this->version,
				'enabled'  => 'y'
			));
		}
	}

	public function settings()
	{
		return array();
	}

	/**
	 * Update Extension
	 */
	public function update_extension($current = '')
	{
		if ($current == '' OR $current == $this->version)
		{
			return FALSE;
		}

		ee()->db->where('class', get_class($this))
		             ->update('extensions', array('version' => $this->version));

		return TRUE;
	}

	/**
	 * Disable Extension
	 */
	public function disable_extension()
	{
		ee()->db->where('class', get_class($this))
		             ->delete('extensions');
	}

	// --------------------------------------------------------------------


	/**
	 * cp_js_end ext hook
	 *
	 * Runs for every CP page (as a separate JS request), so avoid DB queries here.
	 * The script only does anything on the publish form.
	 */
	public function cp_js_end()
	{
		$output = '';

		if (ee()->extensions->last_call !== FALSE)
		{
			$output = ee()->extensions->last_call;
		}

		// EE7+ only
		if (version_compare(APP_VER, '7', '<'))
		{
			return $output;
		}

		$vars = array('urls' => array());

		foreach (array('get_presets', 'save_preset', 'delete_preset') as $method)
		{
			$vars['urls'][$method] = ee('CP/URL')->make('addons/settings/matrix_presets/'.$method)->compile();
		}

		$output .= ee()->load->view('matrix_presets.js', $vars, TRUE);

		return $output;
	}

}
/* End of file ext.matrix_presets.php */
