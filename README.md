Matrix Presets
=================

For ExpressionEngine 7

Adds the ability to save and load P&amp;T Matrix field values. Useful for duplicating or pre-populating Matrix content.

This enables you to save existing content within a Matrix which can later be loaded into another of the same field.

Simply click the Save button and give it a name to create a new preset. 
You can also overwrite existing presets or delete them.

This can also be used to speed up content population for testing purposes while in development.


Requirements
------------

- ExpressionEngine 7
- Matrix (EEHarbor)
- For EE2-EE6, use [1.3.8](https://github.com/ignetic/ee-matrix-presets/releases/tag/v1.3.8)


Installation
------------

1. Copy the `matrix_presets` folder to `system/user/addons/`
2. Install Matrix Presets in the CP under Add-ons
3. Give member roles access to the add-on (Members > Roles > CP Access > Add-ons) so they can use presets

Upgrading from 1.x: replace the folder, then run the update under Add-ons. This converts existing presets to the new format.
Presets from 1.1 or earlier need updating to 1.3.8 first.


Usage
-----

Preset buttons appear under each Matrix field on the entry publish form.

- **Save** – with no preset selected, saves the Matrix's rows as a new preset; with a preset selected, overwrites it
- **Load** – adds the preset's rows to the Matrix (up to the field's maximum rows)
- **Delete** – deletes the selected preset

Presets belong to a field, so they can be loaded into the same field on any entry.
Values are matched to columns by column, so presets still load after columns are added or reordered
(presets saved before 1.3.7 load by column position).


Supported column types
----------------------

- Matrix: Text, Number, Date, File, Rich Text (RedactorX, Redactor, CKEditor)
- Wygwam
- P&amp;T Fieldpack: Dropdown, Multiselect, Checkboxes, Radio Buttons, Switch, Pill, List
- MX Select Plus
- Assets
- Playa (drop panes)
- Channel Images Select (thumbnails for loaded images need [1.4.2+](https://github.com/ignetic/ee-channel-images-select/releases/tag/v1.4.2))

Other third-party column types are saved and loaded as plain form values where possible.
