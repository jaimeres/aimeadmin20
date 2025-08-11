// Prime pf2tw configuration file
// Maps legacy PrimeFlex utility classes to Tailwind equivalents.
// Adjust include/exclude globs as needed.

/** @type {import('@primeuix/themes/config').PF2TWConfig} */
export default {
  // Where to scan for PrimeFlex classes
  include: [
    'src/**/*.html',
    'src/**/*.ts',
    'src/**/*.scss'
  ],
  exclude: [
    'node_modules',
    'dist'
  ],
  // Output directory for generated report / transformed files (dry run first)
  outDir: 'pf2tw-report',
  // Enable replacement; set to false for just reporting
  apply: false,
  // Custom mappings (extend or override defaults)
  // Example: 'p-mt-2': 'mt-2'
  mappings: {
    'col-12': 'w-full',
    'col-6': 'w-1/2',
    'col-4': 'w-1/3',
    'col-3': 'w-1/4',
    'col-2': 'w-1/6',
    'flex': 'flex',
    'justify-content-center': 'justify-center'
  }
};
