/**
 * Default configuration values for Ryu-Cho
 */
export const defaults = {
  /**
   * Default Git user name
   * @default 'github-actions'
   */
  userName: 'github-actions',

  /**
   * Default Git email
   * @default 'action@github.com'
   */
  email: 'action@github.com',

  /**
   * Default branch name for repositories
   * @default 'main'
   */
  branch: 'main',

  /**
   * Default label for issues
   * @default 'sync'
   */
  label: 'sync',
} as const;

/**
 * Type for the default configuration
 */
export type Defaults = typeof defaults;
