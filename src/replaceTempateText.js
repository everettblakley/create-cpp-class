import replace from 'replace-in-file';
import path from 'path';
import chalk from 'chalk';

const classNameRegex = /%className%/g;
const classIdentifierRegex = /%identifier%/g;
const headerExtRegex = /%headerExt%/g;

async function replaceClassIdentifier(options) {
  return replace({
    files: path.resolve(options.headerDir, options.headerFile),
    from: classIdentifierRegex,
    to: `${options.className.toUpperCase()}${options.headerExt ? `_${options.headerExt.replace('.', '').toUpperCase()}` : ''}`,
  });
}

async function replaceClassName(options) {
  const files = [path.resolve(options.headerDir, options.headerFile)];

  if (options.createSource) {
    files.push(
      path.resolve(options.sourceDir, options.sourceFile),
    );
  }
  return replace({
    files,
    from: classNameRegex,
    to: options.className,
  });
}

async function replaceHeaderExtension(options) {
  if (!options.createSource) {
    return Promise.resolve();
  }
  return replace({
    files: options.sourceFile,
    from: headerExtRegex,
    to: options.headerExt,
  });
}

export default async function renameTemplateVariables(options) {
  const operations = [
    () => replaceClassIdentifier(options),
    () => replaceClassName(options),
    () => replaceHeaderExtension(options),
  ];

  return operations.reduce(
    (promise, operation) => promise
      .then(operation)
      .catch((error) => console.error(`%s ${error}`, chalk.red.bold('ERROR'))),
    Promise.resolve(),
  );
}
