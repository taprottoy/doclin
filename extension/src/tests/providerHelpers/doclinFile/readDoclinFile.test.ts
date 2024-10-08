import * as vscode from 'vscode';
import { expect } from 'chai';
import { SinonStub, stub } from 'sinon';
import { readDoclinFile } from '../../../providerHelpers/doclinFile/readDoclinFile';
import { DoclinFile } from '../../../types';
import * as doclinFileReadWriteUtil from '../../../utils/doclinFileReadWriteUtil';
import * as path from 'path';

suite('Testing readDoclinFile', () => {
  let getExistingDoclinFilePathStub: SinonStub;

  setup(() => {
    getExistingDoclinFilePathStub = stub(doclinFileReadWriteUtil, 'getExistingDoclinFile');
  });

  teardown(() => {
    getExistingDoclinFilePathStub.restore();
  });

  test('should return DoclinFile from the existing doclin file path', async () => {
    const mockFilePath = path.resolve(__dirname, '../../../../testAssets/.doclin');
    const mockDoclinFileUri = vscode.Uri.file(mockFilePath);
    getExistingDoclinFilePathStub.resolves(mockDoclinFileUri);

    const doclinFile: DoclinFile = await readDoclinFile();

    expect(getExistingDoclinFilePathStub.calledOnce).to.be.true;
    expect(doclinFile.organizationId).to.equal('test-org-id');
    expect(doclinFile.projectId).to.equal(5);
  });

  test('should return empty DoclinFile when doclin file does not exist', async () => {
    getExistingDoclinFilePathStub.resolves(null);

    const doclinFile: DoclinFile = await readDoclinFile();

    expect(getExistingDoclinFilePathStub.calledOnce).to.be.true;
    expect(doclinFile.organizationId).to.be.null;
    expect(doclinFile.projectId).to.be.null;
  });
});
