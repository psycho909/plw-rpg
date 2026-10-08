#!/usr/bin/env node
// Static TypeScript AST enumeration for Phase 7-A content registries.
import fs from 'node:fs';
import ts from 'typescript';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));

function unwrap(node) {
  while (node && [
    ts.SyntaxKind.ParenthesizedExpression,
    ts.SyntaxKind.AsExpression,
    ts.SyntaxKind.SatisfiesExpression,
    ts.SyntaxKind.TypeAssertionExpression,
    ts.SyntaxKind.NonNullExpression,
  ].includes(node.kind)) node = node.expression;
  return node;
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (ts.isComputedPropertyName(node)) {
    const expression = node.expression;
    if (ts.isStringLiteral(expression) || ts.isNumericLiteral(expression)) return expression.text;
  }
  return undefined;
}

function propertyInitializer(property) {
  return ts.isPropertyAssignment(property) ? unwrap(property.initializer) : undefined;
}

function staticValue(node) {
  node = unwrap(node);
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  return undefined;
}

function variableInitializer(sourceFile, name) {
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      if (found) throw new Error(`Duplicate variable declaration: ${name}`);
      found = unwrap(node.initializer);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (!found) throw new Error(`Missing variable initializer: ${name}`);
  return found;
}

function parse(request) {
  const sourceText = request.sourceText ?? fs.readFileSync(request.file, 'utf8');
  const sourceFile = ts.createSourceFile(request.file ?? 'fixture.ts', sourceText, ts.ScriptTarget.Latest, true);
  if (request.operation === 'fixture') {
    return Object.fromEntries(request.names.map(name => [name, objectKeys(variableInitializer(sourceFile, name))]));
  }
  const initializer = variableInitializer(sourceFile, request.name);
  if (request.operation === 'objectKeys') return objectKeys(initializer);
  if (request.operation === 'arrayFieldValues') {
    if (!ts.isArrayLiteralExpression(initializer)) throw new Error(`${request.name} is not an array literal`);
    return initializer.elements.map(element => fieldValue(unwrap(element), request.field));
  }
  if (request.operation === 'objectFieldValues') {
    return objectProperties(initializer).map(property => fieldValue(propertyInitializer(property), request.field));
  }
  throw new Error(`Unsupported operation: ${request.operation}`);
}

function objectProperties(node) {
  node = unwrap(node);
  if (!node || !ts.isObjectLiteralExpression(node)) throw new Error('Expected a static object literal initializer');
  return [...node.properties].filter(property => propertyName(property.name) !== undefined);
}

function objectKeys(node) {
  return objectProperties(node).map(property => propertyName(property.name));
}

function fieldValue(node, field) {
  node = unwrap(node);
  if (!node || !ts.isObjectLiteralExpression(node)) throw new Error(`Expected object entry while reading ${field}`);
  for (const property of node.properties) {
    if (propertyName(property.name) === field) {
      const value = propertyInitializer(property);
      const result = staticValue(value);
      if (result === undefined) throw new Error(`Field ${field} must have a static literal value`);
      return result;
    }
  }
  throw new Error(`Missing field ${field} in object entry`);
}

try {
  process.stdout.write(JSON.stringify(input.map(parse)));
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
}
