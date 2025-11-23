#!/usr/bin/env node

/**
 * Offline Solidity Compiler
 * 
 * Compiles Solidity contracts without requiring network access by using the solc-js compiler.
 * Crawls contract sources, resolves imports, and writes ABI/bytecode artifacts.
 * 
 * Usage: node scripts/compile-offline.js
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Configuration
const CONTRACTS_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(CONTRACTS_DIR, 'artifacts-offline');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Find all Solidity files
function findSolidityFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, artifacts, and cache directories
      if (item !== 'node_modules' && item !== 'artifacts' && item !== 'artifacts-offline' && item !== 'cache') {
        files.push(...findSolidityFiles(fullPath));
      }
    } else if (item.endsWith('.sol')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Read file contents for solc
function getFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return '';
  }
}

// Resolve imports for a contract
function findImports(importPath) {
  // Handle OpenZeppelin imports
  if (importPath.startsWith('@openzeppelin/')) {
    try {
      // Try to resolve from node_modules
      const resolvedPath = require.resolve(importPath);
      return {
        contents: fs.readFileSync(resolvedPath, 'utf8')
      };
    } catch (error) {
      console.error(`Could not resolve import: ${importPath}`);
      return { error: `Could not resolve import: ${importPath}` };
    }
  }
  
  // Handle relative imports
  try {
    const resolvedPath = path.resolve(CONTRACTS_DIR, importPath);
    return {
      contents: fs.readFileSync(resolvedPath, 'utf8')
    };
  } catch (error) {
    console.error(`Could not resolve import: ${importPath}`);
    return { error: `Could not resolve import: ${importPath}` };
  }
}

// Compile a single contract
function compileContract(filePath) {
  const source = getFileContent(filePath);
  if (!source) return null;
  
  const fileName = path.basename(filePath);
  
  const input = {
    language: 'Solidity',
    sources: {
      [fileName]: {
        content: source
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  };
  
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  
  return output;
}

// Write artifacts to files
function writeArtifacts(contractName, contractData) {
  const artifactDir = path.join(OUTPUT_DIR, contractName);
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }
  
  // Write ABI
  const abiPath = path.join(artifactDir, `${contractName}.abi.json`);
  fs.writeFileSync(abiPath, JSON.stringify(contractData.abi, null, 2));
  
  // Write bytecode
  const bytecodePath = path.join(artifactDir, `${contractName}.bytecode.json`);
  fs.writeFileSync(bytecodePath, JSON.stringify({
    bytecode: contractData.evm.bytecode.object,
    deployedBytecode: contractData.evm.deployedBytecode.object
  }, null, 2));
  
  console.log(`✅ Generated artifacts for ${contractName}`);
}

// Main compilation function
async function compileAllContracts() {
  console.log('🔍 Finding Solidity contracts...');
  const solidityFiles = findSolidityFiles(CONTRACTS_DIR);
  
  if (solidityFiles.length === 0) {
    console.log('❌ No Solidity files found');
    return;
  }
  
  console.log(`📁 Found ${solidityFiles.length} Solidity files`);
  
  let compiledCount = 0;
  
  for (const filePath of solidityFiles) {
    const fileName = path.basename(filePath);
    console.log(`\n⚙️  Compiling ${fileName}...`);
    
    try {
      const output = compileContract(filePath);
      
      if (!output) {
        console.log(`❌ Failed to compile ${fileName}`);
        continue;
      }
      
      // Check for errors
      if (output.errors) {
        for (const error of output.errors) {
          if (error.severity === 'error') {
            console.log(`❌ Compilation error in ${fileName}: ${error.formattedMessage}`);
            continue;
          } else if (error.severity === 'warning') {
            console.log(`⚠️  Warning in ${fileName}: ${error.formattedMessage}`);
          }
        }
      }
      
      // Process contracts
      if (output.contracts && output.contracts[fileName]) {
        for (const [contractName, contractData] of Object.entries(output.contracts[fileName])) {
          writeArtifacts(contractName, contractData);
          compiledCount++;
        }
      }
    } catch (error) {
      console.log(`❌ Error compiling ${fileName}: ${error.message}`);
    }
  }
  
  console.log(`\n🎉 Compilation complete! Generated artifacts for ${compiledCount} contracts`);
  console.log(`📁 Artifacts saved to: ${OUTPUT_DIR}`);
}

// Run the compilation
console.log('🚀 Starting offline Solidity compilation...');
compileAllContracts().catch(error => {
  console.error('❌ Compilation failed:', error);
  process.exit(1);
});