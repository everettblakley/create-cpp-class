import arg from 'arg';
import inquirer from 'inquirer';
import createCppClass from './main';

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg(
    {
      '--no-source': Boolean,
      '--yes': Boolean,
      '-n': '--no-source',
      '-y': '--yes',
    },
    {
      argv: rawArgs.slice(2),
    },
  );

  return {
    skipPrompts: args['--yes'] || false,
    createSource: !args['--no-source'] || false,
  };
}

function replaceSpaces(input) {
  return input.replace(/\s/gi, (text) => text.substr(1));
}

async function promptForMissingOptions(options) {
  const defaultHeaderDir = 'include';
  const defaultSourceDir = 'src';
  const defaultHeaderExt = 'h';
  const defaultSourceExt = 'cpp';

  const questions = [];

  questions.push({
    type: 'input',
    name: 'className',
    message:
      'What is the name of the class you want to create? (spaces will be ignored)',
    validate: (input) => {
      if (input === '') {
        return 'Class name cannot be empty';
      }
      const nonWord = /[^\w\s]/gi;
      if (input.match(nonWord)) {
        return 'Class names can only contain a-z, A-Z, 0-9, and underscores';
      }
      return true;
    },
    transformer: (input) => {
      if (input.match(/\s/gi)) {
        return replaceSpaces(input);
      }
      return input;
    },
    filter: (input) => replaceSpaces(input),
  });

  if (!options.skipPrompts) {
    questions.push({
      type: 'input',
      name: 'headerDir',
      message: 'Where would you like to put your header file?',
      default: defaultHeaderDir,
    });

    questions.push({
      type: 'list',
      name: 'headerExt',
      message:
        'What would you like the file extension of your header file to be?',
      choices: ['.h', '.hpp', 'No extension'],
      default: defaultHeaderExt,
    });

    questions.push({
      type: 'input',
      name: 'sourceDir',
      message: 'Where would you like to put your source file?',
      default: defaultSourceDir,
      when: options.createSource,
    });

    questions.push({
      type: 'list',
      name: 'sourceDxt',
      message:
        'What would you like the file extension of your source file to be?',
      choices: ['.cpp', '.cc', '.cxx'],
      default: defaultSourceExt,
      when: options.createSource,
    });
  }

  const answers = await inquirer.prompt(questions);
  return {
    ...options,
    ...answers,
    className: answers.className,
    headerDir: answers.headerDir || defaultHeaderDir,
    headerExt: answers.headerExt || defaultHeaderExt,
    sourceDir: answers.sourceDir || defaultSourceDir,
    sourceExt: answers.sourceExt || defaultSourceExt,
  };
}

// eslint-disable-next-line import/prefer-default-export
export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  await createCppClass(options);
}
