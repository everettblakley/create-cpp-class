import arg from 'arg';
import inquirer from 'inquirer';
import createCppClass from './main';
import {
  errorText, successText, greenBoldText, redBoldText, inverseText,
} from './utilities';

function parseArgumentsIntoOptions(rawArgs) {
  let args;

  const errorMessage = `${errorText('Invalid arguments provided.')} Try running with ${inverseText('--help')} for more information`;

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
    createSource: args['--no-source'] !== undefined,
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
  const defaultCreateSource = true;

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
      classNameLogStatement = errorText(options.className);
      const newClassName = replaceSpaces(options.className);
      switch (error) {
        case classNameEmptyErrorMessage:
          classNameQuestion.message = `${errorText(error)}. ${defaultClassNameQuestionMessage}`;
          break;
        case classNameContainsIllegalCharacters:
          classNameQuestion.message = `${errorText(error)}. ${defaultClassNameQuestionMessage}`;
          break;
        case classNameContainsSpaces:
          classNameQuestion.message = `${errorText(error)}. Replace with "${newClassName}"?`;
          classNameQuestion.type = 'confirm';
          break;
        default:
          break;
      }
    } else {
      classNameLogStatement = successText(options.className);
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
    when: () => error || !options.className,
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
      type: 'confirm',
      name: 'createSource',
      message: 'Do you want to create a separate source file for the class implementation?',
      default: true,
      when: () => options.createSource !== true,
    });

    questions.push({
      type: 'input',
      name: 'sourceDir',
      message: 'Where would you like to put your source file?',
      default: defaultSourceDir,
      when: (answers) => options.createSource || answers.createSource,
    });

    questions.push({
      type: 'list',
      name: 'sourceDxt',
      message:
        'What would you like the file extension of your source file to be?',
      choices: ['.cpp', '.cc', '.cxx'],
      default: defaultSourceExt,
      when: (answers) => options.createSource || answers.createSource,
    });
  }

  const answers = await inquirer.prompt(questions);

  const className = answers.newClassName || answers.className || options.className;
  const headerDir = answers.headerDir || defaultHeaderDir;
  const headerExt = answers.headerExt || defaultHeaderExt;
  const sourceDir = answers.sourceDir || defaultSourceDir;
  const sourceExt = answers.sourceExt || defaultSourceExt;
  const createSource = answers.createSource || options.createSource || defaultCreateSource;

  console.log();

  if (options.dryRun) {
    console.log(`${inverseText('Dry run enabled')} The following is an example of what would be created if ran without the "--dry-run" (or "-d") flag\n`);
  }
  console.log(`Class name: ${greenBoldText(className)}`);
  console.log(`Header file: ${greenBoldText(`${headerDir}/${className}${headerExt}`)}`);
  if (createSource) {
    console.log(`Source file: ${greenBoldText(`${sourceDir}/${className}${sourceExt}`)}`);
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
    createSource,
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

async function disclaimer(options) {
  let proceed = true;
  if (!options.dryRun) {
    console.log(errorText('❗❗DISCLAIMER❗❗'));
    console.log('Be aware that this program will overwrite any files that match any files specified in the output. You will have an opportunity to abort before any writes occur. Please be aware of the values you use.');

    const { proceedResponse } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceedResponse',
        message: 'Proceed with this program?',
      },
    ]);
    proceed = proceedResponse;
  }
  return {
    ...options,
    proceed,
  };
}

// eslint-disable-next-line import/prefer-default-export
export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  if (options.help) {
    return printHelp();
  }
  options = await disclaimer(options);
  if (options.proceed) {
    options = await promptForMissingOptions(options);
    if (!options.dryRun) {
      if (options.proceed) {
        await createCppClass(options);
      } else {
        console.log(redBoldText('Create class process aborted'));
      }
    }
  } else {
    console.log(redBoldText('Disclaimer not accepted. Aborting'));
  }
  return true;
}
