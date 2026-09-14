<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/**
 * ExpressionEngine Matrix Presets Control Panel File
 *
 * @package		Matrix Presets
 * @subpackage	Addons
 * @category	Module
 * @author		Simon Andersohn
 * @link		https://github.com/ignetic/ee-matrix-presets
 */

require_once PATH_THIRD.'matrix_presets/config.php';

class Matrix_presets_mcp {

	public $name = MATRIX_PRESETS_NAME;
	public $version = MATRIX_PRESETS_VERSION;

	private $settings_table = 'matrix_presets_settings';
	private $site_id = 1;


	/**
	 * Constructor
	 */
	public function __construct()
	{
		$this->site_id = (int) ee()->config->item('site_id');
	}

	// ----------------------------------------------------------------

	/**
	 * Index Function
	 *
	 * @return 	string
	 */
	public function index()
	{
		ee()->view->cp_page_title = lang('matrix_presets_module_name');

		return lang('matrix_presets_index_note');
	}


	/**
	 * Get presets for the posted field IDs (AJAX)
	 */
	public function get_presets()
	{
		ee()->output->send_ajax_response(array(
			'presets' => $this->fetch_presets($this->posted_field_ids()),
		));
	}


	/**
	 * Save a new preset, or overwrite an existing one (AJAX)
	 *
	 * POST: field_id, preset_id (empty/0 for new), name, format, values (JSON), field_ids
	 */
	public function save_preset()
	{
		$field_id  = (int) ee()->input->post('field_id');
		$preset_id = (int) ee()->input->post('preset_id');
		$name      = trim((string) ee()->input->post('name'));
		$format    = (int) ee()->input->post('format');
		$values    = json_decode((string) ee()->input->post('values'), TRUE);

		if ( ! $this->is_matrix_field($field_id) || $name === '' || ! is_array($values))
		{
			ee()->output->send_ajax_response(array('error' => 'Invalid preset.'), TRUE);
		}

		// format: how the values are stored (see matrix_presets.js); none = keyed by column position (pre 1.3.7)
		$preset = array(
			'name'   => mb_substr($name, 0, 255),
			'format' => $format,
			'values' => $values,
		);

		if ( ! $format)
		{
			unset($preset['format']);
		}

		$preset_values = json_encode($preset, JSON_INVALID_UTF8_SUBSTITUTE);

		if ($preset_values === FALSE)
		{
			ee()->output->send_ajax_response(array('error' => 'The preset could not be encoded.'), TRUE);
		}

		$where = array(
			'site_id'  => $this->site_id,
			'field_id' => $field_id,
		);

		// New preset: next ID (preset_id is a varchar, so cast for a numeric max; as text, '9' sorts after '10')
		if ( ! $preset_id)
		{
			$row = ee()->db->select('MAX(CAST(preset_id AS UNSIGNED)) AS max_id', FALSE)
				->where($where)
				->get($this->settings_table)
				->row_array();

			$preset_id = (int) ($row['max_id'] ?? 0) + 1;
		}

		$where['preset_id'] = $preset_id;

		// serialized: 1 = PHP serialized (pre 2.0), 0 = JSON
		$data = array(
			'preset_values' => $preset_values,
			'serialized'    => 0,
		);

		if (ee()->db->where($where)->count_all_results($this->settings_table) > 0)
		{
			ee()->db->update($this->settings_table, $data, $where);
		}
		else
		{
			ee()->db->insert($this->settings_table, array_merge($where, $data));
		}

		ee()->output->send_ajax_response(array(
			'presets'   => $this->fetch_presets($this->posted_field_ids()),
			'preset_id' => $preset_id,
		));
	}


	/**
	 * Delete a preset (AJAX)
	 *
	 * POST: field_id, preset_id, field_ids
	 */
	public function delete_preset()
	{
		$field_id  = (int) ee()->input->post('field_id');
		$preset_id = (int) ee()->input->post('preset_id');

		if ($field_id && $preset_id)
		{
			ee()->db->delete($this->settings_table, array(
				'site_id'   => $this->site_id,
				'field_id'  => $field_id,
				'preset_id' => $preset_id,
			));
		}

		ee()->output->send_ajax_response(array(
			'presets' => $this->fetch_presets($this->posted_field_ids()),
		));
	}


	/**
	 * Presets for these fields, as [field_id][preset_id] => array('name' => ..., 'format' => ..., 'values' => ...)
	 *
	 * @return array
	 */
	private function fetch_presets($field_ids)
	{
		$presets = array();

		// Never return every preset on the site
		if (empty($field_ids))
		{
			return $presets;
		}

		$query = ee()->db->where('site_id', $this->site_id)
			->where_in('field_id', $field_ids)
			->get($this->settings_table);

		foreach ($query->result_array() as $row)
		{
			$preset = $row['serialized']
				? $this->unserialize_values($row['preset_values'])
				: json_decode((string) $row['preset_values'], TRUE);

			// Skip corrupt/truncated presets
			if (is_array($preset) && isset($preset['values']))
			{
				$presets[$row['field_id']][$row['preset_id']] = $preset;
			}
		}

		foreach ($presets as &$field_presets)
		{
			ksort($field_presets, SORT_NUMERIC);
		}

		return $presets;
	}


	/**
	 * Posted field IDs (integers only)
	 *
	 * @return array
	 */
	private function posted_field_ids()
	{
		$field_ids = ee()->input->post('field_ids');

		if ( ! is_array($field_ids))
		{
			return array();
		}

		return array_values(array_unique(array_filter(array_map('intval', $field_ids))));
	}


	/**
	 * Is this a Matrix field?
	 *
	 * @return bool
	 */
	private function is_matrix_field($field_id)
	{
		if ($field_id < 1)
		{
			return FALSE;
		}

		return ee()->db->where('field_id', $field_id)
			->where('field_type', 'matrix')
			->count_all_results('channel_fields') > 0;
	}


	/**
	 * Unserialize pre-2.0 preset data (arrays only, never objects)
	 *
	 * @return array|bool FALSE if empty or invalid
	 */
	private function unserialize_values($data)
	{
		if ( ! $data)
		{
			return FALSE;
		}

		$values = @unserialize($data, array('allowed_classes' => false));

		return is_array($values) ? $values : FALSE;
	}

}
/* End of file mcp.matrix_presets.php */
