#! /usr/bin/env node

import yargs from 'yargs';

yargs
	.scriptName('eb-toolkit')
	.command(require('./cli/deploy').default)
	.command(require('./cli/get-default-environment').default)
	.command(require('./cli/get-environments').default)
	.command(require('./cli/get-application-versions').default)
	.command(require('./cli/get-solution-stacks').default)
	.command(require('./cli/clean-application-versions').default)
	.command(require('./cli/clean-application-environments').default)
	.command(require('./cli/delete-application').default)
	.command(require('./cli/describe-environment').default)
	.strict(true)
	.showHelpOnFail(false).argv;
