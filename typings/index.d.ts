// Type definitions for commander
// Original definitions by: Alan Agius <https://github.com/alan-agius4>, Marcelo Dezem <https://github.com/mdezem>, vvakame <https://github.com/vvakame>, Jules Randolph <https://github.com/sveinburne>

// Using method rather than property for method-signature-style, to document method overloads separately. Allow either.
/* eslint-disable @typescript-eslint/method-signature-style */
/* eslint-disable @typescript-eslint/no-explicit-any */

type CamelCase<S extends string> = S extends `${infer W}-${infer Rest}`
  ? CamelCase<`${W}${Capitalize<Rest>}`>
  : S;

type StringImpliedType<S extends string, /* fallback to boolean */ F extends boolean = false> =
  S extends `${string}<${string}...>`
    ? [string, ...string[]]
    : S extends `${string}[${string}...]`
      ? F extends true
        ? string[] | boolean
        : string[]
      : S extends `${string}<${string}>`
        ? string
        : S extends `${string}[${string}]`
          ? F extends true
            ? string | boolean
            : string | undefined
          : F extends true
            ? boolean
            : never;

type StringTypedArgument<S extends string, T, /* default type */ D> =
  undefined extends D
    ? S extends `[${string}]`
      ? T | undefined
      : T
    : T;

type StringUntypedArgument<S extends string, /* default type */ D> =
  undefined extends D
    ? StringImpliedType<S>
    : NonNullable<StringImpliedType<S>>;

type StringArguments<S extends string> =
  S extends `${infer A} ${infer Rest}`
    ? [StringUntypedArgument<A, undefined>, ...StringArguments<Rest>]
    : [StringUntypedArgument<S, undefined>];

type StringTypedOption<S extends string, T, /* default type */ D> =
  S extends `${infer Flags} <${string}>` | `${infer Flags} [${string}]` | `${infer Flags} ` // Trim the ending ` <xxx>` or ` [xxx]` or ` `
    ? StringTypedOption<Flags, T, D>
    : S extends `-${string},${infer Rest}` // Trim the leading `-xxx,`
      ? StringTypedOption<Rest, T, D>
      : S extends `-${infer Rest}` | ` ${infer Rest}` // Trim the leading `-` or ' '.
        ? StringTypedOption<Rest, T, D>
        : S extends `no-${infer Rest}` // Check the leading `no-`
          ? { [K in CamelCase<Rest>]: T }
          : undefined extends D
            ? { [K in CamelCase<S>]?: T }
            : { [K in CamelCase<S>]: T };

type StringUntypedOption<S extends string, /* default type */ D> =
  StringTypedOption<S, StringImpliedType<S, true>, D>;

type MergeOptions<A, B> = (A & B) extends infer O ? {[K in keyof O]: O[K]} : never;

export class CommanderError extends Error {
  code: string;
  exitCode: number;
  message: string;
  nestedError?: string;

  /**
   * Constructs the CommanderError class
   * @param exitCode - suggested exit code which could be used with process.exit
   * @param code - an id string representing the error
   * @param message - human-readable description of the error
   * @constructor
   */
  constructor(exitCode: number, code: string, message: string);
}

export class InvalidArgumentError extends CommanderError {
  /**
   * Constructs the InvalidArgumentError class
   * @param message - explanation of why argument is invalid
   * @constructor
   */
  constructor(message: string);
}
export { InvalidArgumentError as InvalidOptionArgumentError }; // deprecated old name

export interface ErrorOptions { // optional parameter for error()
  /** an id string representing the error */
  code?: string;
  /** suggested exit code which could be used with process.exit */
  exitCode?: number;
}

export class Argument<Arg extends string, T = StringImpliedType<Arg>, D = undefined> {
  description: string;
  required: boolean;
  variadic: boolean;

  /**
   * Initialize a new command argument with the given name and description.
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   */
  constructor(arg: Arg, description?: string);

  /**
   * Return argument name.
   */
  name(): string;

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   */
  default<D2>(value: D2, description?: string): Argument<Arg, T, D2>;

  /**
   * Set the custom handler for processing CLI command arguments into argument values.
   */
  argParser<T2>(fn: (value: string, previous: T2) => T2): Argument<Arg, T2, D>;

  /**
   * Only allow argument value to be one of choices.
   */
  choices(values: readonly string[]): this;

  /**
   * Make argument required.
   */
  argRequired(): this;

  /**
   * Make argument optional.
   */
  argOptional(): this;
}

export class Option<Flags extends string, T = StringImpliedType<Flags, true>, D = undefined, M = false> {
  flags: Flags;
  description: string;

  required: Flags extends `${string}<${string}>${string}` ? true : false; // A value must be supplied when the option is specified.
  optional: Flags extends `${string}<${string}>${string}` ? false : true; // A value is optional when the option is specified.
  variadic: Flags extends `${string}[${string}...]${string}` | `${string}<${string}...>${string}` ? true : false;
  mandatory: M; // The option must have a value after parsing, which usually means it must be specified on command line.
  optionFlags: string;
  short: string | undefined;
  long: string | undefined;
  negate: boolean;
  defaultValue: D;
  defaultValueDescription: string | undefined;
  parseArg: ((value: string, previous: T) => T) | undefined;
  hidden: boolean;
  argChoices: string[] | undefined;

  constructor(flags: Flags, description?: string);

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   */
  default<D2>(value: D2, description?: string): Option<Flags, T, D2, M>;

  /**
   * Preset to use when option used without option-argument, especially optional but also boolean and negated.
   * The custom processing (parseArg) is called.
   *
   * @example
   * ```ts
   * new Option('--color').default('GREYSCALE').preset('RGB');
   * new Option('--donate [amount]').preset('20').argParser(parseFloat);
   * ```
   */
  preset(arg: unknown): this;

  /**
   * Add option name(s) that conflict with this option.
   * An error will be displayed if conflicting options are found during parsing.
   *
   * @example
   * ```ts
   * new Option('--rgb').conflicts('cmyk');
   * new Option('--js').conflicts(['ts', 'jsx']);
   * ```
   */
  conflicts(names: string | string[]): this;

  /**
   * Specify implied option values for when this option is set and the implied options are not.
   *
   * The custom processing (parseArg) is not called on the implied values.
   *
   * @example
   * program
   *   .addOption(new Option('--log', 'write logging information to file'))
   *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
   */
  implies(optionValues: OptionValues): this;

  /**
   * Set environment variable to check for option value.
   * Priority order of option values is default < env < cli
   */
  env(name: string): this;

  /**
   * Calculate the full description, including defaultValue etc.
   */
  fullDescription(): string;

  /**
   * Set the custom handler for processing CLI option arguments into option values.
   */
  argParser<T2>(fn: (value: string, previous: T2) => T2): Option<Flags, T2, D, M>;

  /**
   * Whether the option is mandatory and must have a value after parsing.
   */
  makeOptionMandatory<M2 extends boolean = true>(mandatory?: M2): Option<Flags, T, D, M2>;

  /**
   * Hide option in help.
   */
  hideHelp(hide?: boolean): this;

  /**
   * Only allow option value to be one of choices.
   */
  choices(values: readonly string[]): this;

  /**
   * Return option name.
   */
  name(): string;

  /**
   * Return option name, in a camelcase format that can be used
   * as a object attribute key.
   */
  attributeName(): string;

  /**
   * Return whether a boolean option.
   *
   * Options are one of boolean, negated, required argument, or optional argument.
   */
  isBoolean(): boolean;
}

export class Help {
  /** output helpWidth, long lines are wrapped to fit */
  helpWidth?: number;
  sortSubcommands: boolean;
  sortOptions: boolean;

  constructor();

  /** Get the command term to show in the list of subcommands. */
  subcommandTerm(cmd: Command): string;
  /** Get the command summary to show in the list of subcommands. */
  subcommandDescription(cmd: Command): string;
  /** Get the option term to show in the list of options. */
  optionTerm(option: Option<any>): string;
  /** Get the option description to show in the list of options. */
  optionDescription(option: Option<any>): string;
  /** Get the argument term to show in the list of arguments. */
  argumentTerm(argument: Argument<any>): string;
  /** Get the argument description to show in the list of arguments. */
  argumentDescription(argument: Argument<any>): string;

  /** Get the command usage to be displayed at the top of the built-in help. */
  commandUsage(cmd: Command): string;
  /** Get the description for the command. */
  commandDescription(cmd: Command): string;

  /** Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one. */
  visibleCommands(cmd: Command): Command[];
  /** Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one. */
  visibleOptions(cmd: Command): Array<Option<any>>;
  /** Get an array of the arguments which have descriptions. */
  visibleArguments(cmd: Command): Array<Argument<any>>;

  /** Get the longest command term length. */
  longestSubcommandTermLength(cmd: Command, helper: Help): number;
  /** Get the longest option term length. */
  longestOptionTermLength(cmd: Command, helper: Help): number;
  /** Get the longest argument term length. */
  longestArgumentTermLength(cmd: Command, helper: Help): number;
  /** Calculate the pad width from the maximum term length. */
  padWidth(cmd: Command, helper: Help): number;

  /**
   * Wrap the given string to width characters per line, with lines after the first indented.
   * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
   */
  wrap(str: string, width: number, indent: number, minColumnWidth?: number): string;

  /** Generate the built-in help text. */
  formatHelp(cmd: Command, helper: Help): string;
}
export type HelpConfiguration = Partial<Help>;

export interface ParseOptions {
  from: 'node' | 'electron' | 'user';
}
export interface HelpContext { // optional parameter for .help() and .outputHelp()
  error: boolean;
}
export interface AddHelpTextContext { // passed to text function used with .addHelpText()
  error: boolean;
  command: Command;
}
export interface OutputConfiguration {
  writeOut?(str: string): void;
  writeErr?(str: string): void;
  getOutHelpWidth?(): number;
  getErrHelpWidth?(): number;
  outputError?(str: string, write: (str: string) => void): void;

}

export type AddHelpTextPosition = 'beforeAll' | 'before' | 'after' | 'afterAll';
export type HookEvent = 'preAction' | 'postAction';
export type OptionValueSource = 'default' | 'env' | 'config' | 'cli';

export interface OptionValues {
  [key: string]: any;
}

export class Command<Args extends unknown[] = [], Options extends { [K: string]: unknown } = {}> {
  args: string[];
  processedArgs: any[];
  commands: Command[];
  parent: Command | null;

  constructor(name?: string);

  /**
   * Set the program version to `str`.
   *
   * This method auto-registers the "-V, --version" flag
   * which will print the version number when passed.
   *
   * You can optionally supply the  flags and description to override the defaults.
   */
  version(str: string, flags?: string, description?: string): this;

  /**
   * Define a command, implemented using an action handler.
   *
   * @remarks
   * The command description is supplied using `.description`, not as a parameter to `.command`.
   *
   * @example
   * ```ts
   * program
   *   .command('clone <source> [destination]')
   *   .description('clone a repository into a newly created directory')
   *   .action((source, destination) => {
   *     console.log('clone command called');
   *   });
   * ```
   *
   * @param nameAndArgs - command name and arguments, args are  `<required>` or `[optional]` and last may also be `variadic...`
   * @param opts - configuration options
   * @returns new command
   */
  command(nameAndArgs: string, opts?: CommandOptions): ReturnType<this['createCommand']>;
  /**
   * Define a command, implemented in a separate executable file.
   *
   * @remarks
   * The command description is supplied as the second parameter to `.command`.
   *
   * @example
   * ```ts
   *  program
   *    .command('start <service>', 'start named service')
   *    .command('stop [service]', 'stop named service, or all if no name supplied');
   * ```
   *
   * @param nameAndArgs - command name and arguments, args are  `<required>` or `[optional]` and last may also be `variadic...`
   * @param description - description of executable command
   * @param opts - configuration options
   * @returns `this` command for chaining
   */
  command(nameAndArgs: string, description: string, opts?: ExecutableCommandOptions): this;

  /**
   * Factory routine to create a new unattached command.
   *
   * See .command() for creating an attached subcommand, which uses this routine to
   * create the command. You can override createCommand to customise subcommands.
   */
  createCommand(name?: string): Command;

  /**
   * Add a prepared subcommand.
   *
   * See .command() for creating an attached subcommand which inherits settings from its parent.
   *
   * @returns `this` command for chaining
   */
  addCommand(cmd: Command, opts?: CommandOptions): this;

  /**
   * Factory routine to create a new unattached argument.
   *
   * See .argument() for creating an attached argument, which uses this routine to
   * create the argument. You can override createArgument to return a custom argument.
   */
  createArgument<Arg extends string>(name: Arg, description?: string): Argument<Arg>;

  /**
   * Define argument syntax for command.
   *
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @example
   * ```
   * program.argument('<input-file>');
   * program.argument('[output-file]');
   * ```
   *
   * @returns `this` command for chaining
   */
  argument<Flags extends string, T>(flags: Flags, description: string, fn: (value: string, previous: T) => T): Command<[...Args, StringTypedArgument<Flags, T, undefined>], Options>;
  argument<Flags extends string, T, D extends T | undefined>(flags: Flags, description: string, fn: (value: string, previous: T) => T, defaultValue: D): Command<[...Args, StringTypedArgument<Flags, T, D>], Options>;
  argument<Name extends string>(name: Name, description?: string): Command<[...Args, StringUntypedArgument<Name, undefined>], Options>;
  argument<Name extends string, D extends StringImpliedType<Name> | undefined>(name: Name, description: string, defaultValue: D): Command<[...Args, StringUntypedArgument<Name, D>], Options>;

  /**
   * Define argument syntax for command, adding a prepared argument.
   *
   * @returns `this` command for chaining
   */
  addArgument<Arg extends string, T, D>(arg: Argument<Arg, T, D>): Command<[...Args, StringTypedArgument<Arg, T, D>], Options>;

  /**
   * Define argument syntax for command, adding multiple at once (without descriptions).
   *
   * See also .argument().
   *
   * @example
   * ```
   * program.arguments('<cmd> [env]');
   * ```
   *
   * @returns `this` command for chaining
   */
  arguments<Names extends string>(names: Names): Command<[...Args, ...StringArguments<Names>], Options>;

  /**
   * Override default decision whether to add implicit help command.
   *
   * @example
   * ```
   * addHelpCommand() // force on
   * addHelpCommand(false); // force off
   * addHelpCommand('help [cmd]', 'display help for [cmd]'); // force on with custom details
   * ```
   *
   * @returns `this` command for chaining
   */
  addHelpCommand(enableOrNameAndArgs?: string | boolean, description?: string): this;

  /**
   * Add hook for life cycle event.
   */
  hook(event: HookEvent, listener: (thisCommand: Command, actionCommand: Command) => void | Promise<void>): this;

  /**
   * Register callback to use as replacement for calling process.exit.
   */
  exitOverride(callback?: (err: CommanderError) => never|void): this;

  /**
   * Display error message and exit (or call exitOverride).
   */
  error(message: string, errorOptions?: ErrorOptions): never;

  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   */
  createHelp(): Help;

  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   */
  configureHelp(configuration: HelpConfiguration): this;
  /** Get configuration */
  configureHelp(): HelpConfiguration;

  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   * ```
   * // functions to change where being written, stdout and stderr
   * writeOut(str)
   * writeErr(str)
   * // matching functions to specify width for wrapping help
   * getOutHelpWidth()
   * getErrHelpWidth()
   * // functions based on what is being written out
   * outputError(str, write) // used for displaying errors, and not used for displaying help
   * ```
   */
  configureOutput(configuration: OutputConfiguration): this;
  /** Get configuration */
  configureOutput(): OutputConfiguration;

  /**
   * Copy settings that are useful to have in common across root command and subcommands.
   *
   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
   */
  copyInheritedSettings(sourceCommand: Command): this;

  /**
   * Display the help or a custom message after an error occurs.
   */
  showHelpAfterError(displayHelp?: boolean | string): this;

  /**
   * Display suggestion of similar commands for unknown commands, or options for unknown options.
   */
  showSuggestionAfterError(displaySuggestion?: boolean): this;

  /**
   * Register callback `fn` for the command.
   *
   * @example
   * ```
   * program
   *   .command('serve')
   *   .description('start service')
   *   .action(function() {
   *     // do work here
   *   });
   * ```
   *
   * @returns `this` command for chaining
   */
  action(fn: (this: this, ...args: [...Args, Options, this]) => (void | Promise<void>)): this;

  /**
   * Define option with `flags`, `description` and optional
   * coercion `fn`.
   *
   * The `flags` string contains the short and/or long flags,
   * separated by comma, a pipe or space. The following are all valid
   * all will output this way when `--help` is used.
   *
   *     "-p, --pepper"
   *     "-p|--pepper"
   *     "-p --pepper"
   *
   * @example
   * ```
   * // simple boolean defaulting to false
   *  program.option('-p, --pepper', 'add pepper');
   *
   *  --pepper
   *  program.pepper
   *  // => Boolean
   *
   *  // simple boolean defaulting to true
   *  program.option('-C, --no-cheese', 'remove cheese');
   *
   *  program.cheese
   *  // => true
   *
   *  --no-cheese
   *  program.cheese
   *  // => false
   *
   *  // required argument
   *  program.option('-C, --chdir <path>', 'change the working directory');
   *
   *  --chdir /tmp
   *  program.chdir
   *  // => "/tmp"
   *
   *  // optional argument
   *  program.option('-c, --cheese [type]', 'add cheese [marble]');
   * ```
   *
   * @returns `this` command for chaining
   */
  option<Flags extends string>(flags: Flags, description?: string): Command<Args, MergeOptions<Options, StringUntypedOption<Flags, undefined>>>;
  option<Flags extends string, D extends StringImpliedType<Flags, true> | undefined>(flags: Flags, description: string, defaultValue: D): Command<Args, MergeOptions<Options, StringUntypedOption<Flags, D>>>;
  option<Flags extends string, T>(flags: Flags, description: string, fn: (value: string, previous: T) => T): Command<Args, MergeOptions<Options, StringTypedOption<Flags, T, undefined>>>;
  option<Flags extends string, T, D extends T | undefined>(flags: Flags, description: string, fn: (value: string, previous: T) => T, defaultValue: D): Command<Args, MergeOptions<Options, StringTypedOption<Flags, T, D>>>;
  /** @deprecated since v7, instead use choices or a custom function */
  option(flags: string, description: string, regexp: RegExp, defaultValue?: string | boolean | string[]): this;

  /**
   * Define a required option, which must have a value after parsing. This usually means
   * the option must be specified on the command line. (Otherwise the same as .option().)
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
   */
  requiredOption<Flags extends string>(flags: Flags, description?: string): Command<Args, MergeOptions<Options, Required<StringUntypedOption<Flags, undefined>>>>;
  requiredOption<Flags extends string, D extends StringImpliedType<Flags, true> | undefined>(flags: Flags, description: string, defaultValue: D): Command<Args, MergeOptions<Options, Required<StringUntypedOption<Flags, D>>>>;
  requiredOption<Flags extends string, T>(flags: Flags, description: string, fn: (value: string, previous: T) => T): Command<Args, MergeOptions<Options, Required<StringTypedOption<Flags, T, undefined>>>>;
  requiredOption<Flags extends string, T, D extends T | undefined>(flags: Flags, description: string, fn: (value: string, previous: T) => T, defaultValue: D): Command<Args, MergeOptions<Options, Required<StringTypedOption<Flags, T, D>>>>;
  /** @deprecated since v7, instead use choices or a custom function */
  requiredOption(flags: string, description: string, regexp: RegExp, defaultValue?: string | boolean | string[]): this;

  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   */

  createOption<Flags extends string>(flags: Flags, description?: string): Option<Flags>;

  /**
   * Add a prepared Option.
   *
   * See .option() and .requiredOption() for creating and attaching an option in a single call.
   */
  addOption<Flags extends string, T, D, M>(option: Option<Flags, T, D, M>): Command<Args, MergeOptions<Options, M extends true ? Required<StringTypedOption<Flags, T, D>> : StringTypedOption<Flags, T, D>>>;

  /**
   * Whether to store option values as properties on command object,
   * or store separately (specify false). In both cases the option values can be accessed using .opts().
   *
   * @returns `this` command for chaining
   */
  storeOptionsAsProperties<T extends OptionValues>(): this & T & Options;
  storeOptionsAsProperties<T extends OptionValues>(storeAsProperties: true): this & T & Options;
  storeOptionsAsProperties(storeAsProperties?: boolean): this;

  /**
   * Retrieve option value.
   */
  getOptionValue<K extends string>(key: K): Options[K];

  /**
   * Store option value.
   */
  setOptionValue<K extends string, V>(key: K, value: V): Command<Args, { [OK in keyof Options]: OK extends K ? V : Options[OK] }>;

  /**
   * Store option value and where the value came from.
   */
  setOptionValueWithSource<K extends string, V>(key: K, value: V, source: OptionValueSource): Command<Args, { [OK in keyof Options]: OK extends K ? V : Options[OK] }>;

  /**
   * Retrieve option value source.
   */
  getOptionValueSource(key: string): OptionValueSource;

  /**
   * Alter parsing of short flags with optional values.
   *
   * @example
   * ```
   * // for `.option('-f,--flag [value]'):
   * .combineFlagAndOptionalValue(true)  // `-f80` is treated like `--flag=80`, this is the default behaviour
   * .combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   * ```
   *
   * @returns `this` command for chaining
   */
  combineFlagAndOptionalValue(combine?: boolean): this;

  /**
   * Allow unknown options on the command line.
   *
   * @returns `this` command for chaining
   */
  allowUnknownOption(allowUnknown?: boolean): this;

  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @returns `this` command for chaining
   */
  allowExcessArguments(allowExcess?: boolean): this;

  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   *
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @returns `this` command for chaining
   */
  enablePositionalOptions(positional?: boolean): this;

  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   *
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @returns `this` command for chaining
   */
  passThroughOptions(passThrough?: boolean): this;

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * @example
   * ```
   * program.parse(process.argv);
   * program.parse(); // implicitly use process.argv and auto-detect node vs electron conventions
   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   * ```
   *
   * @returns `this` command for chaining
   */
  parse(argv?: readonly string[], options?: ParseOptions): this;

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * @example
   * ```
   * program.parseAsync(process.argv);
   * program.parseAsync(); // implicitly use process.argv and auto-detect node vs electron conventions
   * program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   * ```
   *
   * @returns Promise
   */
  parseAsync(argv?: readonly string[], options?: ParseOptions): Promise<this>;

  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   *     argv => operands, unknown
   *     --known kkk op => [op], []
   *     op --known kkk => [op], []
   *     sub --unknown uuu op => [sub], [--unknown uuu op]
   *     sub -- --unknown uuu op => [sub --unknown uuu op], []
   */
  parseOptions(argv: string[]): ParseOptionsResult;

  /**
   * Return an object containing local option values as key-value pairs
   */
  opts<T extends OptionValues>(): T & Options;

  /**
   * Return an object containing merged local and global option values as key-value pairs.
   */
  optsWithGlobals<T extends OptionValues>(): T & Options;

  /**
   * Set the description.
   *
   * @returns `this` command for chaining
   */

  description(str: string): this;
  /** @deprecated since v8, instead use .argument to add command argument with description */
  description(str: string, argsDescription: {[argName: string]: string}): this;
  /**
   * Get the description.
   */
  description(): string;

  /**
   * Set the summary. Used when listed as subcommand of parent.
   *
   * @returns `this` command for chaining
   */

  summary(str: string): this;
  /**
   * Get the summary.
   */
  summary(): string;

  /**
   * Set an alias for the command.
   *
   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
   *
   * @returns `this` command for chaining
   */
  alias(alias: string): this;
  /**
   * Get alias for the command.
   */
  alias(): string;

  /**
   * Set aliases for the command.
   *
   * Only the first alias is shown in the auto-generated help.
   *
   * @returns `this` command for chaining
   */
  aliases(aliases: readonly string[]): this;
  /**
   * Get aliases for the command.
   */
  aliases(): string[];

  /**
   * Set the command usage.
   *
   * @returns `this` command for chaining
   */
  usage(str: string): this;
  /**
   * Get the command usage.
   */
  usage(): string;

  /**
   * Set the name of the command.
   *
   * @returns `this` command for chaining
   */
  name(str: string): this;
  /**
   * Get the name of the command.
   */
  name(): string;

  /**
   * Set the name of the command from script filename, such as process.argv[1],
   * or require.main.filename, or __filename.
   *
   * (Used internally and public although not documented in README.)
   *
   * @example
   * ```ts
   * program.nameFromFilename(require.main.filename);
   * ```
   *
   * @returns `this` command for chaining
   */
  nameFromFilename(filename: string): this;

  /**
   * Set the directory for searching for executable subcommands of this command.
   *
   * @example
   * ```ts
   * program.executableDir(__dirname);
   * // or
   * program.executableDir('subcommands');
   * ```
   *
   * @returns `this` command for chaining
   */
  executableDir(path: string): this;
  /**
   * Get the executable search directory.
   */
  executableDir(): string;

  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   */
  outputHelp(context?: HelpContext): void;
  /** @deprecated since v7 */
  outputHelp(cb?: (str: string) => string): void;

  /**
   * Return command help documentation.
   */
  helpInformation(context?: HelpContext): string;

  /**
   * You can pass in flags and a description to override the help
   * flags and help description for your command. Pass in false
   * to disable the built-in help option.
   */
  helpOption(flags?: string | boolean, description?: string): this;

  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   */
  help(context?: HelpContext): never;
  /** @deprecated since v7 */
  help(cb?: (str: string) => string): never;

  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   */
  addHelpText(position: AddHelpTextPosition, text: string): this;
  addHelpText(position: AddHelpTextPosition, text: (context: AddHelpTextContext) => string): this;

  /**
   * Add a listener (callback) for when events occur. (Implemented using EventEmitter.)
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export interface CommandOptions {
  hidden?: boolean;
  isDefault?: boolean;
  /** @deprecated since v7, replaced by hidden */
  noHelp?: boolean;
}
export interface ExecutableCommandOptions extends CommandOptions {
  executableFile?: string;
}

export interface ParseOptionsResult {
  operands: string[];
  unknown: string[];
}

export function createCommand(name?: string): Command;
export function createOption<Flags extends string>(flags: Flags, description?: string): Option<Flags>;
export function createArgument<Arg extends string>(name: Arg, description?: string): Argument<Arg>;

export const program: Command;
