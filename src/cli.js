import arg from 'arg';
import inquirer from 'inquirer';
import chalk from 'chalk';
import createCppClass from './main';

function parseArgumentsIntoOptions(rawArgs) {
  let args;

  const errorMessage = `${chalk.red.bold('Invalid arguments provided.')} Try running with ${chalk.inverse('--help')} for more information`

  try {
    args = arg(
      {
        '--class-name': String,
        '--no-source': Boolean,
        '--dry-run': Boolean,
        '--yes': Boolean,
        '--help': Boolean,
        '-c': '--class-name',
        '-n': '--no-source',
        '-y': '--yes',
        '-d': '--dry-run',
      },
      {
        argv: rawArgs.slice(2),
      },
    );
  } catch (error) {
    throw new Error(errorMessage);
  }

  const className = args['--class-name'] !== undefined ? args['--class-name'] : undefined;

  return {
    skipPrompts: args['--yes'] || false,
    createSource: !args['--no-source'] || false,
    dryRun: args['--dry-run'],
    className,
    help: args['--help'],
  };
}

function replaceSpaces(input) {
  return input.replace(/\s/gi, (text) => text.substr(1));
}

const classNameEmptyErrorMessage = 'Class name cannot be empty';
const classNameContainsIllegalCharacters = 'Class names can only contain a-z, A-Z, 0-9, and underscores';
const classNameContainsSpaces = 'The class name you provided contains spaces';

function validateClassName(className) {
  if (className === undefined) return undefined;
  if (className === '') {
    return classNameEmptyErrorMessage;
  }
  const nonWord = /[^\w\s]/gi;
  if (className.match(nonWord)) {
    return classNameContainsIllegalCharacters;
  }
  return true;
}

function classNameHasErrors(className) {
  if (className === undefined) return undefined;
  const validate = validateClassName(className);
  if (typeof validate === 'string') return validate;

  const spaces = /\s/gi;
  if (className.match(spaces)) {
    return classNameContainsSpaces;
  }
  return false;
}

async function promptForMissingOptions(options) {
  const defaultHeaderDir = 'include';
  const defaultSourceDir = 'src';
  const defaultHeaderExt = '.h';
  const defaultSourceExt = '.cpp';

  const questions = [];

  const defaultClassNameQuestionMessage = 'Please enter a class name (spaces will be ignored)';

  const error = classNameHasErrors(options.className);
  const classNameQuestion = {
    message: defaultClassNameQuestionMessage,
    type: 'input',
  };

  if (options.className !== undefined) {
    let classNameLogStatement;

    if (error !== undefined && error !== false) {
      classNameLogStatement = chalk.white.bgRed(options.className);
      const newClassName = replaceSpaces(options.className);
      switch (error) {
        case classNameEmptyErrorMessage:
          classNameQuestion.message = `${error}. ${defaultClassNameQuestionMessage}`;
          break;
        case classNameContainsIllegalCharacters:
          classNameQuestion.message = `${error}. ${defaultClassNameQuestionMessage}`;
          break;
        case classNameContainsSpaces:
          classNameQuestion.message = `${error}. Replace with "${newClassName}"?`;
          classNameQuestion.type = 'confirm';
          break;
        default:
          break;
      }
    } else {
      classNameLogStatement = chalk.white.bgGreen(options.className);
    }
    console.log(`Recieved class name of ${classNameLogStatement}`);
  }

  questions.push({
    type: classNameQuestion.type,
    name: 'className',
    message: `${classNameQuestion.message}`,
    validate: (input) => validateClassName(input),
    transformer: (input) => replaceSpaces(input),
    filter: (input) => replaceSpaces(input),
    when: () => error,
  });

  questions.push({
    type: 'input',
    name: 'newClassName',
    message: defaultClassNameQuestionMessage,
    validate: (input) => validateClassName(input),
    transformer: (input) => replaceSpaces(input),
    filter: (input) => replaceSpaces(input),
    when: (answers) => error && answers.className && typeof answers.className === 'boolean',
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

  const className = answers.newClassName || answers.className || options.className;
  const headerDir = answers.headerDir || defaultHeaderDir;
  const headerExt = answers.headerExt || defaultHeaderExt;
  const sourceDir = answers.sourceDir || defaultSourceDir;
  const sourceExt = answers.sourceExt || defaultSourceExt;

  console.log(`Creating class ${chalk.green.bold(className)}`);
  console.log(`Creating header file ${chalk.green.bold(`${headerDir}/${className}${headerExt}`)}`);
  if (options.createSource) {
    console.log(`Creating source file ${chalk.green.bold(`${sourceDir}/${className}${sourceExt}`)}`);
  }

  let proceed = false;
  if (!options.dryRun) {
    const { proceedResponse } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceedResponse',
        message: 'Proceed with this configuration?',
      },
    ]);
    proceed = proceedResponse;
  }
  return {
    ...options,
    ...answers,
    proceed,
    className,
    headerDir,
    headerExt,
    sourceDir,
    sourceExt,
  };
}

function printHelp() {
  console.log('To be implented');
}

// eslint-disable-next-line import/prefer-default-export
export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  if (options.help) {
    return printHelp();
  }
  options = await promptForMissingOptions(options);
  if (!options.dryRun) {
    if (options.proceed) {
      await createCppClass(options);
    } else {
      console.log(chalk.red.bold('Create Class process aborted'));
    }
  }
  return true;
}
