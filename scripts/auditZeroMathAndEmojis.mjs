import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const filesToAudit = [
  'src/components/developments/DevelopmentApprovalsTab.tsx',
  'src/components/developments/DevelopmentCostStackTab.tsx',
  'src/components/developments/DevelopmentFinanceTab.tsx',
  'src/components/developments/DevelopmentKpiBanner.tsx',
  'src/components/developments/DevelopmentProjectModal.tsx',
  'src/components/developments/DevelopmentUnitInventoryTab.tsx',
  'src/components/proposal/DevelopmentFeasibilitySection.tsx',
];

const emojiAuditFiles = [
  ...filesToAudit,
  'src/app/developments/page.tsx',
  'src/lib/calculations/developments.ts',
  'src/lib/store/slices/developmentSlice.ts',
  'src/lib/store/utils/taskSync.ts',
];

const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;

console.log('====================================================');
console.log('STATIC ANALYSIS AUDIT: ZERO INLINE MATH & EMOJI SCAN');
console.log('====================================================\n');

let totalMathViolations = 0;
let totalEmojiViolations = 0;

// 1. Zero Inline Financial Math Audit using TypeScript AST
console.log('--- 1. AST AUDIT: ZERO INLINE FINANCIAL MATH IN JSX ---');
for (const relPath of filesToAudit) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File NOT found: ${relPath}`);
    process.exit(1);
  }
  const code = fs.readFileSync(fullPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    fullPath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const fileViolations = [];

  function checkNode(node, insideJsx) {
    const isJsxExpr = ts.isJsxExpression(node);
    const nowInsideJsx = insideJsx || isJsxExpr;

    if (nowInsideJsx && ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      const isArithmetic =
        op === ts.SyntaxKind.PlusToken ||
        op === ts.SyntaxKind.MinusToken ||
        op === ts.SyntaxKind.AsteriskToken ||
        op === ts.SyntaxKind.SlashToken ||
        op === ts.SyntaxKind.PercentToken;

      if (isArithmetic) {
        // Exclude string concatenation (where left or right is string literal)
        const leftIsString = ts.isStringLiteral(node.left) || ts.isNoSubstitutionTemplateLiteral(node.left);
        const rightIsString = ts.isStringLiteral(node.right) || ts.isNoSubstitutionTemplateLiteral(node.right);
        if (op === ts.SyntaxKind.PlusToken && (leftIsString || rightIsString)) {
          // Allowed string concatenation
        } else {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          fileViolations.push({
            line: line + 1,
            character: character + 1,
            text: node.getText(sourceFile),
          });
        }
      }
    }

    ts.forEachChild(node, (child) => checkNode(child, nowInsideJsx));
  }

  ts.forEachChild(sourceFile, (node) => checkNode(node, false));

  if (fileViolations.length === 0) {
    console.log(`PASS: ${relPath} — 0 inline math operators in JSX`);
  } else {
    console.error(`FAIL: ${relPath} — ${fileViolations.length} inline math violation(s):`);
    for (const v of fileViolations) {
      console.error(`   Line ${v.line}:${v.character} -> ${v.text}`);
    }
    totalMathViolations += fileViolations.length;
  }
}

// 2. WhatsApp & UI Emoji Audit
console.log('\n--- 2. EMOJI AUDIT: ZERO UNICODE EMOJIS OR DINGBATS ---');
for (const relPath of emojiAuditFiles) {
  const fullPath = path.resolve(process.cwd(), relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const lines = code.split('\n');
  const violations = [];

  lines.forEach((lineText, idx) => {
    const match = lineText.match(emojiRegex);
    if (match) {
      violations.push({ line: idx + 1, match: match[0], text: lineText.trim() });
    }
  });

  if (violations.length === 0) {
    console.log(`PASS: ${relPath} — 0 Unicode emojis`);
  } else {
    console.error(`FAIL: ${relPath} — ${violations.length} emoji violation(s):`);
    for (const v of violations) {
      console.error(`   Line ${v.line}: '${v.match}' in: "${v.text}"`);
    }
    totalEmojiViolations += violations.length;
  }
}

console.log('\n====================================================');
console.log(`AUDIT SUMMARY: Math Violations: ${totalMathViolations}, Emoji Violations: ${totalEmojiViolations}`);
console.log('====================================================');

if (totalMathViolations > 0 || totalEmojiViolations > 0) {
  process.exit(1);
} else {
  console.log('AUDIT PASSED WITH 0 VIOLATIONS.');
  process.exit(0);
}
