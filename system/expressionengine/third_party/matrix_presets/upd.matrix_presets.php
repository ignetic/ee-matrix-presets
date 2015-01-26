<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/**
 * ExpressionEngine Matrix Presets Module Install/Update File
 *
 * @package		Matrix Presets
 * @subpackage	Addons
 * @category	Module
 * @author		Simon Andersohn
 * @link		
 */
 
require_once PATH_THIRD.'matrix_presets/config.php';
 
class Matrix_presets_upd {
	
	public $name = MATRIX_PRESETS_NAME;
	public $version = MATRIX_PRESETS_VERSION; 
	
	private $EE;
	private $class = 'Matrix_presets';
	private $settings_table = 'matrix_presets_settings';
	private $site_id = 1;
	
	/**
	 * Constructor
	 */
	public function __construct()
	{
		$this->EE =& get_instance();
		
		$this->site_id = $this->EE->config->item('site_id');
		
	}
	
	// ----------------------------------------------------------------
	
	/**
	 * Installation Method
	 *
	 * @return 	boolean 	TRUE
	 */
	public function install()
	{
		/*
        // Load dbforge
        $this->EE->load->dbforge();
		
        //----------------------------------------
        // EXP_MODULES
        // preferences within module table
        //----------------------------------------
        if ($this->EE->db->field_exists('settings', 'modules') == false) {
            $this->EE->dbforge->add_column('modules', array('settings' => array('type' => 'TEXT') ) );
        }
		*/
		
		$mod_data = array(
			'module_name'			=> 'Matrix_presets',
			'module_version'		=> $this->version,
			'has_cp_backend'		=> "y",
			'has_publish_fields'	=> 'n'
		);
		
		$this->EE->db->insert('modules', $mod_data);
		
		
		// Create settings table
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
		$mod_id = $this->EE->db->select('module_id')
								->get_where('modules', array(
									'module_name'	=> $this->class
								))->row('module_id');
		
		$this->EE->db->where('module_id', $mod_id)
					->delete('module_member_groups');
		
		$this->EE->db->where('module_name', $this->class)
					->delete('modules');
					 
		$this->EE->db->where('class', $this->class)
					->delete('actions');
		
		$this->EE->load->dbforge();
		$this->EE->dbforge->drop_table($this->settings_table);
		
		return TRUE;
	}
	
	// ----------------------------------------------------------------
	
	/**
	 * Module Updater
	 *
	 * @return 	boolean 	TRUE
	 */	
	public function update($current = '')
	{
		if ($current == $this->version)
		{
			return FALSE;
		}	

		if (version_compare($current, '1.2', '<'))
		{
			// Create new table
			$this->add_settings_table();

			// Move old settings to new table
			$presets = array();
			
			// Get settings from old table
			$query = $this->EE->db->select('settings')->where('module_name', $this->class)->get('modules');
			foreach ($query->result_array() as $row)
			{
				$presets = unserialize($row['settings']);
			}
			
			if (!empty($presets))
			{
				// add to new table
				foreach($presets as $field_id => $val)
				{
					$fields = array();
					$fields['site_id'] = $this->site_id;
					$fields['field_id'] = $field_id;
					$fields['serialized'] = 1;
					
					foreach($val as $preset_id => $preset_values)
					{
						// Let's start the preset ids from 1
						$fields['preset_id'] = $preset_id+1;
					
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
			
				// Remove settings from old table
				if ($this->EE->db->field_exists('settings', 'modules'))
				{
					$this->EE->db->update('modules', array('settings' => NULL), array('module_name' => $this->class));
				}
				
				
			}
			
			
		}

		return TRUE;
	}
	
	
	private function add_settings_table()
	{
		$this->EE->load->dbforge();

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
				'type' => 'text'
			),
			'serialized' => array(
				'type' => 'int',
				'constraint' => 1,
				'null' => TRUE,
			),
		);
		

		$this->EE->dbforge->add_field($fields);
		$this->EE->dbforge->add_key('id', TRUE);
		$this->EE->dbforge->create_table($this->settings_table, TRUE);		
	}
	
}
/* End of file upd.matrix_presets.php */
/* Location: /system/expressionengine/third_party/matrix_presets/upd.matrix_presets.php */
