import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import Listr from 'listr';
import renameTemplateVariables from './replaceTempateText';

const access = promisify(fs.access);

async function copyTemplateFile(templateFile, targetDir, targetFile) {
  return fs.promises.mkdir(targetDir, { recursive: true }, (error) => {
    if (error) throw error;
  }).then(() => {
    fs.promises.copyFile(
      templateFile,
      path.resolve(targetDir, targetFile),
      (error) => {
        if (error) throw error;
      },
    );
  });
}

export default async function createCppClass(options) {
  const templateDirectory = path.resolve(
    new URL(import.meta.url).pathname,
    '../../templates',
  );

  try {
    await access(templateDirectory, fs.constants.R_OK);
  } catch (err) {
    console.error(`%s ${err}`, chalk.red.bold('ERROR'));
    process.exit(1);
  }

  const headerTemplate = path.resolve(templateDirectory, 'header');
  const headerFile = `${options.className}${options.headerExt}`;
  const sourceTemplate = path.resolve(templateDirectory, 'source');
  const sourceFileName = `${options.className}${options.sourceExt}`;
  const sourceFile = path.resolve(options.sourceDir, sourceFileName);

  const tasks = new Listr([
    {
      title: `Creating ${headerFile} in ./${options.headerDir}`,
      task: () => copyTemplateFile(headerTemplate, options.headerDir, headerFile),
    },
    {
      title: `Creating ${sourceFileName} in ./${options.sourceDir}`,
      task: () => copyTemplateFile(sourceTemplate, options.sourceDir, sourceFile),
      enabled: () => options.createSource,
    },
    {
      title: `Renaming template variables in header ${options.createSource ? 'and source files' : 'file'}`,
      task: () => renameTemplateVariables({ ...options, headerFile, sourceFile }),
    },
  ]);

  await tasks.run();
  console.log(`%s ${options.className} success created! Happy coding!`, chalk.green.bold('DONE'));
  return true;
}
