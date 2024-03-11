
import * as vscode from "vscode";
import * as path from 'path';

const FILE_SCHEME = "file";

export const isLocalWorkspace = (): boolean => {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (workspaceFolders && workspaceFolders.length > 0) {
		return workspaceFolders[0].uri.scheme === FILE_SCHEME;
	}

	return false;
};

export const getActiveEditorFolder = (): vscode.Uri | null => {
	const editor = vscode.window.activeTextEditor;

	if (editor) {
		const filePath = editor.document.uri.fsPath;
		const folderPath = path.dirname(filePath);
		return parseFileToUri(folderPath);
	}

	return null;
};

export const getWorkspaceFolder = (): vscode.Uri | null => {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (workspaceFolders && workspaceFolders.length > 0) {
		return replaceBackwardSlashInUri(workspaceFolders[0].uri);
	}

	return null;
};

export const findFolderInCurrentAndParentFolders = async (folderName: string, startFolder: vscode.Uri): Promise<vscode.Uri | null> => {
	return findFileOrFolderInCurrentAndParentFolders(folderName, startFolder, vscode.workspace.fs.readDirectory);
};

export const findFileInCurrentAndParentFolders = async (fileName: string, startFolder: vscode.Uri): Promise<vscode.Uri | null> => {
	return findFileOrFolderInCurrentAndParentFolders(fileName, startFolder, vscode.workspace.fs.readFile);
};

const findFileOrFolderInCurrentAndParentFolders = async (
	fileOrFolderName: string, 
	startFolder: vscode.Uri, 
	readFunction: { (uri: vscode.Uri): any }
	
): Promise<vscode.Uri | null> => {

	let currentFolder = startFolder.fsPath;
  
	while (currentFolder !== path.dirname(currentFolder)) {
		const filePath = path.join(currentFolder, fileOrFolderName);
  
		try {
			await readFunction(parseFileToUri(filePath));
			return parseFileToUri(filePath);

		} catch (error) {
			currentFolder = path.dirname(currentFolder);
		}
	}
  
	return null;
};

export const parseFileToUri = (filePath: string): vscode.Uri => {
	const newFilePath = replaceBackwardSlashInFilePath(filePath);
	return vscode.Uri.file(newFilePath);
};

const replaceBackwardSlashInUri = (uri: vscode.Uri): vscode.Uri => {
	const filePath = replaceBackwardSlashInFilePath(uri.fsPath);
	return vscode.Uri.file(filePath);
};

const replaceBackwardSlashInFilePath = (filePath: string): string => {
	return filePath?.replace(/\\/g, '/');
};

export const writeToFilePath = async (filePath: vscode.Uri, content: string) => {
	const utf8Buffer = Buffer.from(content, 'utf-8');
	const utf8Array = new Uint8Array(utf8Buffer);

	await vscode.workspace.fs.writeFile(filePath, utf8Array);
};