import { Application } from 'src/application';
import { S3 } from 'aws-sdk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import archiver from 'archiver';
const debug = require('debug')('eb:application');

export class Archive {
	constructor(
		private readonly application: Application,
		private readonly s3: S3
	) {}

	async checkUploaded(applicationName, versionLabel) {
		debug(`Checking if version label ${versionLabel} is already uploaded`);
		const allApplicationVersions = await this.application.getApplicationVersions(
			applicationName
		);
		return allApplicationVersions.includes(versionLabel);
	}

	async upload({
		applicationName,
		filePath,
		versionLabel = Date.now().toString(),
	}: {
		applicationName: string;
		filePath: string;
		versionLabel?: string;
	}) {
		if (await this.checkUploaded(applicationName, versionLabel)) {
			debug(
				`Version label ${versionLabel} already exists for application ${applicationName}`
			);
			return;
		}

		if (!fs.existsSync(filePath)) {
			throw new Error(`File path ${filePath} does not exist`);
		}

		if (fs.statSync(filePath).isDirectory()) {
			debug(`Zipping folder ${filePath}`);

			const tempDir = await fs.mkdtempSync(
				path.join(os.tmpdir(), 'eb-toolkit-')
			);
			const outFile = path.join(tempDir, `${versionLabel}.zip`);
			await this.zipFolder(filePath, outFile);
			filePath = outFile;
		}

		const {
			S3Bucket: s3Bucket,
		} = await this.application.createStorageLocation();
		if (!s3Bucket) {
			throw new Error(`Failed to create S3 bucket`);
		}

		const key = await this.uploadToS3(s3Bucket, filePath);
		await this.application.createApplicationVersion({
			applicationName,
			bucket: s3Bucket,
			versionLabel,
			key,
		});

		return versionLabel;
	}

	private async uploadToS3(s3Bucket: string, filePath: string) {
		debug(`Uploading ${filePath} to bucket ${s3Bucket}`);
		const keyName = path.basename(filePath);
		await this.s3
			.upload({
				Bucket: s3Bucket,
				Key: keyName,
				Body: fs.createReadStream(filePath),
			})
			.promise();
		return keyName;
	}

	private zipFolder(source, outFile) {
		const archive = archiver('zip', { zlib: { level: 9 } });
		const stream = fs.createWriteStream(outFile);

		return new Promise((resolve, reject) => {
			archive
				.directory(source, false)
				.on('error', err => reject(err))
				.pipe(stream);

			stream.on('close', () => resolve());
			archive.finalize();
		});
	}
}
