# Change Log

## 0.1.0

### ⚠️ BREAKING CHANGES

- **Default execution command changed**: The default command changed from `python3 -m c_formatter_42` to `c_formatter_42`.
  - If you want to run as a Python module, please configure the following settings:
    - `42-c-format.executable`: `"python3"` (or `"python"` on Windows)
    - `42-c-format.args`: `["-m", "c_formatter_42"]`
  - Alternatively, add `c_formatter_42` as an executable to your PATH.

### Added

- **Configurable executable and command-line arguments**
  - `42-c-format.executable`: Specify executable name or full path (e.g., `"c_formatter_42"`, `"python3"`, or `"/usr/bin/python3"`)
  - `42-c-format.args`: Specify command-line arguments as an array (e.g., for Python: `["-m", "c_formatter_42"]`)
  - Supports various execution methods (direct execution, Python module, custom paths, etc.)

### Improved

- **Error handling**
  - Added formatter timeout handling (30 seconds)
  - Improved cancellation handling
  - More detailed error messages with timestamps
- **UI/UX**
  - Show "Open Settings" button on command not found error
  - Show "Show Output" button on formatting errors
  - Timestamped error logs in output channel
- **Code quality**
  - Migrated to async/await
  - Fixed class name typo (`DocumentFormattingEditProvider`)
  - Improved Promise handling
  - Better maintainability with constants

### Changed

- Removed Windows-specific handling (now configurable via settings)
- Removed range formatting support
- Removed unnecessary `child_process` dependency
- Updated README to clarify issue reporting location

## 0.0.5

- Added Windows support (automatic `python`/`python3` detection).
- Added issue templates.
- Updated README.

## 0.0.4

- Added an instruction for installing c_formatter_42.

## 0.0.3

- Added an instruction for installing c_formatter_42.

## 0.0.2

- Fixed the usage instruction.

## 0.0.1

- Initial release.
