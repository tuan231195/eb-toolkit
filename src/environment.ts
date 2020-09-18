import { ElasticBeanstalk } from 'aws-sdk';
import { sleep } from 'wait-promise';

const POLL_INTERVAL = 5000;
const DEFAULT_STATUS_TIMEOUT = 1200 * 1000;

const debug = require('debug')('eb:application');

export class Environment {
	constructor(private readonly elasticbeanstalk: ElasticBeanstalk) {}

	async describeEnvironment(
		environmentName: string
	): Promise<ElasticBeanstalk.EnvironmentDescription | null> {
		const result = await this.elasticbeanstalk
			.describeEnvironments({
				EnvironmentNames: [environmentName],
				IncludeDeleted: false,
			})
			.promise();
		return (result.Environments || [])[0];
	}

	async getEnvironment(
		environmentName
	): Promise<ElasticBeanstalk.EnvironmentDescription> {
		const environmentDesc = await this.describeEnvironment(environmentName);
		if (!environmentDesc) {
			throw new Error(`Environment ${environmentName} not found`);
		}
		return environmentDesc;
	}

	async status(
		environmentName: string
	): Promise<ElasticBeanstalk.EnvironmentStatus | undefined> {
		const environmentDesc = await this.getEnvironment(environmentName);

		return environmentDesc.Status;
	}

	async deploy({
		versionLabel,
		environmentName,
		config,
	}: {
		versionLabel: any;
		environmentName: any;
		config: any;
	}) {
		await this.elasticbeanstalk
			.updateEnvironment({
				EnvironmentName: environmentName,
				OptionSettings: config,
				VersionLabel: versionLabel,
			})
			.promise();
	}

	async waitUntil({
		environmentName,
		statusCheck,
		timeout = DEFAULT_STATUS_TIMEOUT,
	}: {
		environmentName: string;
		timeout?: number;
		statusCheck: (
			desc: ElasticBeanstalk.EnvironmentDescription | undefined
		) => boolean;
	}) {
		debug(`Checking status for environment ${environmentName}`);
		let environmentDescription = await this.getEnvironment(environmentName);
		const currentStatus = environmentDescription.Status;
		debug(
			`Current status of environment ${environmentName} is ${currentStatus}`
		);
		const start = Date.now();
		let elapsed = 0;

		while (elapsed <= timeout && !statusCheck(environmentDescription)) {
			process.stdout.write('.');
			environmentDescription = await this.getEnvironment(environmentName);
			elapsed = Date.now() - start;
			await sleep(POLL_INTERVAL);
		}
		console.log();

		if (statusCheck(environmentDescription)) {
			return environmentDescription;
		}

		throw new Error(`Environment ${environmentName} failed status check`);
	}

	async create({
		applicationName,
		environmentName,
		versionLabel,
		config,
		stack,
		tags = [],
		tier = 'WebServer',
	}: {
		applicationName: string;
		environmentName: any;
		versionLabel: any;
		stack: any;
		config: any;
		tags: any;
		tier: 'Worker' | 'WebServer';
	}) {
		debug(`Creating environment ${environmentName}`);
		const available = await this.checkDNSAvailability(environmentName);
		if (!available) {
			throw new Error(`DNS ${environmentName} is not available`);
		}
		await this.elasticbeanstalk
			.createEnvironment({
				EnvironmentName: environmentName,
				ApplicationName: applicationName,
				SolutionStackName: stack,
				Tags: tags,
				Tier: {
					Name: tier,
					Type: tier === 'WebServer' ? 'Standard' : 'SQS/HTTP',
				},
				OptionSettings: config,
				CNAMEPrefix: environmentName,
				VersionLabel: versionLabel,
			})
			.promise();
	}

	async terminate({
		environmentName,
		forceTerminate,
	}: {
		environmentName: string;
		forceTerminate?: boolean;
	}) {
		debug(`Terminating environment ${environmentName}`);
		await this.elasticbeanstalk
			.terminateEnvironment({
				EnvironmentName: environmentName,
				ForceTerminate: forceTerminate,
			})
			.promise();
	}

	checkDNSAvailability(environmentName) {
		debug(`Check ${environmentName} availability`);

		return this.elasticbeanstalk
			.checkDNSAvailability({
				CNAMEPrefix: environmentName,
			})
			.promise()
			.then(data => data.Available);
	}
}
