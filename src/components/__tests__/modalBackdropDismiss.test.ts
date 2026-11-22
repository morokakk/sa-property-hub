import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getAttr(
  attrs: ts.JsxAttributes,
  name: string
): ts.JsxAttribute | undefined {
  for (const prop of attrs.properties) {
    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name) && prop.name.text === name) {
      return prop;
    }
  }
  return undefined;
}

function getSpreadIdentifiers(attrs: ts.JsxAttributes): string[] {
  const names: string[] = [];
  for (const prop of attrs.properties) {
    if (ts.isJsxSpreadAttribute(prop) && ts.isIdentifier(prop.expression)) {
      names.push(prop.expression.text);
    }
  }
  return names;
}

function getClassNameText(attrs: ts.JsxAttributes, sourceFile: ts.SourceFile): string {
  const attr = getAttr(attrs, 'className');
  if (!attr?.initializer) return '';
  if (ts.isStringLiteral(attr.initializer)) {
    return attr.initializer.text;
  }
  return attr.initializer.getText(sourceFile);
}

function hasFixedInsetZero(classNameText: string): boolean {
  return /\bfixed\b/.test(classNameText) && /\binset-0\b/.test(classNameText);
}

interface HookCallInfo {
  varName: string;
  args: string[];
  line: number;
}

interface OverlayInfo {
  file: string;
  line: number;
  className: string;
  hasOnClick: boolean;
  onClickText: string;
  hasClickCatcherChild: boolean;
  spreadDismissHook?: HookCallInfo;
}

function inspectFile(filePath: string): {
  hookCalls: HookCallInfo[];
  overlays: OverlayInfo[];
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const hookCalls: HookCallInfo[] = [];
  const hookByVar = new Map<string, HookCallInfo>();

  function collectHooks(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'useModalBackdropDismiss'
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );
      const info: HookCallInfo = {
        varName: node.name.text,
        args: node.initializer.arguments.map((a) => a.getText(sourceFile)),
        line: line + 1,
      };
      hookCalls.push(info);
      hookByVar.set(info.varName, info);
    }
    ts.forEachChild(node, collectHooks);
  }

  collectHooks(sourceFile);

  const overlays: OverlayInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      const attrs = opening.attributes;
      const className = getClassNameText(attrs, sourceFile);

      if (hasFixedInsetZero(className)) {
        const onClickAttr = getAttr(attrs, 'onClick');
        const spreadNames = getSpreadIdentifiers(attrs);
        const spreadDismissHook = spreadNames
          .map((n) => hookByVar.get(n))
          .find((h): h is HookCallInfo => Boolean(h));

        const immediateChildClickCatcher = node.children.some((child) => {
          const childAttrs = ts.isJsxSelfClosingElement(child)
            ? child.attributes
            : ts.isJsxElement(child)
            ? child.openingElement.attributes
            : undefined;
          if (!childAttrs) return false;
          const childClass = getClassNameText(childAttrs, sourceFile);
          const childHasOnClick = Boolean(getAttr(childAttrs, 'onClick'));
          const childHasHookSpread = getSpreadIdentifiers(childAttrs).some((n) =>
            hookByVar.has(n)
          );
          return hasFixedInsetZero(childClass) && (childHasOnClick || childHasHookSpread);
        });

        const { line } = sourceFile.getLineAndCharacterOfPosition(
          opening.getStart(sourceFile)
        );

        overlays.push({
          file: filePath,
          line: line + 1,
          className,
          hasOnClick: Boolean(onClickAttr),
          onClickText: onClickAttr ? onClickAttr.getText(sourceFile) : '',
          hasClickCatcherChild: immediateChildClickCatcher,
          spreadDismissHook,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { hookCalls, overlays };
}

describe('Modal Backdrop Click-Outside Dismissal', () => {
  const srcRoot = path.resolve(__dirname, '../..');
  const tsxFiles = [
    ...collectTsxFiles(path.join(srcRoot, 'app')),
    ...collectTsxFiles(path.join(srcRoot, 'components')),
  ];

  it('every fixed inset-0 modal overlay supports click-outside dismissal', () => {
    const allOverlays = tsxFiles.flatMap((f) => inspectFile(f).overlays);
    expect(allOverlays.length).toBeGreaterThan(35);

    const missingDismiss = allOverlays.filter(
      (overlay) =>
        !overlay.hasOnClick &&
        !overlay.hasClickCatcherChild &&
        !overlay.spreadDismissHook
    );

    expect(
      missingDismiss.map((o) => `${path.relative(srcRoot, o.file)}:${o.line}`)
    ).toEqual([]);
  });

  it('nested sub-modals inside MeterReadingsModal use useModalBackdropDismiss for drag-safe and nested-safe dismissal', () => {
    const nestedFiles = [
      path.join(srcRoot, 'components/rentals/MeterReadingsModal.tsx'),
      path.join(srcRoot, 'components/rentals/DisputeLetterModal.tsx'),
      path.join(srcRoot, 'components/rentals/MunicipalDirectoryModal.tsx'),
      path.join(srcRoot, 'components/rentals/PropertyMeterRegistryModal.tsx'),
    ];

    for (const file of nestedFiles) {
      const { overlays } = inspectFile(file);
      expect(overlays.length).toBeGreaterThan(0);

      for (const overlay of overlays) {
        expect(overlay.spreadDismissHook).toBeDefined();
      }
    }
  });

  it('async modals guard backdrop dismissal while upload, parsing, PDF, or submission is in flight', () => {
    const expectedGuards: Array<{
      relPath: string;
      expectedCloseArg: string;
      expectedGuardSubstrings: string[];
      expectedOverlayCount: number;
    }> = [
      {
        relPath: 'components/rentals/StatementUploadModal.tsx',
        expectedCloseArg: 'onClose',
        expectedGuardSubstrings: ['isBackdropDismissDisabled'],
        expectedOverlayCount: 1,
      },
      {
        relPath: 'components/rentals/UnifiedPdfVerificationModal.tsx',
        expectedCloseArg: 'onClose',
        expectedGuardSubstrings: ['isBackdropDismissDisabled'],
        expectedOverlayCount: 2,
      },
      {
        relPath: 'components/statements/TenantStatementViewer.tsx',
        expectedCloseArg: 'handleCloseMaintenanceModal',
        expectedGuardSubstrings: ['isSubmittingMaintenance'],
        expectedOverlayCount: 1,
      },
      {
        relPath: 'components/rentals/TenantStatement.tsx',
        expectedCloseArg: 'onClose',
        expectedGuardSubstrings: ['isBackdropDismissDisabled'],
        expectedOverlayCount: 1,
      },
      {
        relPath: 'components/rentals/DisputeLetterModal.tsx',
        expectedCloseArg: 'onClose',
        expectedGuardSubstrings: ['isBackdropDismissDisabled'],
        expectedOverlayCount: 1,
      },
    ];

    for (const item of expectedGuards) {
      const fullPath = path.join(srcRoot, item.relPath);
      const { overlays } = inspectFile(fullPath);
      expect(overlays).toHaveLength(item.expectedOverlayCount);

      for (const overlay of overlays) {
        expect(overlay.spreadDismissHook).toBeDefined();
        expect(overlay.spreadDismissHook?.args[0]).toBe(item.expectedCloseArg);
        expect(overlay.spreadDismissHook?.args.length).toBeGreaterThanOrEqual(2);
        const guardArg = overlay.spreadDismissHook?.args[1] || '';
        for (const sub of item.expectedGuardSubstrings) {
          expect(guardArg).toContain(sub);
        }
      }
    }
  });
});
