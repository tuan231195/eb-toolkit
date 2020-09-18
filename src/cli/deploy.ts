require('source-map-support').install();

import { Application } from 'src/application';
import { CommandModule } from 'yargs';
import { Deployment } from 'src/deployment';

const commandModule: CommandModule = {
	describe: 'deploy a beanstalk application version',
	handler: async function(argv: any) {
		const deployment = new Deployment({
			region: argv.region,
		});
		const application = new Application({
			region: argv.region,
		});
		let stack = argv.stack;
		if (!stack && argv.platform) {
			const available = await application.getSolutionStack(argv.platform);
			stack = available[0];
		}

		if (!stack) {
			throw new Error('Must specify a stack');
		}

		argv.stack = stack;

		await deployment.deploy(argv);
	},
	command: 'deploy',
	builder: {
		appName: {
			demandOption: true,
			type: 'string',
			description: 'Beanstalk application name',
		},
		appEnv: {
			demandOption: true,
			type: 'string',
			description: 'Beanstalk application env',
		},
		versionLabel: {
			demandOption: false,
			type: 'string',
			description: 'Beanstalk version label',
		},
		filePath: {
			demandOption: true,
			type: 'string',
			description: 'Beanstalk file path',
		},
		stack: {
			demandOption: false,
			type: 'string',
			description: 'Beanstalk stack solution',
		},
		platform: {
			demandOption: false,
			type: 'string',
			description: 'The platform to use (Nodejs/Java)',
		},
		beanstalkConfig: {
			demandOption: false,
			type: 'string',
			description: 'Beanstalk config file path',
		},
		tier: {
			demandOption: false,
			type: 'string',
			description: 'Beanstalk tier',
			default: 'WebServer',
		},
		deploymentStrategy: {
			demandOption: false,
			type: 'string',
			default: 'standard',
			choices: ['bluegreen', 'standard'],
			description: 'Deployment strategy (bluegreen or standard)',
		},
		region: {
			demandOption: false,
			type: 'string',
			description: 'AWS region',
		},
	},
};

export default commandModule;
