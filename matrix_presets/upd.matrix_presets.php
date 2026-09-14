<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/**
 * ExpressionEngine Matrix Presets Module Install/Update File
 *
 * @package		Matrix Presets
 * @subpackage	Addons
 * @category	Module
 * @author		Simon Andersohn
 * @link		https://github.com/ignetic/ee-matrix-presets
 */

require_once PATH_THIRD.'matrix_presets/config.php';

class Matrix_presets_upd {

	public $name = MATRIX_PRESETS_NAME;
	public $version = MATRIX_PRESETS_VERSION;

	private $class = 'Matrix_presets';
	private $settings_table = 'matrix_presets_settings';

	// ----------------------------------------------------------------

	/**
	 * Installation Method
	 *
	 * @return 	boolean 	TRUE
	 */
	public function install()
	{
		ee()->db->insert('modules', array(
			'module_name'			=> $this->class,
			'module_version'		=> $this->version,
			'has_cp_backend'		=> 'y',
			'has_publish_fields'	=> 'n'
		));

		$this->add_settings_table();

		return TRUE;
	}

	// ----------------------------------------------------------------

	/**
	 * Uninstall
	 *
	 * @return 	boolean 	TRUE
	 */
	public function uninstall()
	{
		$mod_id = ee()->db->select('module_id')
								->get_where('modules', array(
									'module_name'	=> $this->class
								))->row('module_id');

		ee()->db->where('module_id', $mod_id)->delete('module_member_roles');

		ee()->db->where('module_name', $this->class)
					->delete('modules');

		ee()->db->where('class', $this->class)
					->delete('actions');

		ee()->load->dbforge();
		ee()->dbforge->drop_table($this->settings_table);

		return TRUE;
	}

	// ----------------------------------------------------------------

	/**
	 * Module Updater
	 *
	 * Note: 2.0 removed the pre-1.2 migration (presets stored in exp_modules.settings).
	 * Update to 1.3.8 first to keep presets from 1.1 or earlier.
	 *
	 * @return 	boolean 	TRUE
	 */
	public function update($current = '')
	{
		if (version_compare($current, $this->version, '>='))
		{
			return FALSE;
		}

		// Only creates the table if missing
		$this->add_settings_table();

		if (version_compare($current, '2.0.0', '<'))
		{
			$this->convert_to_json();
		}

		return TRUE;
	}


	/**
	 * 2.0: larger preset column and JSON instead of PHP serialized data
	 */
	private function convert_to_json()
	{
		ee()->load->dbforge();

		ee()->dbforge->modify_column($this->settings_table, array(
			'preset_values' => array(
				'name' => 'preset_values',
				'type' => 'mediumtext',
				'null' => TRUE,
			),
		));

		$query = ee()->db->select('id, preset_values')
			->where('serialized', 1)
			->get($this->settings_table);

		foreach ($query->result_array() as $row)
		{
			$preset = @unserialize((string) $row['preset_values'], array('allowed_classes' => false));

			// Leave anything unreadable as it is
			if ( ! is_array($preset))
			{
				continue;
			}

			$json = json_encode($preset, JSON_INVALID_UTF8_SUBSTITUTE);

			if ($json !== FALSE)
			{
				ee()->db->update($this->settings_table, array('preset_values' => $json, 'serialized' => 0), array('id' => $row['id']));
			}
		}
	}


	private function add_settings_table()
	{
		ee()->load->dbforge();

		$fields = array(
			'id'	=> array(
				'type' => 'int',
				'constraint' => 10,
				'unsigned' => TRUE,
				'auto_increment' => TRUE
			),
			'site_id' => array(
				'type' => 'int',
				'constraint' => 4,
				'default' => 1,
			),
			'field_id' => array(
				'type' => 'int',
				'constraint' => 4,
				'default' => 1,
			),
			'preset_id' => array(
				'type' => 'varchar',
				'constraint' => 255,
			),
			'preset_values' => array(
				'type' => 'mediumtext'
			),
			// 1 = PHP serialized (pre 2.0), 0 = JSON
			'serialized' => array(
				'type' => 'int',
				'constraint' => 1,
				'null' => TRUE,
			),
		);


		ee()->dbforge->add_field($fields);
		ee()->dbforge->add_key('id', TRUE);
		ee()->dbforge->create_table($this->settings_table, TRUE);
	}

}
/* End of file upd.matrix_presets.php */
