import AWS, { ElasticBeanstalk, S3 } from 'aws-sdk';
import { Environment } from 'src/environment';
import { difference } from 'lodash';
import { sleep } from 'wait-promise';
import { Archive } from 'src/archive';

const debug = require('debug')('eb:application');

export class Application {
	private readonly s3: AWS.S3;
	private readonly elasticbeanstalk: ElasticBeanstalk;
	environment: Environment;
	private archive: Archive;

	constructor(credentials: any = undefined) {
		// AWS Services
		this.s3 = new S3(credentials);
		this.elasticbeanstalk = new ElasticBeanstalk(credentials);

		this.environment = new Environment(this.elasticbeanstalk);
		this.archive = new Archive(this, this.s3);
	}

	/**
	 * @param filePath - The path of archive to deploy (e.g. AppName-version.zip)
	 * @param environmentName - Environment to provision (e.g. my-awesome-app)
	 * @param stack - Stack to provision (e.g. '64bit Amazon Linux 2015.03 v2.0.0 running Node.js')
	 * @param config - Configuration overrides for the environment (optional)
	 * @param versionLabel - Optional version label
	 * @param applicationName - The application name
	 * @param tags - This specifies the tags applied to resources in the environment. (optional)
	 * @param tier - This specifies the tier ie WebServer (default) or Worker. (optional)
	 * @returns Promise
	 */
	async deploy({
		filePath,
		environmentName,
		stack,
		beanstalkConfig: config,
		versionLabel,
		applicationName,
		tags,
		tier = 'WebServer',
	}: {
		filePath: string;
		environmentName: string;
		applicationName: string;
		stack: string;
		versionLabel?: string;
		beanstalkConfig?: any;
		tags?: any[];
		tier: 'WebServer' | 'Worker';
	}) {
		// Upload artifact
		versionLabel = await this.archive.upload({
			filePath,
			versionLabel,
			applicationName,
		});

		// Get environment status
		const env = await this.environment.describeEnvironment(environmentName);

		// If environment does not exist, create a new environment
		// Otherwise, update environment with new version
		if (env) {
			debug(`Deploying ${versionLabel} to ${environmentName}...`);
			await this.environment.deploy({
				versionLabel,
				environmentName,
				config,
			});
			await this.environment.waitUntil({
				environmentName,
				statusCheck(desc) {
					return !!desc && desc.Status !== 'Updating';
				},
			});
		} else {
			debug(
				`Create stack ${stack} for ${applicationName} - ${versionLabel}`
			);
			await this.environment.create({
				applicationName,
				environmentName,
				versionLabel,
				stack,
				config,
				tags,
				tier,
			});
			await this.environment.waitUntil({
				environmentName,
				statusCheck(desc) {
					return !!desc && desc.Status !== 'Launching';
				},
			});
		}

		// Wait until environment is ready or timeout
		return this.environment.waitUntil({
			environmentName,
			timeout: 300 * 1000,
			statusCheck(desc) {
				return (
					!!desc && desc.Health === 'Green' && desc.Status === 'Ready'
				);
			},
		});
	}

	terminateEnvironment(args: {
		environmentName: string;
		forceTerminate?: boolean;
	}) {
		return this.environment.terminate(args);
	}

	async cleanApplicationVersions(applicationName) {
		const allApplicationVersions = await this.getApplicationVersions(
			applicationName
		);
		const allEnvironments = await this.getEnvironments(applicationName);

		const applicationVersionsInUsed = allEnvironments.map(
			({ VersionLabel }) => VersionLabel
		);

		const applicationVersionToDelete = difference(
			allApplicationVersions,
			applicationVersionsInUsed
		);

		for (const version of applicationVersionToDelete) {
			if (!version) {
				continue;
			}
			await sleep(1000);
			debug(`Deleting version ${version}`);
			await this.deleteApplicationVersion({
				version,
				applicationName,
			});
		}
	}

	async cleanEnvironments(appName: string, appEnv: string) {
		const defaultEnvironmentName = await this.getDefaultEnvironment(
			appName,
			appEnv
		);
		const allEnvironments = await this.getEnvironmentsForEnv(
			appName,
			appEnv
		);
		for (const environment of allEnvironments) {
			if (
				!environment.EnvironmentName ||
				environment.EnvironmentName === defaultEnvironmentName
			) {
				continue;
			}
			await this.terminateEnvironment({
				environmentName: environment.EnvironmentName,
				forceTerminate: true,
			});
			await sleep(1000);
		}
	}

	async getEnvironments(applicationName: string) {
		const result = await this.elasticbeanstalk
			.describeEnvironments({
				ApplicationName: applicationName,
				IncludeDeleted: false,
			})
			.promise();
		return result.Environments || [];
	}

	async getApplicationVersions(applicationName: string) {
		const result = await this.elasticbeanstalk
			.describeApplicationVersions({
				ApplicationName: applicationName,
			})
			.promise();

		return (result.ApplicationVersions || []).map(
			({ VersionLabel }) => VersionLabel
		);
	}

	deleteApplication(applicationName, terminateEnvByForce = false) {
		debug(
			`Deleting application ${applicationName} ${
				terminateEnvByForce ? 'by force' : ''
			}`
		);
		return this.elasticbeanstalk
			.deleteApplication({
				ApplicationName: applicationName,
				TerminateEnvByForce: terminateEnvByForce,
			})
			.promise();
	}

	async getDefaultEnvironment(appName: string, appEnv: string) {
		debug(`Get default environment for app ${appName}, env: ${appEnv}`);
		const defaultEnvName = Application.getDefaultEnvironmentName(
			appName,
			appEnv
		);
		const relevantEnvironments = await this.getEnvironmentsForEnv(
			appName,
			appEnv
		);

		return relevantEnvironments.find(relevantEnvironment =>
			relevantEnvironment.CNAME?.startsWith(`${defaultEnvName}.`)
		)?.EnvironmentName;
	}

	async getEnvironmentsForEnv(appName: string, appEnv: string) {
		const environments = await this.getEnvironments(appName);
		return environments.filter(environment =>
			environment.EnvironmentName?.includes(
				Application.getDefaultEnvironmentName(appName, appEnv)
			)
		);
	}

	async getSolutionStack(platform: string) {
		const solutionStacks = await this.elasticbeanstalk
			.listAvailableSolutionStacks()
			.promise();
		return (solutionStacks.SolutionStacks || []).filter(current =>
			current.toLowerCase().includes(platform.toLowerCase())
		);
	}

	static getDefaultEnvironmentName(appName: string, appEnv: string) {
		return `${appName}-${appEnv}`;
	}

	createStorageLocation() {
		return this.elasticbeanstalk.createStorageLocation().promise();
	}

	createApplicationVersion({
		applicationName,
		bucket,
		versionLabel,
		key,
	}: {
		applicationName: string;
		bucket: string;
		versionLabel: string;
		key: string;
	}) {
		return this.elasticbeanstalk
			.createApplicationVersion({
				ApplicationName: applicationName,
				VersionLabel: versionLabel,
				SourceBundle: {
					S3Bucket: bucket,
					S3Key: key,
				},
				AutoCreateApplication: true,
			})
			.promise();
	}

	private async deleteApplicationVersion({
		applicationName,
		version,
	}: {
		applicationName: string;
		version: string;
	}) {
		return this.elasticbeanstalk
			.deleteApplicationVersion({
				DeleteSourceBundle: true,
				ApplicationName: applicationName,
				VersionLabel: version,
			})
			.promise();
	}

	async swapEnvironmentCNAMEs({
		fromEnv,
		toEnv,
	}: {
		fromEnv: string;
		toEnv: string;
	}) {
		debug(`Swap CNAME from ${fromEnv} to ${toEnv}`);
		await this.elasticbeanstalk
			.swapEnvironmentCNAMEs({
				DestinationEnvironmentName: toEnv,
				SourceEnvironmentName: fromEnv,
			})
			.promise();
	}
}
