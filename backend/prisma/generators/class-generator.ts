#!/usr/bin/env ts-node

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'node:path';
import pkg from '@prisma/generator-helper';
import type { DMMF, GeneratorOptions } from '@prisma/generator-helper';
const { generatorHandler } = pkg;

generatorHandler({
  onManifest() {
    return {
      defaultOutput: '../../src/_gen/prisma-class',
      prettyName: 'Prisma Class Generator',
    };
  },

  async onGenerate(options: GeneratorOptions) {
    const output =
      options.generator.output?.value || '../src/_gen/prisma-class';
    const dmmf = options.dmmf.datamodel;

    mkdirSync(output, { recursive: true });

    const modelNames: string[] = [];

    // Generate class and relations for each model
    for (const model of dmmf.models) {
      const className = model.name;
      const fileName = toSnakeCase(model.name);

      // Generate main class
      let classContent = generateImports(model, dmmf);
      classContent += `\nexport class ${className} {\n`;

      for (const field of model.fields) {
        if (field.kind === 'scalar' || field.kind === 'enum') {
          classContent += generateProperty(field);
        }
      }

      classContent += '}\n';

      const filePath = join(output, `${fileName}.ts`);
      writeFileSync(filePath, classContent, 'utf-8');
      console.log(`✓ Generated ${className} class at ${filePath}`);

      // Generate relations class
      let relationsContent = generateImports(model, dmmf, true);
      relationsContent += `\nexport class ${className}Relations {\n`;

      for (const field of model.fields) {
        if (field.kind === 'object') {
          relationsContent += generateRelationProperty(field);
        }
      }

      relationsContent += '}\n';

      const relationsPath = join(output, `${fileName}_relations.ts`);
      writeFileSync(relationsPath, relationsContent, 'utf-8');
      console.log(
        `✓ Generated ${className}Relations class at ${relationsPath}`,
      );

      modelNames.push(className);
    }

    // Generate index file with PrismaModel namespace
    const indexContent = generateIndexFile(modelNames);
    writeFileSync(join(output, 'index.ts'), indexContent, 'utf-8');
    console.log(`✓ Generated index.ts with PrismaModel namespace`);
  },
});

function generateImports(
  model: DMMF.Model,
  dmmf: DMMF.Datamodel,
  forRelations = false,
): string {
  const enumImports = new Set<string>();
  const modelImports = new Set<string>();
  let hasRequired = false;
  let hasOptional = false;
  let hasDecimal = false;

  for (const field of model.fields) {
    // For main class: process scalar and enum fields
    if (!forRelations && (field.kind === 'scalar' || field.kind === 'enum')) {
      if (field.kind === 'enum') {
        enumImports.add(field.type);
      }

      if (field.type === 'Decimal') {
        hasDecimal = true;
      }

      if (field.isRequired) {
        hasRequired = true;
      } else {
        hasOptional = true;
      }
    }

    // For relations class: process object fields
    if (forRelations && field.kind === 'object') {
      modelImports.add(field.type);

      if (field.isRequired) {
        hasRequired = true;
      } else {
        hasOptional = true;
      }
    }
  }

  let result = '';

  // Import Decimal from decimal.js if needed
  if (hasDecimal) {
    result += `import { Decimal } from 'decimal.js';\n`;
  }
  // Import enums from src/generated/prisma/enums.ts
  if (enumImports.size > 0) {
    result += `import { ${Array.from(enumImports).join(', ')} } from '../../generated/prisma/enums.js';\n`;
  }

  // Import Swagger decorators - only the ones we need
  const decorators = [];
  if (hasRequired) decorators.push('ApiProperty');
  if (hasOptional) decorators.push('ApiPropertyOptional');

  if (decorators.length > 0) {
    result += `import { ${decorators.join(', ')} } from '@nestjs/swagger';\n`;
  }

  // Import related models for relations
  if (forRelations && modelImports.size > 0) {
    for (const modelName of Array.from(modelImports)) {
      result += `import { ${modelName} } from './${toSnakeCase(modelName)}.js';\n`;
    }
  }

  return result;
}

function generateProperty(field: DMMF.Field): string {
  // Field is optional in TypeScript if it's nullable (not required)
  const isFieldOptional = !field.isRequired;

  // Use @ApiProperty for required fields, @ApiPropertyOptional for optional fields
  const useApiProperty = field.isRequired;

  const isEnum = field.kind === 'enum';
  const isList = field.isList;

  let property = '\n';

  // Add decorator
  if (useApiProperty) {
    if (isEnum) {
      property += `  @ApiProperty({ enum: ${field.type}, enumName: '${field.type}'${isList ? ', isArray: true' : ''} })\n`;
    } else if (isList) {
      property += `  @ApiProperty({ type: [${mapPrismaTypeToTS(field.type, true)}] })\n`;
    } else {
      property += `  @ApiProperty({ type: ${mapPrismaTypeToTS(field.type, true)} })\n`;
    }
  } else {
    if (isEnum) {
      property += `  @ApiPropertyOptional({ enum: ${field.type}, enumName: '${field.type}'${isList ? ', isArray: true' : ''} })\n`;
    } else if (isList) {
      property += `  @ApiPropertyOptional({ type: [${mapPrismaTypeToTS(field.type, true)}] })\n`;
    } else {
      property += `  @ApiPropertyOptional({ type: ${mapPrismaTypeToTS(field.type, true)} })\n`;
    }
  }

  // Add property declaration
  const tsType = mapPrismaTypeToTS(field.type, false);
  const arrayType = isList ? '[]' : '';
  const nullableType = isFieldOptional ? ` | null` : '';
  const defaultValue = hasUserDefault(field) ? formatDefaultValue(field) : '';

  property += `  ${field.name}: ${tsType}${arrayType}${nullableType}${defaultValue};\n`;

  return property;
}

function generateRelationProperty(field: DMMF.Field): string {
  const isRequired = field.isRequired;
  const isList = field.isList;

  let property = '\n';

  // Add decorator
  if (isRequired) {
    if (isList) {
      property += `  @ApiProperty({ isArray: true, type: () => ${field.type} })\n`;
    } else {
      property += `  @ApiProperty({ type: () => ${field.type} })\n`;
    }
  } else {
    if (isList) {
      property += `  @ApiPropertyOptional({ isArray: true, type: () => ${field.type} })\n`;
    } else {
      property += `  @ApiPropertyOptional({ type: () => ${field.type} })\n`;
    }
  }

  // Add property declaration
  let tsType = isList ? `${field.type}[]` : field.type;

  // Add null union type for optional non-list relations
  if (!isRequired && !isList) {
    tsType = `${tsType} | null`;
  }

  property += `  ${field.name}: ${tsType};\n`;

  return property;
}

function hasAutoGeneratedDefault(field: DMMF.Field): boolean {
  if (!field.hasDefaultValue || !field.default) return false;

  if (typeof field.default === 'object' && 'name' in field.default) {
    return (
      field.default.name === 'autoincrement' ||
      field.default.name === 'now' ||
      field.default.name === 'uuid' ||
      field.default.name === 'cuid' ||
      field.default.name === 'nanoid'
    );
  }

  return false;
}

function hasUserDefault(field: DMMF.Field): boolean {
  if (!field.hasDefaultValue) return false;

  // Exclude auto-generated defaults
  if (hasAutoGeneratedDefault(field)) return false;

  return true;
}

function mapPrismaTypeToTS(prismaType: string, forDecorator: boolean): string {
  const mapping: Record<string, { decorator: string; type: string }> = {
    String: { decorator: 'String', type: 'string' },
    Int: { decorator: 'Number', type: 'number' },
    Float: { decorator: 'Number', type: 'number' },
    Boolean: { decorator: 'Boolean', type: 'boolean' },
    DateTime: { decorator: 'Date', type: 'Date' },
    Json: { decorator: 'Object', type: 'any' },
    Bytes: { decorator: 'String', type: 'Buffer' },
  };

  const mapped = mapping[prismaType];
  if (mapped) {
    return forDecorator ? mapped.decorator : mapped.type;
  }

  // For enums, return the enum name itself
  return prismaType;
}

function formatDefaultValue(field: DMMF.Field): string {
  if (!field.hasDefaultValue || field.default === undefined) {
    return '';
  }

  const defaultVal = field.default;

  // Handle different default value types
  if (typeof defaultVal === 'object' && 'name' in defaultVal) {
    // Enum default
    return ` = ${field.type}.${defaultVal.name}`;
  }

  if (field.kind === 'enum') {
    return ` = ${field.type}.${defaultVal}`;
  }

  if (field.type === 'Decimal') {
    // Decimal defaults need to be wrapped in new Decimal()
    if (typeof defaultVal === 'number') {
      return ` = new Decimal(${defaultVal})`;
    }
    return '';
  }

  if (typeof defaultVal === 'string') {
    return ` = '${defaultVal}'`;
  }

  if (typeof defaultVal === 'number' || typeof defaultVal === 'boolean') {
    return ` = ${defaultVal}`;
  }

  return '';
}

function generateIndexFile(modelNames: string[]): string {
  let content = '';

  // Import relations
  for (const name of modelNames) {
    const fileName = toSnakeCase(name);
    content += `import { ${name}Relations as _${name}Relations } from './${fileName}_relations.js';\n`;
  }

  // Import models
  for (const name of modelNames) {
    const fileName = toSnakeCase(name);
    content += `import { ${name} as _${name} } from './${fileName}.js';\n`;
  }

  content += '\nexport namespace PrismaModel {\n';

  // Export relation classes
  for (const name of modelNames) {
    content += `  export class ${name}Relations extends _${name}Relations {}\n`;
  }

  // Export model classes
  for (const name of modelNames) {
    content += `  export class ${name} extends _${name} {}\n`;
  }

  content += '\n  export const extraModels = [\n';

  // Add all classes to extraModels array
  for (const name of modelNames) {
    content += `    ${name}Relations,\n`;
  }
  for (const name of modelNames) {
    content += `    ${name},\n`;
  }

  content += '  ];\n';
  content += '}\n';

  return content;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}
